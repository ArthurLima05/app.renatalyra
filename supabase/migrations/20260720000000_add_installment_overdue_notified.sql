ALTER TABLE public.installments
  ADD COLUMN IF NOT EXISTS overdue_notified_at timestamptz;
