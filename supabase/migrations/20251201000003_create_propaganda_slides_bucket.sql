-- Criar bucket para slides de propaganda (público)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'propaganda-slides',
  'propaganda-slides',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Política para permitir leitura pública
CREATE POLICY IF NOT EXISTS "Public Access to Propaganda Slides"
ON storage.objects FOR SELECT
USING (bucket_id = 'propaganda-slides');

-- Política para permitir upload sem autenticação (público)
CREATE POLICY IF NOT EXISTS "Public Upload to Propaganda Slides"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'propaganda-slides');

-- Política para permitir atualização sem autenticação (público)
CREATE POLICY IF NOT EXISTS "Public Update to Propaganda Slides"
ON storage.objects FOR UPDATE
USING (bucket_id = 'propaganda-slides')
WITH CHECK (bucket_id = 'propaganda-slides');

-- Política para permitir deleção sem autenticação (público)
CREATE POLICY IF NOT EXISTS "Public Delete from Propaganda Slides"
ON storage.objects FOR DELETE
USING (bucket_id = 'propaganda-slides');
