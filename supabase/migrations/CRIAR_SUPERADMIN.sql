-- Criar usuário superadmin e atribuir o role
-- IMPORTANTE: Este SQL deve ser executado no Supabase Dashboard (SQL Editor)

-- OPÇÃO 1: Se o usuário JÁ EXISTE, apenas adicione o role superadmin
INSERT INTO user_roles (user_id, role)
SELECT id, 'superadmin'::app_role
FROM auth.users
WHERE email = 'superadmin@flowqueue.com'
ON CONFLICT (user_id, role) DO NOTHING;

-- OPÇÃO 2: Se o usuário NÃO EXISTE, você tem duas alternativas:

-- Alternativa A: Criar via Interface do Supabase
-- 1. Vá em Authentication > Users no dashboard do Supabase
-- 2. Clique em "Add user" > "Create new user"
-- 3. Email: superadmin@flowqueue.com
-- 4. Senha: [defina uma senha forte]
-- 5. Depois execute o INSERT acima para adicionar o role

-- Alternativa B: Usar a Edge Function admin-create-user
-- Você pode usar a interface de Gerenciar Usuários do sistema
-- ou chamar a função diretamente

-- Após criar o usuário, execute:
-- INSERT INTO user_roles (user_id, role)
-- SELECT id, 'superadmin'::app_role
-- FROM auth.users
-- WHERE email = 'superadmin@flowqueue.com'
-- ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar se o superadmin foi criado corretamente:
SELECT 
  au.email,
  ur.role,
  p.full_name
FROM auth.users au
LEFT JOIN user_roles ur ON au.id = ur.user_id
LEFT JOIN profiles p ON au.id = p.id
WHERE au.email = 'superadmin@flowqueue.com';
