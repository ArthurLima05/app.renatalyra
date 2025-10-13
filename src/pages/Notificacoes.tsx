import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Calendar, X, MessageSquare, FileText, DollarSign, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationType } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Notificacoes() {
  const { notifications, markNotificationRead, deleteNotification } = useClinic();
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'agendamento':
      case 'lembrete_consulta':
        return <Calendar className="h-5 w-5 text-primary" />;
      case 'cancelamento':
      case 'falta':
        return <X className="h-5 w-5 text-destructive" />;
      case 'feedback':
      case 'lembrete_feedback':
        return <MessageSquare className="h-5 w-5 text-primary" />;
      case 'lembrete_prontuario':
        return <FileText className="h-5 w-5 text-primary" />;
      case 'lembrete_pagamento':
        return <DollarSign className="h-5 w-5 text-yellow-500" />;
      default:
        return <Bell className="h-5 w-5 text-primary" />;
    }
  };

  const getActionButton = (notification: any) => {
    switch (notification.type) {
      case 'lembrete_prontuario':
        if (notification.patientId) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/prontuario/${notification.patientId}`)}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ir ao Prontuário
            </Button>
          );
        }
        break;
      case 'lembrete_pagamento':
        if (notification.patientId) {
          return (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/prontuario/${notification.patientId}`)}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Ver Pagamentos
            </Button>
          );
        }
        break;
      case 'lembrete_feedback':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/feedbacks')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Solicitar Feedback
          </Button>
        );
      case 'lembrete_consulta':
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/agendamentos')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Ver Agendamentos
          </Button>
        );
    }
    return null;
  };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setDeleteConfirmId(null);
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
                    <div className="bg-primary/10 p-2 rounded-lg shrink-0">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold">{notification.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {notification.date.toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getActionButton(notification)}
                          {!notification.read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markNotificationRead(notification.id)}
                            >
                              Marcar como lida
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(notification.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A notificação será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
