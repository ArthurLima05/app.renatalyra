-- Metadados legais para rastreabilidade da anamnese
-- Lei 14.063/2020 (assinatura eletrônica) + LGPD (Lei 13.709/2018)
ALTER TABLE anamnese_responses
  ADD COLUMN IF NOT EXISTS ip_address    TEXT,
  ADD COLUMN IF NOT EXISTS user_agent    TEXT,
  ADD COLUMN IF NOT EXISTS verified_phone TEXT;

COMMENT ON COLUMN anamnese_responses.ip_address     IS 'IP público do dispositivo usado no preenchimento';
COMMENT ON COLUMN anamnese_responses.user_agent     IS 'User-agent do navegador (identificação do dispositivo)';
COMMENT ON COLUMN anamnese_responses.verified_phone IS 'Telefone verificado via código WhatsApp (prova de identidade)';
