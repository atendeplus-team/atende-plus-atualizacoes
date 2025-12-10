-- Amplia RBAC: adiciona o perfil 'doctor' ao enum app_role se ainda não existir
-- supabase/migrations/20251116_add_doctor_role.sql
DO $$
BEGIN
  -- adiciona o valor 'doctor' ao enum app_role se ainda não existir
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'doctor'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'doctor';
  END IF;
END
$$;