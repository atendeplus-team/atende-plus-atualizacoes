-- Remover política SELECT existente
DROP POLICY IF EXISTS "Anyone can view active queues" ON public.queues;

-- Criar novas políticas para usuários autenticados gerenciarem queues
CREATE POLICY "Authenticated users can view all queues"
ON public.queues
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert queues"
ON public.queues
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update queues"
ON public.queues
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete queues"
ON public.queues
FOR DELETE
TO authenticated
USING (true);

-- Manter acesso público apenas para queues ativas (para o kiosk)
CREATE POLICY "Public can view active queues"
ON public.queues
FOR SELECT
TO anon
USING (is_active = true);