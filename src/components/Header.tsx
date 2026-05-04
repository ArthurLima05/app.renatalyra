import { motion } from 'framer-motion';
import logoClinica from '@/assets/logo-clinica.jpg';
import logoClinicaDark from '@/assets/logo-clinica-dark.png';
import logoTechClin from '@/assets/logo-techclin.png';
import logoTechClinDark from '@/assets/logo-techclin-dark.png';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';

interface HeaderProps {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const Header = ({ isSidebarOpen, toggleSidebar }: HeaderProps) => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-card border-b border-border shadow-sm"
    >
      <div className="relative px-4 py-3 flex items-center h-20">
        {/* Botão menu — mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden z-10"
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

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
            className="h-14 sm:h-16 w-auto object-contain dark:hidden"
          />
          <img
            src={logoClinicaDark}
            alt="Clínica Renata Lyra"
            className="h-14 sm:h-16 w-auto object-contain hidden dark:block"
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
