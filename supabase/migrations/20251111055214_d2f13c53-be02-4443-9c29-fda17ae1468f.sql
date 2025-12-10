-- Criar bucket para slides de propagandas
INSERT INTO storage.buckets (id, name, public)
VALUES ('propaganda-slides', 'propaganda-slides', true);

-- Criar tabela para gerenciar slides
CREATE TABLE IF NOT EXISTS public.propaganda_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.propaganda_slides ENABLE ROW LEVEL SECURITY;

-- Policy: Todos podem visualizar slides ativos
CREATE POLICY "Slides ativos são públicos"
ON public.propaganda_slides
FOR SELECT
USING (is_active = true);

-- Policy: Admins podem inserir slides
CREATE POLICY "Admins podem inserir slides"
ON public.propaganda_slides
FOR INSERT
WITH CHECK (is_admin(auth.uid()));

-- Policy: Admins podem atualizar slides
CREATE POLICY "Admins podem atualizar slides"
ON public.propaganda_slides
FOR UPDATE
USING (is_admin(auth.uid()));

-- Policy: Admins podem deletar slides
CREATE POLICY "Admins podem deletar slides"
ON public.propaganda_slides
FOR DELETE
USING (is_admin(auth.uid()));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_propaganda_slides_updated_at
BEFORE UPDATE ON public.propaganda_slides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Políticas de storage para o bucket
CREATE POLICY "Slides são públicos"
ON storage.objects
FOR SELECT
USING (bucket_id = 'propaganda-slides');

CREATE POLICY "Admins podem fazer upload de slides"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'propaganda-slides' 
  AND is_admin(auth.uid())
);

CREATE POLICY "Admins podem deletar slides"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'propaganda-slides' 
  AND is_admin(auth.uid())
);