-- Permite que operadores vejam os médicos (user_roles) para poder encaminhar pacientes
-- Apenas visualização, sem modificação

-- Policy para permitir que usuários autenticados vejam todas as roles
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view all roles"
ON public.user_roles FOR SELECT
USING (true);

-- Policy para permitir que usuários autenticados vejam todos os perfis
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view all profiles"
ON public.profiles FOR SELECT
USING (true);
