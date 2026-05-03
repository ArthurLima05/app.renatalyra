ALTER TABLE anamnese_responses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS patient_signed_name text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

CREATE TABLE IF NOT EXISTS anamnese_tokens (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id uuid NOT NULL REFERENCES anamnese_responses(id) ON DELETE CASCADE,
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  code        char(4) NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE anamnese_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_anamnese_tokens" ON anamnese_tokens FOR ALL USING (true) WITH CHECK (true);
