-- Clean up orphaned user_roles records
-- This removes roles for users that no longer exist in the profiles table

-- First, let's see what will be deleted (optional check)
-- SELECT ur.id, ur.user_id, ur.role, ur.created_at
-- FROM user_roles ur
-- WHERE ur.user_id NOT IN (SELECT id FROM profiles);

-- Delete orphaned user_roles
DELETE FROM user_roles 
WHERE user_id NOT IN (SELECT id FROM profiles);

-- Verify the cleanup
SELECT COUNT(*) as remaining_user_roles FROM user_roles;
SELECT COUNT(*) as total_profiles FROM profiles;

-- Optional: Check if there are any users in auth.users without profiles
-- (This requires admin access to auth schema)
-- SELECT au.id, au.email, au.created_at
-- FROM auth.users au
-- WHERE au.id NOT IN (SELECT id FROM profiles);
