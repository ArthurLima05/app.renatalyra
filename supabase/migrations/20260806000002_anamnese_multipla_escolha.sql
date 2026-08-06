-- Adiciona suporte a perguntas de múltipla escolha (checkboxes) na anamnese,
-- necessário para "Higiene bucal utiliza" e "Hábitos" (perguntas 15 e 16 da
-- ficha em papel), que não são nem sim/não nem texto livre.

ALTER TABLE anamnese_questions ADD COLUMN IF NOT EXISTS options text[];

INSERT INTO anamnese_questions (id, question, sequence, type, options, active, created_at) VALUES
  (gen_random_uuid(), 'Higiene bucal utiliza:', 15, 'multipla_escolha',
    ARRAY['Fio', 'Fita Dental', 'Interdental', 'Escova Macia', 'Escova Média', 'Escova Dura', 'Unitufos / Bitufos', 'Palito', 'Creme Dental', 'Enxaguante Bucal'],
    true, NOW()),
  (gen_random_uuid(), 'Hábitos:', 16, 'multipla_escolha',
    ARRAY['Roer unhas', 'Respirar pela boca', 'Chupar dedo', 'Morder caneta / lápis', 'Ranger dentes (dia)', 'Ranger dentes (noite)', 'Outros'],
    true, NOW());
