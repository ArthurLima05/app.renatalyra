-- Generaliza a tabela de palpites para suportar múltiplos jogos da Copa.
-- Os registros existentes são todos do jogo Brasil x Marrocos.
ALTER TABLE public.palpites_copa ADD COLUMN adversario text NOT NULL DEFAULT 'Marrocos';

ALTER TABLE public.palpites_copa RENAME COLUMN placar_marrocos TO placar_adversario;
ALTER TABLE public.palpites_copa RENAME CONSTRAINT palpites_copa_placar_marrocos_check TO palpites_copa_placar_adversario_check;

-- Cada pessoa pode palpitar uma vez por jogo (não mais uma única vez no total)
ALTER TABLE public.palpites_copa DROP CONSTRAINT palpites_copa_cpf_key;
ALTER TABLE public.palpites_copa ADD CONSTRAINT palpites_copa_cpf_adversario_key UNIQUE (cpf, adversario);

ALTER TABLE public.palpites_copa ALTER COLUMN adversario DROP DEFAULT;
