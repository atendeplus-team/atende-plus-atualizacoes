-- Tabela para senhas encaminhadas aos médicos
CREATE TABLE IF NOT EXISTS public.doctor_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id),
  display_number TEXT NOT NULL,
  patient_name TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  called_at TIMESTAMP WITH TIME ZONE,
  served_at TIMESTAMP WITH TIME ZONE,
  finished_at TIMESTAMP WITH TIME ZONE,
  in_service BOOLEAN DEFAULT false,
  operator_name TEXT,
  doctor_name TEXT,
  counter TEXT,
  queue_code TEXT
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_doctor_tickets_status ON public.doctor_tickets(status);
CREATE INDEX IF NOT EXISTS idx_doctor_tickets_priority ON public.doctor_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_doctor_tickets_finished_priority 
  ON public.doctor_tickets(finished_at DESC, priority) 
  WHERE finished_at IS NULL;

-- RLS policies
ALTER TABLE public.doctor_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view doctor tickets"
ON public.doctor_tickets FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can insert doctor tickets"
ON public.doctor_tickets FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update doctor tickets"
ON public.doctor_tickets FOR UPDATE
USING (auth.uid() IS NOT NULL);
