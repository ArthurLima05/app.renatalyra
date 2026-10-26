-- Correções críticas da auditoria de segurança (26/10/2026).
-- Seguro de aplicar a qualquer momento: nenhuma tela ou fluxo depende dos acessos públicos removidos.

-- C1: procedimentos de odontograma e perguntas de anamnese deixam de ser legíveis sem login.
-- (anamnese-flow usa a service role, que ignora RLS, então o formulário público continua funcionando.)
drop policy if exists "Anyone can read odontogram procedures" on public.odontogram_procedures;
create policy "Authenticated users can read odontogram procedures"
  on public.odontogram_procedures for select to authenticated using (true);

drop policy if exists "Anyone can read anamnese questions" on public.anamnese_questions;
create policy "Authenticated users can read anamnese questions"
  on public.anamnese_questions for select to authenticated using (true);

-- C2: a função que cria sessões, parcelas e entradas financeiras só roda para usuários logados.
alter function public.create_session_with_installments(uuid, timestamptz, text, text, text, numeric, text, text, timestamptz, uuid, integer, timestamptz)
  set search_path = public;
revoke execute on function public.create_session_with_installments(uuid, timestamptz, text, text, text, numeric, text, text, timestamptz, uuid, integer, timestamptz)
  from public, anon;
grant execute on function public.create_session_with_installments(uuid, timestamptz, text, text, text, numeric, text, text, timestamptz, uuid, integer, timestamptz)
  to authenticated, service_role;

-- C3: consulta de paciente por telefone só para logados e para o servidor.
-- Se algum fluxo do n8n chamar esta função com a chave anon, passe a usar a service role.
-- Para desfazer: grant execute on function public.get_patient_last_appointment(text) to anon;
revoke execute on function public.get_patient_last_appointment(text) from public, anon;
grant execute on function public.get_patient_last_appointment(text) to authenticated, service_role;

-- C4 (parte 1): fotos de pacientes não aceitam mais upload, leitura nem exclusão anônimos.
drop policy if exists "allow_delete_patient_photos" on storage.objects;
drop policy if exists "allow_read_patient_photos" on storage.objects;
drop policy if exists "allow_upload_patient_photos" on storage.objects;
create policy "allow_all_authenticated_photos" on storage.objects
  for all to authenticated
  using (bucket_id = 'patient-photos')
  with check (bucket_id = 'patient-photos');
