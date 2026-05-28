-- Substitui as perguntas da anamnese pelas 14 perguntas base do prontuário odontológico.
-- As perguntas anteriores são apenas desativadas (não deletadas) para preservar anamneses já preenchidas.

UPDATE anamnese_questions
SET active = false,
    sequence = sequence + 2000
WHERE active = true;

INSERT INTO anamnese_questions (id, question, sequence, type, active, created_at) VALUES
  (gen_random_uuid(), 'Está fazendo tratamento médico?',                                1,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Está tomando algum medicamento?',                                2,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Faz uso de substâncias controladas?',                            3,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'É alérgico(a) a algum medicamento?',                             4,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Tem pressão alta ou baixa?',                                     5,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Sofre ou já sofreu de algum problema cardíaco?',                 6,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Esteve em tratamento de quimio ou radioterapia?',                7,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Já foi submetido(a) a algum procedimento cirúrgico?',            8,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Sua gengiva sangra com facilidade?',                             9,  'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Já apresentou algum quadro de hemorragia?',                      10, 'sim_nao', true, NOW()),
  (gen_random_uuid(), 'É diabético(a)?',                                                11, 'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Está ou pode estar grávida?',                                    12, 'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Possui alguma doença infecto-contagiosa?',                       13, 'sim_nao', true, NOW()),
  (gen_random_uuid(), 'Já teve alguma experiência negativa no tratamento odontológico?', 14, 'sim_nao', true, NOW());
