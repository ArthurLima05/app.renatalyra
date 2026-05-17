import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import logoClinica from '@/assets/LightLogo.svg';
import logoClinicaDark from '@/assets/DarkLogo.svg';
import logoTechClin from '@/assets/logo-techclin.png';
import logoTechClinDark from '@/assets/logo-techclin-dark.png';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

const PAGE_NAMES: Record<string, string> = {
  '/':              'Agenda',
  '/pacientes':     'Pacientes',
  '/profissionais': 'Profissionais',
  '/financeiro':    'Financeiro',
  '/notificacoes':  'Notificações',
  '/dashboard':     'Dashboard',
  '/funil':         'Funil',
  '/configuracoes': 'Configurações',
};

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  const location = useLocation();
  const pageName = Object.entries(PAGE_NAMES).find(([path]) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)
  )?.[1];

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card border-b border-primary/20 relative"
      style={{ boxShadow: '0 1px 8px -2px hsl(40 20% 50% / 0.12)' }}
    >
      {/* Linha dourada de acento na base do header */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

      <div className="relative px-4 py-2 flex items-center h-24">
        {/* Nome da página — mobile */}
        {pageName && (
          <span className="xl:hidden z-10 text-sm font-cocon text-muted-foreground tracking-[0.03em]">
            {pageName}
          </span>
        )}

        {/* Logo — absolutamente centralizada no header */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
        >
          <img
            src={logoClinica}
            alt="Clínica Renata Lyra"
            className="h-20 sm:h-24 w-auto object-contain dark:hidden"
          />
          <img
            src={logoClinicaDark}
            alt="Clínica Renata Lyra"
            className="h-20 sm:h-24 w-auto object-contain hidden dark:block"
          />
        </motion.div>

        {/* TechClin — direita */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="ml-auto flex-shrink-0 flex-col items-end gap-0.5 z-10 hidden sm:flex"
        >
          <span className="text-xs text-muted-foreground">Desenvolvido por</span>
          <img src={logoTechClin} alt="TechClin" className="h-7 w-auto object-contain dark:hidden" />
          <img src={logoTechClinDark} alt="TechClin" className="h-7 w-auto object-contain hidden dark:block" />
        </motion.div>
      </div>
    </motion.header>
  );
};
