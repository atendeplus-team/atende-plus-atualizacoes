-- Verificar políticas atuais da tabela user_roles
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;

-- Verificar se você é admin
SELECT 
  auth.uid() as my_user_id,
  public.is_admin(auth.uid()) as am_i_admin,
  ur.role
FROM user_roles ur
WHERE ur.user_id = auth.uid();

-- Remover e recriar TODAS as políticas corretamente
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;

-- Recriar políticas SELECT
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Recriar política INSERT
CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

-- Recriar política UPDATE
CREATE POLICY "Admins can update roles"
  ON public.user_roles
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Recriar política DELETE
CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Verificar políticas recriadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename = 'user_roles'
ORDER BY policyname;
