ALTER TABLE patients ADD COLUMN IF NOT EXISTS legacy_patient_id TEXT;
CREATE INDEX IF NOT EXISTS patients_legacy_patient_id_idx ON patients(legacy_patient_id);
