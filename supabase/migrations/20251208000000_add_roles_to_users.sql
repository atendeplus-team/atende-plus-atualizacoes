-- Adicionar roles para os usuários criados manualmente
-- Este script adiciona as permissões corretas na tabela user_roles

DO $$
BEGIN
  -- Admin
  INSERT INTO user_roles (user_id, role)
  VALUES ('023562a9-b6f8-405b-9b44-3fc8f126e01a', 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Médico
  INSERT INTO user_roles (user_id, role)
  VALUES ('630ed337-3056-4e40-b5f4-b42441a4081a', 'doctor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Toten (visitante/kiosk)
  INSERT INTO user_roles (user_id, role)
  VALUES ('64f55c3e-6789-46da-b2c8-f5e65c0a2447', 'visitor')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Atendente (operador)
  INSERT INTO user_roles (user_id, role)
  VALUES ('f77589d2-a5da-4172-9f41-436f935fc702', 'operator')
  ON CONFLICT (user_id, role) DO NOTHING;

  RAISE NOTICE 'Roles adicionadas com sucesso!';
END $$;

-- Verificar as roles criadas
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.id IN (
  '023562a9-b6f8-405b-9b44-3fc8f126e01a',
  '630ed337-3056-4e40-b5f4-b42441a4081a',
  '64f55c3e-6789-46da-b2c8-f5e65c0a2447',
  'f77589d2-a5da-4172-9f41-436f935fc702'
)
ORDER BY p.email;
