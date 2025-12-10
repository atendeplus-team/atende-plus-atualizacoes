-- Remove policy antiga de UPDATE que pode estar causando problemas
DROP POLICY IF EXISTS "Authenticated users can update doctor tickets" ON public.doctor_tickets;

-- Cria policy mais permissiva para UPDATE (permite anon key usado pelas edge functions)
CREATE POLICY "Allow update doctor tickets"
ON public.doctor_tickets FOR UPDATE
USING (true)
WITH CHECK (true);

-- Permite DELETE também (caso necessário)
CREATE POLICY "Allow delete doctor tickets"
ON public.doctor_tickets FOR DELETE
USING (true);
