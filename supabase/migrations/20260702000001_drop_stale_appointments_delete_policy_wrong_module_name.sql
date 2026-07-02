-- Policy antiga usava module = 'agendamentos', mas o nome real do módulo
-- usado pelo app (Configuracoes.tsx / user_permissions) é 'agenda'.
-- Por isso essa policy nunca teve efeito prático; a policy correta foi
-- criada na migration appointments_delete_respects_granular_permissions.
DROP POLICY IF EXISTS "Admins and authorized users can delete appointments" ON public.appointments;
