-- Add specialty_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS specialty_id UUID REFERENCES public.medical_specialties(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_profiles_specialty_id ON public.profiles(specialty_id);

-- Add comment
COMMENT ON COLUMN public.profiles.specialty_id IS 'Foreign key to medical specialty for doctor users';
