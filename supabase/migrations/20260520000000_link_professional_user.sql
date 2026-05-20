-- Vincula um usuário do sistema a um profissional da clínica.
-- Quando preenchido, o usuário logado verá apenas os dados dos seus pacientes.
ALTER TABLE professionals
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) UNIQUE;
