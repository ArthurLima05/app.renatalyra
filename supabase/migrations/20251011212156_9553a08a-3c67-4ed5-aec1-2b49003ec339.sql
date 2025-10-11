-- Adicionar coluna session_id na tabela installments
ALTER TABLE public.installments ADD COLUMN session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance de queries por session_id
CREATE INDEX idx_installments_session_id ON public.installments(session_id);