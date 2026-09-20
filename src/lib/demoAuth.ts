// Autenticação fictícia do ambiente de demonstração.
// Não faz nenhuma chamada ao Supabase — a "sessão" vive só em sessionStorage,
// isolada por aba/navegador, e nunca é lida por nenhum backend real.
import { DEMO_CREDENTIALS } from './demoMode';

const SESSION_KEY = 'techclin_demo_session';
const EVENT_NAME = 'techclin-demo-auth-changed';

export interface DemoUser {
  id: string;
  email: string;
}

const DEMO_USER: DemoUser = { id: 'demo-user-0001', email: DEMO_CREDENTIALS.email };

export const demoGetUser = (): DemoUser | null => {
  try {
    return sessionStorage.getItem(SESSION_KEY) ? DEMO_USER : null;
  } catch {
    return null;
  }
};

export const demoSignIn = (email: string, password: string): DemoUser => {
  if (email.trim().toLowerCase() !== DEMO_CREDENTIALS.email || password !== DEMO_CREDENTIALS.password) {
    throw new Error('E-mail ou senha inválidos. Use as credenciais de demonstração informadas na tela de login.');
  }
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch { /* ignora ambientes sem sessionStorage */ }
  window.dispatchEvent(new Event(EVENT_NAME));
  return DEMO_USER;
};

export const demoSignOut = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignora */ }
  window.dispatchEvent(new Event(EVENT_NAME));
};

export const onDemoAuthChange = (callback: () => void) => {
  window.addEventListener(EVENT_NAME, callback);
  return () => window.removeEventListener(EVENT_NAME, callback);
};
