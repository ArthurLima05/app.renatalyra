ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible      text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS responsible_cpf  text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS address          text;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS profession       text;
