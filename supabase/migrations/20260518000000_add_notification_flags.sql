ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS notified_24h_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_12h_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_3h_at timestamptz;
