CREATE TABLE IF NOT EXISTS odontogram_procedures (
  id                   uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id           uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  tooth_numbers        text[] NOT NULL DEFAULT '{}',
  tooth_faces          text[] NOT NULL DEFAULT '{}',
  dentition            text NOT NULL DEFAULT 'permanente',
  procedure_description text NOT NULL,
  status               text NOT NULL DEFAULT 'executado',
  professional_id      uuid REFERENCES professionals(id),
  execution_date       date NOT NULL,
  next_appointment_date date,
  notes                text,
  created_at           timestamptz DEFAULT now() NOT NULL
);
