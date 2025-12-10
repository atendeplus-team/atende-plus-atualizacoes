-- Criar bucket para logos de empresa (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'company-logos',
  'company-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir leitura pública
CREATE POLICY "Public Access to Company Logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-logos');

-- Política para permitir upload sem autenticação (público)
CREATE POLICY "Public Upload to Company Logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-logos');

-- Política para permitir atualização sem autenticação (público)
CREATE POLICY "Public Update to Company Logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-logos')
WITH CHECK (bucket_id = 'company-logos');

-- Política para permitir deleção sem autenticação (público)
CREATE POLICY "Public Delete from Company Logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-logos');
