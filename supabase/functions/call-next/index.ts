// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Cache leve para reduzir consultas repetidas em alta frequência
let countCache = { ts: 0, normalsAfterLastPref: 0 };

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

type Ticket = {
  id: string;
  display_number: string;
  priority: string;
  queue_id: string | null;
  created_at: string;
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { operator_name, counter } = await req.json().catch(() => ({}));

    console.log('[call-next] Recebido:', { operator_name, counter });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1) Buscar estado atual e últimos atendidos do dia (apenas tickets)
    const nowDate = new Date();
    const startOfDay = new Date(
      Date.UTC(
        nowDate.getUTCFullYear(),
        nowDate.getUTCMonth(),
        nowDate.getUTCDate(),
        0,
        0,
        0
      )
    );
    const startOfDayISO = startOfDay.toISOString();

    const { data: current } = await supabase
      .from('tickets')
      .select('id, display_number, priority, queue_id, called_at')
      .eq('in_service', true)
      .is('finished_at', null)
      .order('called_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // Cache TTL 1000ms para contagem de normais consecutivos
    let normalsSinceLastPrefFinished: number;
    if (Date.now() - countCache.ts < 1000) {
      normalsSinceLastPrefFinished = countCache.normalsAfterLastPref;
    } else {
      // Último preferencial finalizado hoje
      const { data: lastPref } = await supabase
        .from('tickets')
        .select('finished_at')
        .not('finished_at', 'is', null)
        .gte('finished_at', startOfDayISO)
        .neq('priority', 'normal')
        .order('finished_at', { ascending: false })
        .limit(1);
      const baseTime =
        lastPref && lastPref.length ? lastPref[0].finished_at : startOfDayISO;
      // Conta normais finalizados após último preferencial
      const { count: normalsCount } = await supabase
        .from('tickets')
        .select('id', { count: 'exact', head: true })
        .not('finished_at', 'is', null)
        .gt('finished_at', baseTime)
        .eq('priority', 'normal');
      normalsSinceLastPrefFinished = normalsCount || 0;
      countCache = {
        ts: Date.now(),
        normalsAfterLastPref: normalsSinceLastPrefFinished,
      };
    }

    // Se já existe um ticket em atendimento, não avançar a fila;
    // apenas retornar o ticket atual para evitar quebrar a sequência.
    if (current) {
      return new Response(
        JSON.stringify({
          success: true,
          next: current,
          message:
            'Já existe ticket em atendimento. Finalize antes de chamar o próximo.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const currentIsNormal = current ? current.priority === 'normal' : false;
    const futureNormals =
      normalsSinceLastPrefFinished + (currentIsNormal ? 1 : 0);
    const nextType: 'normal' | 'preferencial' =
      futureNormals >= 2 ? 'preferencial' : 'normal';

    // 3) Buscar próximas senhas aguardando por tipo (apenas criadas hoje)
    const [{ data: normals }, { data: prefs }] = (await Promise.all([
      supabase
        .from('tickets')
        .select('id, display_number, priority, queue_id, created_at')
        .is('finished_at', null)
        .eq('in_service', false)
        .eq('priority', 'normal')
        .gte('created_at', startOfDayISO)
        .order('created_at', { ascending: true })
        .limit(10),
      supabase
        .from('tickets')
        .select('id, display_number, priority, queue_id, created_at')
        .is('finished_at', null)
        .eq('in_service', false)
        .neq('priority', 'normal')
        .gte('created_at', startOfDayISO)
        .order('created_at', { ascending: true })
        .limit(10),
    ])) as any;

    const pick = (
      nextType === 'normal' ? (normals || [])[0] : (prefs || [])[0]
    ) as Ticket | undefined;

    // fallback quando não há do tipo esperado
    let next: Ticket | undefined = pick;
    if (!next) {
      const alt = nextType === 'normal' ? (prefs || [])[0] : (normals || [])[0];
      next = alt as Ticket | undefined;
    }

    if (!next) {
      return new Response(
        JSON.stringify({
          success: true,
          next: null,
          message: 'No waiting tickets',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    const now = new Date().toISOString();

    // 4) Marcar ticket como chamado e logar
    // Se counter estiver vazio, usar o nome do operador ou "Atendimento"
    const counterValue = counter || operator_name || 'Atendimento';

    console.log('[call-next] Atualizando ticket com:', {
      counter: counterValue,
      operator_name,
      ticket_id: next.id,
    });

    const { error: upErr } = await supabase
      .from('tickets')
      .update({
        status: 'called',
        called_at: now,
        in_service: true,
        operator_name,
        counter: counterValue,
      })
      .eq('id', next.id);

    if (upErr) throw upErr;

    // Sem ticket_logs: apenas retornamos o ticket selecionado

    return new Response(JSON.stringify({ success: true, next }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ success: false, error: msg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
