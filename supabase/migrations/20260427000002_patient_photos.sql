ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url text;

CREATE TABLE IF NOT EXISTS patient_photos (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id  uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  url         text NOT NULL,
  caption     text,
  category    text NOT NULL DEFAULT 'outro',
  created_at  timestamptz DEFAULT now() NOT NULL
);
