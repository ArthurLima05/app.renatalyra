-- Add birth_date and cpf columns to patients table
ALTER TABLE public.patients
ADD COLUMN birth_date date,
ADD COLUMN cpf text;

-- Add index for CPF lookups
CREATE INDEX idx_patients_cpf ON public.patients(cpf);