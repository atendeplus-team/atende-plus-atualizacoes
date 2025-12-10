// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders, status: 200 });
  }

  try {
    const { printer_ip, printer_port, data } = await req.json();

    if (!printer_ip) {
      throw new Error('printer_ip is required');
    }

    if (!data || !Array.isArray(data)) {
      throw new Error('data array is required');
    }

    const port = printer_port || 9100;
    const bytes = new Uint8Array(data);

    console.log(`[print-ticket] Connecting to ${printer_ip}:${port}`);
    console.log(`[print-ticket] Sending ${bytes.length} bytes`);

    // Conecta à impressora via TCP
    const conn = await Deno.connect({
      hostname: printer_ip,
      port: port,
    });

    try {
      // Envia dados ESC/POS
      const written = await conn.write(bytes);
      console.log(`[print-ticket] Written ${written} bytes`);

      // Força o flush dos dados
      await conn.writable.getWriter().releaseLock();
      
      // Aguarda para garantir que os dados foram enviados
      await new Promise((resolve) => setTimeout(resolve, 500));
    } finally {
      // Fecha conexão
      try {
        conn.close();
      } catch (e) {
        console.error('[print-ticket] Error closing connection:', e);
      }
    }

    console.log('[print-ticket] Print job completed successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'Impressão enviada com sucesso' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[print-ticket] Error:', msg);
    console.error('[print-ticket] Stack:', e instanceof Error ? e.stack : '');
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
