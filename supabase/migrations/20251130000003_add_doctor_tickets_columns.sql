-- Adiciona colunas in_service e finished_at à tabela doctor_tickets
ALTER TABLE public.doctor_tickets
ADD COLUMN IF NOT EXISTS in_service BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS finished_at TIMESTAMP WITH TIME ZONE;

-- Cria índice para performance (mesmo da tabela tickets)
CREATE INDEX IF NOT EXISTS idx_doctor_tickets_finished_priority 
  ON public.doctor_tickets(finished_at DESC, priority) 
  WHERE finished_at IS NULL;

-- Atualiza senhas antigas: se served_at existe, marca como finalizada
UPDATE public.doctor_tickets
SET finished_at = served_at,
    in_service = false
WHERE served_at IS NOT NULL AND finished_at IS NULL;

-- Atualiza senhas em atendimento (status='called')
UPDATE public.doctor_tickets
SET in_service = true
WHERE status = 'called' AND finished_at IS NULL;
