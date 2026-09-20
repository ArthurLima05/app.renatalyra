CREATE TABLE IF NOT EXISTS public.treatment_plans (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id      uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES public.professionals(id),
  title           text NOT NULL,
  status          text NOT NULL DEFAULT 'em_andamento',
  advance_value   numeric(10,2) NOT NULL DEFAULT 0,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.treatment_plan_items (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  description  text NOT NULL,
  teeth        text,
  quantity     numeric(10,2) NOT NULL DEFAULT 1,
  unit_value   numeric(10,2) NOT NULL DEFAULT 0,
  sequence     integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_plans_patient_id ON public.treatment_plans(patient_id);
CREATE INDEX IF NOT EXISTS idx_treatment_plan_items_plan_id ON public.treatment_plan_items(plan_id);

ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatment_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view treatment plans"
  ON public.treatment_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert treatment plans"
  ON public.treatment_plans FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update treatment plans"
  ON public.treatment_plans FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete treatment plans"
  ON public.treatment_plans FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view treatment plan items"
  ON public.treatment_plan_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert treatment plan items"
  ON public.treatment_plan_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update treatment plan items"
  ON public.treatment_plan_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Only admins can delete treatment plan items"
  ON public.treatment_plan_items FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
