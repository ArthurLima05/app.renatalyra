-- Perguntas do template de anamnese (globais, editáveis pela secretária)
CREATE TABLE IF NOT EXISTS anamnese_questions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  question    text NOT NULL,
  sequence    integer NOT NULL,
  type        text NOT NULL DEFAULT 'sim_nao', -- 'descritivo' | 'sim_nao'
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Formulários de anamnese preenchidos por paciente
CREATE TABLE IF NOT EXISTS anamnese_responses (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id   uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  completed_at timestamptz,
  created_at   timestamptz DEFAULT now() NOT NULL
);

-- Respostas individuais por formulário
CREATE TABLE IF NOT EXISTS anamnese_answers (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  response_id       uuid NOT NULL REFERENCES anamnese_responses(id) ON DELETE CASCADE,
  question_id       uuid REFERENCES anamnese_questions(id),
  question_text     text NOT NULL,
  question_type     text NOT NULL,
  question_sequence integer NOT NULL,
  answer_bool       boolean,
  answer_text       text,
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE anamnese_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_anamnese_questions" ON anamnese_questions FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE anamnese_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_anamnese_responses" ON anamnese_responses FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE anamnese_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_anamnese_answers" ON anamnese_answers FOR ALL USING (true) WITH CHECK (true);

-- Perguntas padrão
INSERT INTO anamnese_questions (question, sequence, type) VALUES
  ('Qual o motivo da consulta?',                                                          1,  'descritivo'),
  ('Quando foi o último tratamento odontológico?',                                        2,  'descritivo'),
  ('Está fazendo algum tratamento médico?',                                               3,  'sim_nao'),
  ('Está tomando algum medicamento?',                                                     4,  'sim_nao'),
  ('Tem alergia a algum medicamento?',                                                    5,  'sim_nao'),
  ('Teve alguma reação a anestesia local?',                                               6,  'sim_nao'),
  ('Sente sensibilidade nos dentes?',                                                     7,  'sim_nao'),
  ('Range os dentes ou tem apertamento?',                                                 8,  'sim_nao'),
  ('Sua gengiva sangra com frequência?',                                                  9,  'sim_nao'),
  ('Tem algum hábito?',                                                                   10, 'sim_nao'),
  ('Fuma? Quantos cigarros por dia?',                                                     11, 'sim_nao'),
  ('É diabético? Tem alguém da família que é diabético?',                                 12, 'sim_nao'),
  ('Quando você se corta, sangra muito?',                                                 13, 'sim_nao'),
  ('Tem algum problema cardíaco?',                                                        14, 'sim_nao'),
  ('Sente dores de cabeça, dores na face, ouvido ou articulação?',                       15, 'sim_nao'),
  ('Teve algum desmaio, tem ataques nervosos, epilepsia ou convulsão?',                   16, 'sim_nao'),
  ('Sua pressão arterial é normal?',                                                      17, 'sim_nao'),
  ('Está grávida?',                                                                       18, 'sim_nao');
