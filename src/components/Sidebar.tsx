import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
  Bell,
} from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { useIsMobile } from '@/hooks/use-mobile';
import logoClinica from '@/assets/logo-clinica.jpg';
import logoMobile from '@/assets/logo-mobile.png';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agendamentos', icon: Calendar, label: 'Agendamentos' },
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
  const unreadCount = notifications.filter(n => !n.read).length;
  const isMobile = useIsMobile();

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
        className="fixed top-0 left-0 bottom-0 w-64 bg-card border-r border-border z-40 overflow-y-auto xl:static"
      >
        <div className="p-4 border-b border-border">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className="w-full"
          >
            <img
              src={logoMobile}
              alt="Logo"
              className="w-full h-auto object-contain xl:hidden"
            />
            <img
              src={logoClinica}
              alt="Clínica Renata Lyra"
              className="w-full h-auto object-contain hidden xl:block"
            />
          </motion.div>
        </div>
        
        <nav className="p-4 space-y-2">
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
      </motion.aside>
    </>
  );
};
