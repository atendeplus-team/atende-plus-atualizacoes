-- Script para adicionar perfil e role admin a um usuário existente no auth.users
-- Substitua 'SEU_EMAIL@AQUI.COM' pelo email do usuário que você criou

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'admin@atendeplus.com'; -- ALTERE AQUI PARA O EMAIL DO SEU USUÁRIO
BEGIN
  -- Buscar o user_id do auth.users pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário com email % não encontrado no auth.users', v_email;
  END IF;

  -- Inserir ou atualizar o profile
  INSERT INTO profiles (id, email, full_name, company, specialty_id, created_at, updated_at)
  VALUES (
    v_user_id,
    v_email,
    'Administrador', -- Nome completo
    '',              -- Company (vazio para admin)
    NULL,            -- Specialty (NULL para admin)
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

  -- Inserir a role de admin
  INSERT INTO user_roles (user_id, role, created_by, created_at)
  VALUES (
    v_user_id,
    'admin',
    v_user_id, -- O próprio admin é quem criou a role
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE 'Perfil e role admin adicionados com sucesso para o usuário: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
END $$;

-- Verificar se foi criado corretamente
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email = 'admin@atendeplus.com'; -- ALTERE AQUI TAMBÉM
