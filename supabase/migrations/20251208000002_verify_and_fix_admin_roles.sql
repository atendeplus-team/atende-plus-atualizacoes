-- Verificar roles existentes
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email IN (
  'admin@atendeplus.com',
  'medico@atendeplus.com',
  'toten@atendeplus.com',
  'atende@atendeplus.com'
)
ORDER BY p.email;

-- Recriar roles caso estejam faltando
DO $$
BEGIN
  -- Admin
  INSERT INTO user_roles (user_id, role)
  SELECT '023562a9-b6f8-405b-9b44-3fc8f126e01a', 'admin'
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = '023562a9-b6f8-405b-9b44-3fc8f126e01a' AND role = 'admin'
  );

  -- Médico
  INSERT INTO user_roles (user_id, role)
  SELECT '630ed337-3056-4e40-b5f4-b42441a4081a', 'doctor'
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = '630ed337-3056-4e40-b5f4-b42441a4081a' AND role = 'doctor'
  );

  -- Toten
  INSERT INTO user_roles (user_id, role)
  SELECT '64f55c3e-6789-46da-b2c8-f5e65c0a2447', 'visitor'
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = '64f55c3e-6789-46da-b2c8-f5e65c0a2447' AND role = 'visitor'
  );

  -- Atendente
  INSERT INTO user_roles (user_id, role)
  SELECT 'f77589d2-a5da-4172-9f41-436f935fc702', 'operator'
  WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = 'f77589d2-a5da-4172-9f41-436f935fc702' AND role = 'operator'
  );

  RAISE NOTICE 'Roles verificadas e recriadas se necessário!';
END $$;

-- Verificar novamente
SELECT 
  p.id,
  p.email,
  p.full_name,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
WHERE p.email IN (
  'admin@atendeplus.com',
  'medico@atendeplus.com',
  'toten@atendeplus.com',
  'atende@atendeplus.com'
)
ORDER BY p.email;
