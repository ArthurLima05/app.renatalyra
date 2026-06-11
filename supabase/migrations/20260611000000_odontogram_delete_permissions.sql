-- Permite que admins, secretárias e usuários vinculados a um profissional
-- excluam procedimentos do odontograma (antes restrito apenas a admins).

DROP POLICY IF EXISTS "Only admins can delete odontogram procedures" ON public.odontogram_procedures;

CREATE POLICY "Admins, secretaria and professionals can delete odontogram procedures"
  ON public.odontogram_procedures FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'secretaria')
    OR EXISTS (
      SELECT 1 FROM public.professionals
      WHERE professionals.user_id = auth.uid()
    )
  );
