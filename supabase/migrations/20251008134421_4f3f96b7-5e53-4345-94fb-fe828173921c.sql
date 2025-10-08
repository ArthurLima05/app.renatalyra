-- Create enum types for better data integrity
CREATE TYPE patient_origin AS ENUM ('Google Ads', 'Instagram', 'Indicação', 'Outro');
CREATE TYPE appointment_status AS ENUM ('agendado', 'confirmado', 'realizado', 'cancelado', 'falta', 'sugerido');
CREATE TYPE session_type AS ENUM ('primeira_consulta', 'consulta_avulsa', 'retorno');
CREATE TYPE payment_status AS ENUM ('pago', 'em_aberto');
CREATE TYPE transaction_type AS ENUM ('entrada', 'saida');
CREATE TYPE notification_type AS ENUM ('cancelamento', 'falta', 'agendamento', 'feedback');

-- Professionals table
CREATE TABLE public.professionals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  average_rating DECIMAL(3,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patients table
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  origin patient_origin NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL,
  session_type session_type NOT NULL,
  status appointment_status NOT NULL DEFAULT 'sugerido',
  notes TEXT,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  payment_status payment_status NOT NULL DEFAULT 'em_aberto',
  next_appointment TIMESTAMPTZ,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments table
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  date TIMESTAMPTZ NOT NULL,
  time TEXT NOT NULL,
  status appointment_status NOT NULL DEFAULT 'agendado',
  origin patient_origin NOT NULL,
  notes TEXT,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions table
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type transaction_type NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  category TEXT NOT NULL,
  patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Feedbacks table
CREATE TABLE public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  origin patient_origin NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow authenticated users to read and write all data
-- (assuming only clinic staff will be authenticated)

-- Professionals policies
CREATE POLICY "Authenticated users can view professionals" ON public.professionals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert professionals" ON public.professionals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update professionals" ON public.professionals FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete professionals" ON public.professionals FOR DELETE TO authenticated USING (true);

-- Patients policies
CREATE POLICY "Authenticated users can view patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patients" ON public.patients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete patients" ON public.patients FOR DELETE TO authenticated USING (true);

-- Sessions policies
CREATE POLICY "Authenticated users can view sessions" ON public.sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert sessions" ON public.sessions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update sessions" ON public.sessions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete sessions" ON public.sessions FOR DELETE TO authenticated USING (true);

-- Appointments policies
CREATE POLICY "Authenticated users can view appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete appointments" ON public.appointments FOR DELETE TO authenticated USING (true);

-- Transactions policies
CREATE POLICY "Authenticated users can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (true);

-- Feedbacks policies
CREATE POLICY "Authenticated users can view feedbacks" ON public.feedbacks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert feedbacks" ON public.feedbacks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update feedbacks" ON public.feedbacks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete feedbacks" ON public.feedbacks FOR DELETE TO authenticated USING (true);

-- Notifications policies
CREATE POLICY "Authenticated users can view notifications" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update notifications" ON public.notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (true);

-- Create indexes for better query performance
CREATE INDEX idx_patients_full_name ON public.patients(full_name);
CREATE INDEX idx_patients_origin ON public.patients(origin);
CREATE INDEX idx_sessions_patient_id ON public.sessions(patient_id);
CREATE INDEX idx_sessions_date ON public.sessions(date);
CREATE INDEX idx_sessions_status ON public.sessions(status);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);
CREATE INDEX idx_appointments_date ON public.appointments(date);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_transactions_patient_id ON public.transactions(patient_id);
CREATE INDEX idx_transactions_date ON public.transactions(date);
CREATE INDEX idx_feedbacks_patient_id ON public.feedbacks(patient_id);

-- Insert default professional (Renata Lyra)
INSERT INTO public.professionals (name, specialty, email, phone, average_rating)
VALUES ('Renata Lyra', 'Odontologia', 'renata@clinicalyra.com', '(11) 99999-9999', 5.0);