import { motion } from 'framer-motion';
import logoTechClin from '@/assets/logo-techclin.png';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';

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
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="xl:hidden"
          onClick={toggleSidebar}
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 text-center px-2 sm:px-4 flex flex-col items-center justify-center"
        >
          <h1 className="text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-foreground leading-tight">
            Plataforma Central de Gestão
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block mt-0.5">
            Clínica Renata Lyra
          </p>
        </motion.div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex-shrink-0 flex-col items-end gap-1 hidden sm:flex"
          >
            <span className="text-xs text-muted-foreground">
              Desenvolvido por
            </span>
            <img
              src={logoTechClin}
              alt="TechClin"
              className="h-8 sm:h-10 w-auto object-contain"
            />
          </motion.div>
        </div>
      </div>
    </motion.header>
  );
};
