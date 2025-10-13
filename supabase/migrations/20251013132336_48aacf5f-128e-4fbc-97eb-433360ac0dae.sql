-- Adicionar novos tipos de notificação
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'lembrete_consulta';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'lembrete_feedback';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'lembrete_prontuario';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'lembrete_pagamento';

-- Adicionar campos opcionais para referências nas notificações
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.sessions(id) ON DELETE CASCADE;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS installment_id uuid REFERENCES public.installments(id) ON DELETE CASCADE;