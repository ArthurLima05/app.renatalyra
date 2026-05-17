import { NavLink, useNavigate } from 'react-router-dom';
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
  { to: '/funil',         module: 'funil',         icon: TrendingUp,      label: 'Funil' },
];

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const Sidebar = ({ isOpen, setIsOpen, isCollapsed, setIsCollapsed }: SidebarProps) => {
  const { notifications } = useClinic();
  const { hasAnyPermission } = usePermissionsCtx();
  const navigate = useNavigate();
  const { toast } = useToast();
  const unreadCount = notifications.filter(n => !n.read).length;
  const isMobile = useIsMobile();
  const collapsed = !isMobile && isCollapsed;
  const w = collapsed ? 'w-[64px]' : 'w-64';

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
          className="fixed inset-0 bg-black/40 z-40 xl:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <motion.aside
        initial={false}
        animate={isMobile ? { x: isOpen ? 0 : '-100%' } : { x: 0 }}
        transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{ background: 'var(--sb-bg)' }}
        className={cn(
          'fixed top-0 left-0 bottom-0 z-40 flex flex-col transition-all duration-200 overflow-hidden',
          isMobile ? 'w-64 rounded-r-2xl shadow-2xl' : cn(w, 'border-r'),
        )}
      >
        {/* Linha de borda colorida no topo */}
        <div className="h-[2px] bg-gradient-to-r from-transparent via-[var(--sb-active-text)] to-transparent opacity-50 shrink-0" />

        {/* Cabeçalho */}
        <div
          className={cn(
            'flex items-center transition-all duration-200 shrink-0',
            collapsed ? 'px-0 py-4 justify-center' : 'px-4 py-4 gap-3',
          )}
          style={{ borderBottom: '1px solid var(--sb-border)' }}
        >
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-cocon tracking-[0.05em] leading-tight truncate"
                style={{ color: 'var(--sb-heading)' }}
              >
                Renata Lyra
              </p>
              <p
                className="text-[10px] tracking-[0.1em] uppercase truncate mt-0.5"
                style={{ color: 'var(--sb-sub)' }}
              >
                Clínica Odontológica
              </p>
            </div>
          )}

          <button
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            )}
            style={{ color: 'var(--sb-sub)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--sb-text-hover)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--sb-sub)')}
            onClick={() => isMobile ? setIsOpen(false) : setIsCollapsed(!isCollapsed)}
            title={isMobile ? 'Fechar' : isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isMobile ? <X className="h-4 w-4" />
              : isCollapsed ? <ChevronRight className="h-4 w-4" />
              : <ChevronLeft className="h-4 w-4" />}
          </button>
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
                style={({ isActive }) => isActive
                  ? { color: 'var(--sb-active-text)', background: 'var(--sb-active-bg)' }
                  : { color: 'var(--sb-text)' }
                }
                className={({ isActive }) =>
                  cn(
                    'flex items-center rounded-lg transition-all duration-150 px-2.5 py-2.5 text-sm relative group',
                    collapsed ? 'justify-center' : 'gap-3',
                    !hasAccess && 'opacity-30',
                  )
                }
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  if (!el.dataset.active) el.style.color = 'var(--sb-text-hover)';
                  if (!el.dataset.active) el.style.background = 'var(--sb-hover-bg)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  if (!el.dataset.active) el.style.color = 'var(--sb-text)';
                  if (!el.dataset.active) el.style.background = '';
                }}
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: 'var(--sb-active-text)' }}
                      />
                    )}
                    <item.icon className={cn('h-[18px] w-[18px] shrink-0', isActive ? 'opacity-100' : 'opacity-70')} />
                    {!collapsed && (
                      <span className={cn('flex-1 truncate font-medium text-[13px]', isActive && 'font-semibold')}>
                        {item.label}
                      </span>
                    )}
                    {!collapsed && item.label === 'Notificações' && unreadCount > 0 && (
                      <span
                        className="ml-auto text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center"
                        style={{ background: 'hsl(0 65% 55%)', color: 'white' }}
                      >
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                    {collapsed && item.label === 'Notificações' && unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Símbolo decorativo */}
        {!collapsed && (
          <div className="relative h-36 shrink-0 overflow-hidden pointer-events-none select-none">
            <img
              src={simboloBranco}
              aria-hidden="true"
              className="absolute bottom-0 left-1/2 -translate-x-1/2 h-36 w-auto opacity-[0.08]"
            />
          </div>
        )}

        {/* Rodapé */}
        <div
          className={cn('py-3 px-2 space-y-0.5 shrink-0')}
          style={{ borderTop: '1px solid var(--sb-border)' }}
        >
          <NavLink
            to="/configuracoes"
            onClick={() => setIsOpen(false)}
            title={collapsed ? 'Configurações' : undefined}
            style={({ isActive }) => isActive
              ? { color: 'var(--sb-active-text)', background: 'var(--sb-active-bg)' }
              : { color: 'var(--sb-text)' }
            }
            className={cn(
              'flex items-center rounded-lg transition-all duration-150 px-2.5 py-2.5 text-[13px] font-medium w-full relative',
              collapsed ? 'justify-center' : 'gap-3',
            )}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--sb-text-hover)';
              e.currentTarget.style.background = 'var(--sb-hover-bg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--sb-text)';
              e.currentTarget.style.background = '';
            }}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                    style={{ background: 'var(--sb-active-text)' }}
                  />
                )}
                <Settings className="h-[18px] w-[18px] shrink-0 opacity-70" />
                {!collapsed && <span className="flex-1 truncate">Configurações</span>}
              </>
            )}
          </NavLink>

          <button
            onClick={handleLogout}
            title={collapsed ? 'Sair' : undefined}
            className={cn(
              'flex items-center rounded-lg transition-all duration-150 px-2.5 py-2.5 text-[13px] font-medium w-full',
              collapsed ? 'justify-center' : 'gap-3',
            )}
            style={{ color: 'var(--sb-text)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--sb-text-hover)';
              e.currentTarget.style.background = 'var(--sb-hover-bg)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--sb-text)';
              e.currentTarget.style.background = '';
            }}
          >
            <LogOut className="h-[18px] w-[18px] shrink-0 opacity-70" />
            {!collapsed && <span className="flex-1 truncate">Sair</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
};
