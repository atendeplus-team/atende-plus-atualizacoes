-- Criar tabela de configurações da empresa
CREATE TABLE IF NOT EXISTS public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL DEFAULT 'Atende+',
  logo_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Todos podem visualizar configurações"
  ON public.company_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins podem inserir configurações"
  ON public.company_settings
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins podem atualizar configurações"
  ON public.company_settings
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- Inserir configuração padrão
INSERT INTO public.company_settings (company_name, logo_url)
VALUES ('Atende+', NULL)
ON CONFLICT DO NOTHING;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();