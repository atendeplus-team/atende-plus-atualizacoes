-- PASSO 2: Crie as funções após o commit do PASSO 1
-- Execute este arquivo APÓS executar e confirmar o arquivo 20251208000006_add_superadmin_role.sql

-- Create function to check if user is superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'superadmin')
$$;

-- Update is_admin function to include superadmin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'superadmin')
$$;

COMMENT ON FUNCTION public.is_superadmin IS 'Check if user has superadmin role - has access to all features';
