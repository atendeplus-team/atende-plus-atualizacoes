-- Update the handle_new_user function to include company field
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, company)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'company'
  );
  RETURN new;
END;
$function$;