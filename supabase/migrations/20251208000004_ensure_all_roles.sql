-- Verificar TODOS os usuários e suas roles
SELECT 
  p.id,
  p.email,
  p.full_name,
  STRING_AGG(ur.role::text, ', ') as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.full_name
ORDER BY p.email;

-- Garantir que o admin tenha a role admin
INSERT INTO user_roles (user_id, role)
VALUES ('023562a9-b6f8-405b-9b44-3fc8f126e01a', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir que o médico tenha a role doctor
INSERT INTO user_roles (user_id, role)
VALUES ('630ed337-3056-4e40-b5f4-b42441a4081a', 'doctor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir que o toten tenha a role visitor
INSERT INTO user_roles (user_id, role)
VALUES ('64f55c3e-6789-46da-b2c8-f5e65c0a2447', 'visitor')
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir que o atendente tenha a role operator
INSERT INTO user_roles (user_id, role)
VALUES ('f77589d2-a5da-4172-9f41-436f935fc702', 'operator')
ON CONFLICT (user_id, role) DO NOTHING;

-- Verificar novamente após inserção
SELECT 
  p.id,
  p.email,
  p.full_name,
  STRING_AGG(ur.role::text, ', ') as roles
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
GROUP BY p.id, p.email, p.full_name
ORDER BY p.email;
