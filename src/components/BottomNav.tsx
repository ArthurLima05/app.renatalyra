import { NavLink } from 'react-router-dom';
import { Calendar, UserCircle, Bell, LayoutDashboard, Menu } from 'lucide-react';
import { useClinic } from '@/contexts/ClinicContext';
import { cn } from '@/lib/utils';

const ITEMS = [
  { to: '/',             label: 'Agenda',    icon: Calendar,        end: true  },
  { to: '/pacientes',    label: 'Pacientes', icon: UserCircle,      end: false },
  { to: '/notificacoes', label: 'Avisos',    icon: Bell,            end: false },
  { to: '/dashboard',    label: 'Dashboard', icon: LayoutDashboard, end: false },
];

interface BottomNavProps {
  onMenuOpen: () => void;
}

export function BottomNav({ onMenuOpen }: BottomNavProps) {
  const { notifications } = useClinic();
  const unread = notifications.filter(n => !n.read).length;

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 xl:hidden border-t border-primary/15"
      style={{
        paddingBottom: 'env(safe-area-inset-bottom)',
        background: 'hsl(var(--card) / 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 -1px 12px -2px hsl(40 20% 50% / 0.1)',
      }}
    >
      <div className="flex h-16">
        {ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className="flex flex-col items-center justify-center flex-1 min-w-0 relative"
          >
            {({ isActive }) => (
              <>
                {/* Pill de fundo no item ativo */}
                {isActive && (
                  <span className="absolute inset-x-2 inset-y-1.5 rounded-xl bg-primary/10" />
                )}

                <span className={cn(
                  'relative z-10 flex flex-col items-center gap-1 transition-all duration-150',
                  isActive ? 'text-primary scale-[1.05]' : 'text-muted-foreground'
                )}>
                  <span className="relative">
                    {item.to === '/notificacoes' && unread > 0 ? (
                      <>
                        <Bell className="h-5 w-5" />
                        <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                          {unread > 9 ? '9+' : unread}
                        </span>
                      </>
                    ) : (
                      <item.icon className="h-5 w-5" />
                    )}
                  </span>
                  <span className={cn(
                    'text-[10px] leading-none font-cocon tracking-[0.02em]',
                    isActive ? 'font-medium' : 'font-normal'
                  )}>
                    {item.label}
                  </span>
                </span>
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 text-muted-foreground active:text-primary transition-colors relative"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-cocon leading-none tracking-[0.02em]">Menu</span>
        </button>
      </div>
    </nav>
  );
}
