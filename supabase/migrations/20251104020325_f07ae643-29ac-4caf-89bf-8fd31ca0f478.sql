-- RBAC base: enum de perfis e tabela user_roles com RLS e funções utilitárias
-- Perfis iniciais suportados: admin, operator, visitor
CREATE TYPE public.app_role AS ENUM ('admin', 'operator', 'visitor');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin')
$$;

-- Create function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Políticas RLS para user_roles: visualização própria e operações restritas a admin
-- RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Políticas RLS de queues: admin cria/exclui; admin e operator podem atualizar
-- Update queues RLS policies to restrict admin operations
DROP POLICY IF EXISTS "Authenticated users can insert queues" ON public.queues;
DROP POLICY IF EXISTS "Authenticated users can update queues" ON public.queues;
DROP POLICY IF EXISTS "Authenticated users can delete queues" ON public.queues;

CREATE POLICY "Admins can insert queues"
  ON public.queues
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins and operators can update queues"
  ON public.queues
  FOR UPDATE
  USING (
    public.is_admin(auth.uid()) OR 
    public.has_role(auth.uid(), 'operator')
  );

CREATE POLICY "Admins can delete queues"
  ON public.queues
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Políticas RLS de tickets: apenas admin e operadores podem atualizar
-- Update tickets RLS policies
DROP POLICY IF EXISTS "Anyone can update tickets" ON public.tickets;

CREATE POLICY "Operators and admins can update tickets"
  ON public.tickets
  FOR UPDATE
  USING (
    public.is_admin(auth.uid()) OR 
    public.has_role(auth.uid(), 'operator')
  );

-- Políticas RLS de profiles: admin pode ver e atualizar todos os perfis
-- Update profiles to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.is_admin(auth.uid()));