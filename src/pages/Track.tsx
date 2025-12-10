import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Users } from "lucide-react";

interface TicketInfo {
  id: string;
  display_number: string;
  status: string;
  priority: string;
  created_at: string;
  queue_name: string;
  position: number;
  counter?: string;
  operator_name?: string;
}

interface RecentCall {
  display_number: string;
  counter: string;
}

// Acompanhar posição na fila em tempo real por ID de senha
const Track = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ticketId = searchParams.get("id");
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [avgWaitTime, setAvgWaitTime] = useState<number>(5);

  // Inicializa carregamentos e inscrição realtime quando há ticketId
  useEffect(() => {
    if (ticketId) {
      loadTicket();
      loadRecentCalls();
      loadAvgWaitTime();
      setupRealtime();
    }
  }, [ticketId]);

  // Carrega dados da senha, nome da fila e calcula posição considerando prioridade/ordem
  const loadTicket = async () => {
    if (!ticketId) return;

    const { data: ticketData } = await supabase
      .from("tickets")
      .select(`
        id,
        display_number,
        status,
        priority,
        created_at,
        queue_id,
        counter,
        operator_name
      `)
      .eq("id", ticketId)
      .single();

    if (ticketData) {
      const { data: queueData } = await supabase
        .from("queues")
        .select("name")
        .eq("id", ticketData.queue_id)
        .single();

      // Calculate position in queue
      const { data: waitingTickets } = await supabase
        .from("tickets")
        .select("id")
        .eq("status", "waiting")
        .eq("queue_id", ticketData.queue_id)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: true });

      const position = waitingTickets?.findIndex(t => t.id === ticketId) ?? -1;

      setTicket({
        ...ticketData,
        queue_name: queueData?.name || "Atendimento",
        position: ticketData.status === "waiting" ? position + 1 : 0,
      });
    }

    setLoading(false);
  };

  // Últimas senhas servidas com guichê para referência
  const loadRecentCalls = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("display_number, counter")
      .eq("status", "served")
      .not("counter", "is", null)
      .order("served_at", { ascending: false })
      .limit(3);

    if (data) {
      setRecentCalls(data as RecentCall[]);
    }
  };

  // Estima tempo médio entre chamadas de hoje a partir dos logs
  const loadAvgWaitTime = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: logs } = await supabase
      .from("ticket_logs")
      .select("created_at")
      .eq("action", "called")
      .gte("created_at", today.toISOString())
      .order("created_at", { ascending: true });

    if (logs && logs.length > 1) {
      let totalInterval = 0;
      for (let i = 1; i < logs.length; i++) {
        const prev = new Date(logs[i - 1].created_at).getTime();
        const curr = new Date(logs[i].created_at).getTime();
        totalInterval += (curr - prev);
      }
      const avgMinutes = Math.round(totalInterval / (logs.length - 1) / 60000);
      setAvgWaitTime(avgMinutes > 0 ? avgMinutes : 5);
    }
  };

  // Inscreve em mudanças da senha específica para atualizar status/posição
  const setupRealtime = () => {
    if (!ticketId) return;

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tickets",
          filter: `id=eq.${ticketId}`,
        },
        () => {
          loadTicket();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "waiting":
        return "bg-blue-500";
      case "called":
        return "bg-green-500";
      case "served":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "waiting":
        return "Aguardando";
      case "called":
        return "Chamado - Dirija-se ao balcão";
      case "served":
        return "Atendido";
      default:
        return status;
    }
  };

  // Estado de carregamento inicial
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted">
        <p className="text-xl text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="mb-4 text-xl text-foreground">Senha não encontrada</p>
          <Button onClick={() => navigate("/")}>Voltar ao início</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-4">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>

        <Card className="p-8 shadow-large">
          <div className="mb-6 text-center">
            <h1 className="mb-2 text-4xl font-bold text-foreground">
              Acompanhamento de Senha
            </h1>
            <p className="text-muted-foreground">{ticket.queue_name}</p>
          </div>

          <div className="mb-8 rounded-lg bg-gradient-primary p-8 text-center text-white">
            <p className="mb-2 text-xl font-semibold">Sua senha</p>
            <p className="text-7xl font-bold">{ticket.display_number}</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              <div className={`h-3 w-3 rounded-full ${getStatusColor(ticket.status)} animate-pulse`} />
              <p className="text-xl font-semibold text-foreground">
                {getStatusText(ticket.status)}
              </p>
            </div>
          </div>

          {ticket.status === "waiting" && ticket.position > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 rounded-lg bg-muted p-6">
                <Users className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">{ticket.position}</p>
                  <p className="text-sm text-muted-foreground">
                    {ticket.position === 1 ? "pessoa na sua frente" : "pessoas na sua frente"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-center gap-3 rounded-lg bg-muted p-6">
                <Clock className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <p className="text-3xl font-bold text-foreground">
                    ~{ticket.position * avgWaitTime}
                  </p>
                  <p className="text-sm text-muted-foreground">minutos estimados</p>
                </div>
              </div>
            </div>
          )}

          {ticket.status === "called" && ticket.counter && (
            <div className="mb-6">
              <div className="rounded-lg bg-green-500/10 border-2 border-green-500 p-6 text-center animate-pulse">
                <p className="text-2xl font-bold text-green-500 mb-2">
                  Dirija-se ao {ticket.counter}
                </p>
                {ticket.operator_name && (
                  <p className="text-sm text-muted-foreground">
                    Atendente: {ticket.operator_name}
                  </p>
                )}
              </div>
            </div>
          )}

          {recentCalls.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-center font-semibold text-foreground">
                Últimas Chamadas
              </h3>
              <div className="space-y-2">
                {recentCalls.map((call, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3"
                  >
                    <span className="font-semibold text-foreground">{call.display_number}</span>
                    <span className="text-sm text-muted-foreground">{call.counter}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticket.priority !== "normal" && (
            <div className="mt-6 text-center">
              <Badge variant="secondary" className="text-lg">
                Atendimento Preferencial
              </Badge>
            </div>
          )}

          <div className="mt-8 rounded-lg border border-border bg-muted/50 p-4 text-center">
            <p className="text-sm text-muted-foreground">
              Esta página atualiza automaticamente. Mantenha-a aberta para acompanhar sua posição na fila.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Track;
