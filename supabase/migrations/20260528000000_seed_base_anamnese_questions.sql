-- Insere as 14 perguntas base da anamnese (idempotente via ON CONFLICT na sequência)
-- Só insere se ainda não existir uma pergunta ativa naquela sequência.

INSERT INTO anamnese_questions (id, question, sequence, type, active, created_at)
SELECT gen_random_uuid(), q.question, q.sequence, 'sim_nao', true, NOW()
FROM (VALUES
  (1,  'Está fazendo tratamento médico?'),
  (2,  'Está tomando algum medicamento?'),
  (3,  'Faz uso de substâncias controladas?'),
  (4,  'É alérgico(a) a algum medicamento?'),
  (5,  'Tem pressão alta ou baixa?'),
  (6,  'Sofre ou já sofreu de algum problema cardíaco?'),
  (7,  'Esteve em tratamento de quimio ou radioterapia?'),
  (8,  'Já foi submetido(a) a algum procedimento cirúrgico?'),
  (9,  'Sua gengiva sangra com facilidade?'),
  (10, 'Já apresentou algum quadro de hemorragia?'),
  (11, 'É diabético(a)?'),
  (12, 'Está ou pode estar grávida?'),
  (13, 'Possui alguma doença infecto-contagiosa?'),
  (14, 'Já teve alguma experiência negativa no tratamento odontológico?')
) AS q(sequence, question)
WHERE NOT EXISTS (
  SELECT 1 FROM anamnese_questions
  WHERE sequence = q.sequence AND active = true
);
