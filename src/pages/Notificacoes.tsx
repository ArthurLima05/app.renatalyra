import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Calendar, X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationType } from '@/types';

export default function Notificacoes() {
  const { notifications, markNotificationRead } = useClinic();

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'agendamento':
        return <Calendar className="h-5 w-5 text-primary" />;
      case 'cancelamento':
      case 'falta':
        return <X className="h-5 w-5 text-destructive" />;
      case 'feedback':
        return <MessageSquare className="h-5 w-5 text-primary" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-foreground">Notificações</h1>
        <p className="text-muted-foreground">
          {notifications.filter(n => !n.read).length} notificações não lidas
        </p>
      </motion.div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma notificação no momento</p>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification, index) => (
            <motion.div
              key={notification.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className={notification.read ? 'opacity-60' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-2 rounded-lg">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{notification.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {notification.date.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markNotificationRead(notification.id)}
                          >
                            Marcar como lida
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
