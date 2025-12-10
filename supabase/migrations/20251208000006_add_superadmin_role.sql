-- Add superadmin role to app_role enum
-- Superadmin has access to all features and pages in the system

-- IMPORTANTE: No PostgreSQL, adicionar um valor ao enum deve ser feito em uma transação separada
-- das funções que o utilizam. Execute este arquivo em duas etapas ou execute os comandos separadamente.

-- PASSO 1: Adicione o valor ao enum primeiro
-- Execute este comando sozinho e aguarde o commit:
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
