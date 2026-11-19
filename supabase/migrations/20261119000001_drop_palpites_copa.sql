-- Remove tudo da Copa 2026: a tabela guardava nome e CPF de participantes
-- sem finalidade atual (LGPD). A página pública e a tela interna foram
-- removidas do front no mesmo commit.
drop table if exists public.palpites_copa;
