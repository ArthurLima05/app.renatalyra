import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  MessageSquare,
  Users,
  Bell,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { useClinic } from '@/contexts/ClinicContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/agendamentos', icon: Calendar, label: 'Agendamentos' },
  { to: '/financeiro', icon: DollarSign, label: 'Financeiro' },
  { to: '/feedbacks', icon: MessageSquare, label: 'Feedbacks' },
  { to: '/notificacoes', icon: Bell, label: 'Notificações' },
];

export const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications } = useClinic();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-24 left-4 z-50 lg:hidden bg-card shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: 0 }}
        className={`
          fixed top-20 left-0 bottom-0 w-64 bg-card border-r border-border z-40 overflow-y-auto
          lg:relative lg:top-0
          ${!isOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
          transition-transform duration-300 ease-in-out
        `}
      >
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
