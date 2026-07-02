-- A policy de DELETE em appointments só permitia role 'admin', ignorando as
-- permissões granulares concedidas via tela "Usuários e Permissões"
-- (user_permissions.can_delete para o módulo 'agenda'). Isso fazia com que
-- secretárias com a permissão de exclusão liberada na UI tivessem o delete
-- rejeitado silenciosamente pelo RLS.

DROP POLICY IF EXISTS "Only admins can delete appointments" ON public.appointments;

CREATE POLICY "Admins and users with agenda delete permission can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.user_permissions
      WHERE user_permissions.user_id = auth.uid()
        AND user_permissions.module = 'agenda'
        AND user_permissions.can_delete = true
    )
  );
