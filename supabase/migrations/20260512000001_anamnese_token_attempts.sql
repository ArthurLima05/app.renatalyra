-- Controle de tentativas para bloqueio após 5 erros no código de verificação
ALTER TABLE anamnese_tokens
  ADD COLUMN IF NOT EXISTS attempts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;

COMMENT ON COLUMN anamnese_tokens.attempts   IS 'Número de tentativas erradas de código';
COMMENT ON COLUMN anamnese_tokens.blocked_at IS 'Momento em que o token foi bloqueado por excesso de tentativas';
