-- Criar enum para tipos de ação nos logs
CREATE TYPE public.ticket_action AS ENUM ('called', 'served', 'cancelled');

-- Criar tabela de logs para auditoria completa
CREATE TABLE public.ticket_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  action ticket_action NOT NULL,
  operator_name varchar,
  counter varchar,
  duration_seconds integer,
  company varchar,
  queue_code varchar,
  priority varchar,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Índices para melhorar performance de queries
CREATE INDEX idx_ticket_logs_ticket_id ON public.ticket_logs(ticket_id);
CREATE INDEX idx_ticket_logs_created_at ON public.ticket_logs(created_at);
CREATE INDEX idx_ticket_logs_company ON public.ticket_logs(company);
CREATE INDEX idx_ticket_logs_action ON public.ticket_logs(action);

-- Habilitar RLS
ALTER TABLE public.ticket_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS: usuários autenticados podem ler todos os logs da sua empresa
CREATE POLICY "Users can view logs from their company"
ON public.ticket_logs
FOR SELECT
TO authenticated
USING (
  company IN (
    SELECT company FROM public.profiles WHERE id = auth.uid()
  )
);

-- Políticas de RLS: qualquer um pode inserir logs (sistema automatizado)
CREATE POLICY "Anyone can insert logs"
ON public.ticket_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Função para calcular estatísticas diárias
CREATE OR REPLACE FUNCTION public.get_daily_stats(
  filter_date date DEFAULT CURRENT_DATE,
  filter_company varchar DEFAULT NULL
)
RETURNS TABLE (
  total_tickets bigint,
  total_served bigint,
  avg_wait_time_seconds numeric,
  avg_service_time_seconds numeric,
  peak_hour integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH ticket_times AS (
    SELECT 
      t.id,
      EXTRACT(EPOCH FROM (t.called_at - t.created_at)) as wait_seconds,
      EXTRACT(EPOCH FROM (t.served_at - t.called_at)) as service_seconds,
      EXTRACT(HOUR FROM t.called_at) as call_hour
    FROM tickets t
    WHERE DATE(t.created_at) = filter_date
      AND (filter_company IS NULL OR t.queue_id IN (
        SELECT id FROM queues WHERE name LIKE '%' || filter_company || '%'
      ))
  )
  SELECT 
    COUNT(*)::bigint as total_tickets,
    COUNT(service_seconds)::bigint as total_served,
    AVG(wait_seconds)::numeric as avg_wait_time_seconds,
    AVG(service_seconds)::numeric as avg_service_time_seconds,
    MODE() WITHIN GROUP (ORDER BY call_hour)::integer as peak_hour
  FROM ticket_times;
END;
$$;