import { motion } from 'framer-motion';
import logoClinica from '@/assets/logo-clinica.png';
import logoTechClin from '@/assets/logo-techclin.png';

export const Header = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-card border-b border-border shadow-sm"
    >
      <div className="container mx-auto px-4 h-20 flex items-center justify-between">
        <motion.img
          whileHover={{ scale: 1.05 }}
          src={logoClinica}
          alt="Clínica Renata Lyra"
          className="h-14 object-contain"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex-1 text-center px-4"
        >
          <h1 className="text-xl md:text-2xl font-semibold text-foreground">
            Plataforma Central de Gestão
          </h1>
          <p className="text-sm text-muted-foreground hidden md:block">
            Clínica Renata Lyra
          </p>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex items-center gap-2"
        >
          <span className="text-xs text-muted-foreground hidden md:inline">
            Desenvolvido por
          </span>
          <img
            src={logoTechClin}
            alt="TechClin"
            className="h-10 object-contain"
          />
        </motion.div>
      </div>
    </motion.header>
  );
};
