import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
  Bell,
  UserCircle,
  LogOut,
} from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from '@/components/ThemeToggle';
import logoClinica from '@/assets/logo-clinica.jpg';
import logoClinicaDark from '@/assets/logo-clinica-dark.png';
import logoMobile from '@/assets/logo-mobile.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agendamentos', icon: Calendar, label: 'Agendamentos' },
  { to: '/pacientes', icon: UserCircle, label: 'Pacientes' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/feedbacks', icon: MessageSquare, label: 'Feedbacks' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações' },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => {
  const { notifications } = useClinic();
  const navigate = useNavigate();
  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;
  const isMobile = useIsMobile();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({
      title: 'Logout realizado',
      description: 'Você saiu do sistema com sucesso',
    });
    navigate('/login');
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={isMobile ? { x: isOpen ? 0 : '-100%' } : { x: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed top-0 left-0 bottom-0 w-64 min-w-64 max-w-64 bg-card border-r border-border z-40 overflow-y-auto flex flex-col"
      >
        <div className="p-4 border-b border-border">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="flex justify-center"
          >
            <img
              src={logoClinica}
              alt="Clínica Renata Lyra"
              className="h-16 w-auto object-contain xl:h-auto xl:w-full dark:hidden"
            />
            <img
              src={logoClinicaDark}
              alt="Clínica Renata Lyra"
              className="h-16 w-auto object-contain xl:h-auto xl:w-full hidden dark:block"
            />
          </motion.div>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'hover:bg-secondary text-foreground'
                }`
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
              {item.label === 'Notificações' && unreadCount > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex justify-center">
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-foreground hover:bg-secondary"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Sair</span>
          </Button>
        </div>
      </motion.aside>
    </>
  );
};
