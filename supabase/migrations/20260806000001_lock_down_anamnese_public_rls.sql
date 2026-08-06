-- ATENÇÃO: só aplique esta migração DEPOIS que a Edge Function "anamnese-flow"
-- estiver implantada e funcionando. Ela remove todo o acesso público (anon) de
-- leitura/escrita nas tabelas de anamnese, pois a partir de agora o formulário
-- público (AnamnesePaciente.tsx) passa a falar exclusivamente com a Edge
-- Function "anamnese-flow", que usa a service role no servidor.
--
-- Motivação (achado de segurança): com "USING (true)" e sem escopo por token,
-- qualquer pessoa com a anon key (pública, embutida no bundle do site) podia:
--   - ler o código de verificação e o token de QUALQUER paciente em
--     anamnese_tokens (SELECT sem filtro obrigatório);
--   - alterar/forjar respostas de anamnese de QUALQUER paciente em
--     anamnese_answers e anamnese_responses (UPDATE sem checar posse do token).
--
-- Depois desta migração, essas tabelas só são acessíveis por: administradores
-- autenticados (gestão da clínica) e a service role (Edge Function).

-- ── anamnese_tokens: remove leitura/escrita pública ──
DROP POLICY IF EXISTS "Anyone can read anamnese tokens" ON public.anamnese_tokens;
DROP POLICY IF EXISTS "Anyone can update anamnese tokens" ON public.anamnese_tokens;
CREATE POLICY "Authenticated users can view anamnese tokens"
  ON public.anamnese_tokens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update anamnese tokens"
  ON public.anamnese_tokens FOR UPDATE TO authenticated USING (true);

-- ── anamnese_responses: remove leitura/escrita pública ──
DROP POLICY IF EXISTS "Anyone can read anamnese responses" ON public.anamnese_responses;
DROP POLICY IF EXISTS "Anyone can update anamnese responses" ON public.anamnese_responses;
CREATE POLICY "Authenticated users can view anamnese responses"
  ON public.anamnese_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update anamnese responses"
  ON public.anamnese_responses FOR UPDATE TO authenticated USING (true);

-- ── anamnese_answers: remove escrita pública (SELECT já era authenticated-only) ──
DROP POLICY IF EXISTS "Anyone can insert anamnese answers" ON public.anamnese_answers;
DROP POLICY IF EXISTS "Anyone can update anamnese answers" ON public.anamnese_answers;
CREATE POLICY "Authenticated users can insert anamnese answers"
  ON public.anamnese_answers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update anamnese answers"
  ON public.anamnese_answers FOR UPDATE TO authenticated USING (true);
