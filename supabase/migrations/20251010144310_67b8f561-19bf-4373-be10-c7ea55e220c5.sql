-- Create installments table for tracking payment installments
CREATE TABLE public.installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  total_installments INTEGER NOT NULL,
  amount NUMERIC NOT NULL,
  predicted_date TIMESTAMP WITH TIME ZONE NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT false,
  paid_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated users can view installments" 
ON public.installments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert installments" 
ON public.installments 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update installments" 
ON public.installments 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete installments" 
ON public.installments 
FOR DELETE 
USING (true);

-- Add index for better performance
CREATE INDEX idx_installments_predicted_date ON public.installments(predicted_date);
CREATE INDEX idx_installments_paid ON public.installments(paid);