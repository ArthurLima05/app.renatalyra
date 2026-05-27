-- Enforce role-based access control (RBAC) on all tables.
-- Business rule: 'admin' has full access; 'secretaria' cannot delete records.
-- Uses the existing has_role() SECURITY DEFINER function.

-- ─── 1. Tables with explicit DELETE policies → restrict to admin ──────────────

DROP POLICY IF EXISTS "Authenticated users can delete transactions" ON public.transactions;
CREATE POLICY "Only admins can delete transactions"
  ON public.transactions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete patients" ON public.patients;
CREATE POLICY "Only admins can delete patients"
  ON public.patients FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete professionals" ON public.professionals;
CREATE POLICY "Only admins can delete professionals"
  ON public.professionals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete appointments" ON public.appointments;
CREATE POLICY "Only admins can delete appointments"
  ON public.appointments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete sessions" ON public.sessions;
CREATE POLICY "Only admins can delete sessions"
  ON public.sessions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete installments" ON public.installments;
CREATE POLICY "Only admins can delete installments"
  ON public.installments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can delete notifications" ON public.notifications;
CREATE POLICY "Only admins can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 2. Tables with ALL (authenticated) → split, admin-only DELETE ────────────

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.app_users;
CREATE POLICY "Authenticated users can view app_users"
  ON public.app_users FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert app_users"
  ON public.app_users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update app_users"
  ON public.app_users FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete app_users"
  ON public.app_users FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.clinic_settings;
CREATE POLICY "Authenticated users can view clinic_settings"
  ON public.clinic_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clinic_settings"
  ON public.clinic_settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update clinic_settings"
  ON public.clinic_settings FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete clinic_settings"
  ON public.clinic_settings FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.leads;
CREATE POLICY "Authenticated users can view leads"
  ON public.leads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert leads"
  ON public.leads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update leads"
  ON public.leads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete leads"
  ON public.leads FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.patient_documents;
CREATE POLICY "Authenticated users can view patient_documents"
  ON public.patient_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patient_documents"
  ON public.patient_documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patient_documents"
  ON public.patient_documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete patient_documents"
  ON public.patient_documents FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "allow_all_authenticated" ON public.return_alerts;
CREATE POLICY "Authenticated users can view return_alerts"
  ON public.return_alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert return_alerts"
  ON public.return_alerts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update return_alerts"
  ON public.return_alerts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete return_alerts"
  ON public.return_alerts FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_permissions: most sensitive — only admins can modify
DROP POLICY IF EXISTS "allow_all_authenticated" ON public.user_permissions;
CREATE POLICY "Authenticated users can view user_permissions"
  ON public.user_permissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert user_permissions"
  ON public.user_permissions FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can update user_permissions"
  ON public.user_permissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Only admins can delete user_permissions"
  ON public.user_permissions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ─── 3. Tables with ALL (public) → split, restrict DELETE and anon writes ──────
-- Anamnese tables: patients fill forms unauthenticated, so SELECT/INSERT/UPDATE
-- must remain accessible to anon where needed. DELETE is blocked for everyone
-- except admins to prevent unauthenticated destruction of medical records.

DROP POLICY IF EXISTS "allow_all_anamnese_questions" ON public.anamnese_questions;
CREATE POLICY "Anyone can read anamnese questions"
  ON public.anamnese_questions FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert anamnese questions"
  ON public.anamnese_questions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update anamnese questions"
  ON public.anamnese_questions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete anamnese questions"
  ON public.anamnese_questions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Tokens: patient reads/updates (validates token, increments attempts), clinic creates
DROP POLICY IF EXISTS "allow_all_anamnese_tokens" ON public.anamnese_tokens;
CREATE POLICY "Anyone can read anamnese tokens"
  ON public.anamnese_tokens FOR SELECT USING (true);
CREATE POLICY "Anyone can update anamnese tokens"
  ON public.anamnese_tokens FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can create anamnese tokens"
  ON public.anamnese_tokens FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Only admins can delete anamnese tokens"
  ON public.anamnese_tokens FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Responses: patient reads/updates (checks status, signs form), clinic creates
DROP POLICY IF EXISTS "allow_all_anamnese_responses" ON public.anamnese_responses;
CREATE POLICY "Anyone can read anamnese responses"
  ON public.anamnese_responses FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create anamnese responses"
  ON public.anamnese_responses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update anamnese responses"
  ON public.anamnese_responses FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete anamnese responses"
  ON public.anamnese_responses FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Answers: patient inserts/updates (submits answers), clinic reads
DROP POLICY IF EXISTS "allow_all_anamnese_answers" ON public.anamnese_answers;
CREATE POLICY "Authenticated users can view anamnese answers"
  ON public.anamnese_answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert anamnese answers"
  ON public.anamnese_answers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update anamnese answers"
  ON public.anamnese_answers FOR UPDATE USING (true);
CREATE POLICY "Only admins can delete anamnese answers"
  ON public.anamnese_answers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Odontogram procedures: public read preserved (current behavior), clinic manages
DROP POLICY IF EXISTS "allow_all_odontogram" ON public.odontogram_procedures;
CREATE POLICY "Anyone can read odontogram procedures"
  ON public.odontogram_procedures FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert odontogram procedures"
  ON public.odontogram_procedures FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update odontogram procedures"
  ON public.odontogram_procedures FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete odontogram procedures"
  ON public.odontogram_procedures FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Patient photos: restrict to authenticated, admin deletes
DROP POLICY IF EXISTS "allow_all_photos" ON public.patient_photos;
CREATE POLICY "Authenticated users can view patient_photos"
  ON public.patient_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patient_photos"
  ON public.patient_photos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patient_photos"
  ON public.patient_photos FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete patient_photos"
  ON public.patient_photos FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
