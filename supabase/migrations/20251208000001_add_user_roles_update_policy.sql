-- Adicionar política RLS para permitir admins atualizarem roles
-- Isso corrige o erro 403 ao editar usuários

-- Remove a política se já existir (para evitar erros)
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;

-- Cria a nova política
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Verificar políticas criadas
SELECT schemaname, tablename, policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;
