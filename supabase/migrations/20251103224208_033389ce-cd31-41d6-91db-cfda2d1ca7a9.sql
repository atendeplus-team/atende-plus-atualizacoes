-- Fix function search path security issue
DROP TRIGGER IF EXISTS update_queues_updated_at ON public.queues;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_queues_updated_at
BEFORE UPDATE ON public.queues
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();