-- Restaura o acesso público (RLS) necessário para pacientes concluírem a anamnese.
--
-- As políticas "Anyone can read/update anamnese responses" definidas em
-- 20260526000000_enforce_role_based_rls.sql pararam de valer em produção
-- (o banco real divergiu do que as migrações descrevem). Isso fazia o UPDATE
-- final de handleSubmit em AnamnesePaciente.tsx ser silenciosamente filtrado
-- pelo RLS: o Supabase retorna 200 OK com 0 linhas afetadas (não um erro),
-- então a resposta nunca vira "completed" mesmo com o paciente preenchendo
-- tudo corretamente.
--
-- Recriamos as políticas de forma idempotente para garantir o estado correto.

DROP POLICY IF EXISTS "Anyone can read anamnese responses" ON public.anamnese_responses;
CREATE POLICY "Anyone can read anamnese responses"
  ON public.anamnese_responses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Anyone can update anamnese responses" ON public.anamnese_responses;
CREATE POLICY "Anyone can update anamnese responses"
  ON public.anamnese_responses FOR UPDATE USING (true);
