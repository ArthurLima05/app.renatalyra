import { motion } from 'framer-motion';
import logoClinica from '@/assets/logo-clinica.jpg';
import logoTechClin from '@/assets/logo-techclin.png';
import logoMobile from '@/assets/logo-mobile.png';

export const Header = () => {
  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 bg-card border-b border-border shadow-sm"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="flex-shrink-0 w-20 sm:w-32 md:w-40 lg:w-48"
        >
          <img
            src={logoMobile}
            alt="Logo"
            className="w-full h-auto object-contain sm:hidden"
          />
          <img
            src={logoClinica}
            alt="Clínica Renata Lyra"
            className="w-full h-auto object-contain hidden sm:block"
          />
        </motion.div>
        
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
    </motion.header>
  );
};
