// Ativa o ambiente de demonstração: toda a UI roda com dados fictícios em
// memória, sem nenhuma leitura ou escrita no Supabase de produção.
// Ativado via VITE_DEMO_MODE=true (ver .env.demo e os scripts `*:demo` no package.json).
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === 'true';

export const DEMO_CREDENTIALS = {
  email: 'demo@techclin.com.br',
  password: 'TechClinDemo@2026',
};
