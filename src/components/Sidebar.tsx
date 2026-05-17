import { NavLink, useNavigate } from 'react-router-dom';
import simboloCinza from '@/assets/SimboloCinza.svg';
import simboloBranco from '@/assets/SimboloBranco.svg';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Calendar,
  DollarSign,
  Bell,
  UserCircle,
  LogOut,
  Stethoscope,
  Settings,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  X,
} from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { usePermissionsCtx } from '@/contexts/PermissionsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { to: '/',              module: 'agenda',        icon: Calendar,        label: 'Agendamentos' },
  { to: '/pacientes',     module: 'pacientes',     icon: UserCircle,      label: 'Pacientes' },
  { to: '/profissionais', module: 'profissionais', icon: Stethoscope,     label: 'Profissionais' },
  { to: '/financeiro',    module: 'financeiro',    icon: DollarSign,      label: 'Financeiro' },
  { to: '/notificacoes',  module: 'notificacoes',  icon: Bell,            label: 'Notificações' },
  { to: '/dashboard',     module: 'dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/funil',         module: 'funil',         icon: TrendingUp,      label: 'Funil de Vendas' },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const { notifications } = useClinic();
  const { hasAnyPermission, isAdmin } = usePermissionsCtx();
  const navigate = useNavigate();
  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;
  const isMobile = useIsMobile();

  // Todos os itens aparecem; sem canView ficam cinzados visualmente

  const collapsed = !isMobile && isCollapsed;
  const w = collapsed ? 'w-16' : 'w-64';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: 'Logout realizado', description: 'Você saiu do sistema com sucesso' });
    navigate('/login');
  };

  return (
    <>
      {/* Overlay mobile */}
      {isOpen && isMobile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/20 z-40 xl:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={isMobile ? { x: isOpen ? 0 : '-100%' } : { x: 0 }}
        transition={{ duration: 0.2 }}
        style={{ background: 'linear-gradient(180deg, hsl(var(--card)) 0%, hsl(var(--sidebar-accent)) 100%)' }}
        className={cn(
          'fixed top-0 left-0 bottom-0 border-r border-border z-40 flex flex-col transition-all duration-200 overflow-hidden',
          'rounded-r-2xl shadow-lg',
          isMobile ? 'w-64' : w,
        )}
      >
        {/* Cabeçalho */}
        <div className={cn(
          'border-b border-border flex items-center transition-all duration-200',
          collapsed ? 'px-0 py-4 justify-center' : 'px-4 py-4 gap-2',
        )}>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight truncate">
                Plataforma Central
              </p>
              <p className="text-xs text-muted-foreground truncate">de Gestão</p>
            </div>
          )}

          {/* Botão X — fecha no mobile, colapsa no desktop */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => isMobile ? setIsOpen(false) : setIsCollapsed(!isCollapsed)}
            title={isMobile ? 'Fechar menu' : isCollapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {isMobile ? (
              <X className="h-4 w-4" />
            ) : isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Navegação */}
        <nav className="flex-1 py-3 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const hasAccess = item.module === 'agenda' || hasAnyPermission(item.module);
            return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setIsOpen(false)}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex items-center rounded-xl transition-all duration-150 px-2 py-2.5 text-sm font-medium relative',
                  collapsed ? 'justify-center' : 'gap-3',
                  isActive
                    ? 'bg-primary/12 text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:bg-primary before:rounded-r-full'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                  !hasAccess && 'opacity-40',
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && (
                <span className="flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.label === 'Notificações' && unreadCount > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
              {collapsed && item.label === 'Notificações' && unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
              )}
            </NavLink>
          );})}
        </nav>

        {/* Símbolo decorativo */}
        {!collapsed && (
          <div className="relative h-40 shrink-0 overflow-hidden pointer-events-none select-none">
            <img src={simboloCinza} aria-hidden="true" className="absolute bottom-0 left-1/2 -translate-x-1/2 h-40 w-auto opacity-[0.12] dark:hidden" />
            <img src={simboloBranco} aria-hidden="true" className="absolute bottom-0 left-1/2 -translate-x-1/2 h-40 w-auto opacity-[0.07] hidden dark:block" />
          </div>
        )}

        {/* Rodapé */}
        <div className={cn('border-t border-border py-3 px-2 space-y-0.5')}>
          <NavLink
            to="/configuracoes"
            onClick={() => setIsOpen(false)}
            title={collapsed ? 'Configurações' : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center rounded-xl transition-all duration-150 px-2 py-2.5 text-sm font-medium w-full relative',
                collapsed ? 'justify-center' : 'gap-3',
                isActive
                  ? 'bg-primary/12 text-primary font-semibold before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-6 before:w-[3px] before:bg-primary before:rounded-r-full'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                !hasAnyPermission('configuracoes') && 'opacity-40',
              )
            }
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Configurações</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              'flex items-center rounded-lg transition-all px-2 py-2.5 text-sm font-medium w-full hover:bg-secondary text-foreground',
              collapsed ? 'justify-center' : 'gap-3',
            )}
          >
            <LogOut className="h-5 w-5 shrink-0" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};
