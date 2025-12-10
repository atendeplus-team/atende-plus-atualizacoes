-- Create medical specialties table
CREATE TABLE public.medical_specialties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.medical_specialties ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can view active specialties
CREATE POLICY "Users can view active specialties"
ON public.medical_specialties FOR SELECT
TO authenticated
USING (active = true);

-- Policy: Only admins can insert specialties
CREATE POLICY "Admins can insert specialties"
ON public.medical_specialties FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Only admins can update specialties
CREATE POLICY "Admins can update specialties"
ON public.medical_specialties FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Only admins can delete specialties
CREATE POLICY "Admins can delete specialties"
ON public.medical_specialties FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Insert some common medical specialties
INSERT INTO public.medical_specialties (name) VALUES
  ('Cardiologia'),
  ('Dermatologia'),
  ('Endocrinologia'),
  ('Gastroenterologia'),
  ('Ginecologia'),
  ('Neurologia'),
  ('Oftalmologia'),
  ('Ortopedia'),
  ('Otorrinolaringologia'),
  ('Pediatria'),
  ('Pneumologia'),
  ('Psiquiatria'),
  ('Urologia'),
  ('Clínica Geral');

-- Add comment
COMMENT ON TABLE public.medical_specialties IS 'Medical specialties for doctor profiles';
