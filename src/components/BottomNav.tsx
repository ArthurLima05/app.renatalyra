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
      className="fixed bottom-0 inset-x-0 bg-card border-t border-border z-30 xl:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16">
        {ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 flex-1 min-w-0 relative transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="relative">
                  {item.to === '/notificacoes' && unread > 0 ? (
                    <>
                      <Bell className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
                      <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-0.5 leading-none">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    </>
                  ) : (
                    <item.icon className={cn('h-6 w-6 transition-transform', isActive && 'scale-110')} />
                  )}
                </span>
                <span className="text-[10px] font-medium leading-none truncate">{item.label}</span>
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
              </>
            )}
          </NavLink>
        ))}

        <button
          onClick={onMenuOpen}
          className="flex flex-col items-center justify-center gap-1 flex-1 min-w-0 text-muted-foreground transition-colors active:text-primary"
        >
          <Menu className="h-6 w-6" />
          <span className="text-[10px] font-medium leading-none">Menu</span>
        </button>
      </div>
    </nav>
  );
}
