-- CUIDADO: Este script remove TODOS os usuários do sistema
-- Use apenas em desenvolvimento ou se tiver certeza do que está fazendo

-- 1. Delete all user_roles
DELETE FROM user_roles;

-- 2. Delete all profiles
DELETE FROM profiles;

-- 3. Delete all users from auth.users (requires service_role privileges)
-- This will cascade delete related auth data
DO $$
DECLARE
  user_record RECORD;
BEGIN
  FOR user_record IN SELECT id FROM auth.users LOOP
    PERFORM auth.admin_delete_user(user_record.id);
  END LOOP;
END $$;

-- Verify everything was deleted
SELECT COUNT(*) as remaining_user_roles FROM user_roles;
SELECT COUNT(*) as remaining_profiles FROM profiles;
SELECT COUNT(*) as remaining_auth_users FROM auth.users;

-- Show confirmation message
DO $$
BEGIN
  RAISE NOTICE 'Database reset completed. All users, profiles, and roles have been deleted.';
END $$;
