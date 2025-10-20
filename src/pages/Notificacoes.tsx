import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Bell, Calendar, X, FileText, DollarSign, Trash2, ExternalLink, MoreVertical, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationType } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useState, useMemo } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

type TabValue = 'todas' | 'nao_lidas' | 'urgentes' | 'historico';
type DateGroup = 'hoje' | 'ontem' | 'esta_semana' | 'mais_antigas';

export default function Notificacoes() {
  const { notifications, markNotificationRead, deleteNotification } = useClinic();
  const navigate = useNavigate();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('todas');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const isUrgent = (notification: any): boolean => {
    const now = new Date();
    const notifDate = new Date(notification.date);
    const hoursDiff = (now.getTime() - notifDate.getTime()) / (1000 * 60 * 60);

    // Notificações de remarcação são sempre urgentes
    if (notification.title?.includes('Solicitação de Remarcação')) {
      return true;
    }

    switch (notification.type) {
      case 'cancelamento':
        return hoursDiff < 24;
      case 'lembrete_pagamento':
        return true;
      default:
        return false;
    }
  };

  const getDateGroup = (date: Date): DateGroup => {
    const now = new Date();
    const notifDate = new Date(date);
    
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const notifDay = new Date(notifDate.getFullYear(), notifDate.getMonth(), notifDate.getDate());

    if (notifDay.getTime() === today.getTime()) return 'hoje';
    if (notifDay.getTime() === yesterday.getTime()) return 'ontem';
    if (notifDate >= weekAgo) return 'esta_semana';
    return 'mais_antigas';
  };

  const dateGroupLabels: Record<DateGroup, string> = {
    hoje: 'Hoje',
    ontem: 'Ontem',
    esta_semana: 'Esta semana',
    mais_antigas: 'Mais antigas'
  };

  const filteredNotifications = useMemo(() => {
    let filtered = [...notifications];

    // Filtro por aba
    if (activeTab === 'nao_lidas') {
      filtered = filtered.filter(n => !n.read);
    } else if (activeTab === 'urgentes') {
      filtered = filtered.filter(n => isUrgent(n));
    } else if (activeTab === 'historico') {
      filtered = filtered.filter(n => n.read);
    }

    // Filtro por data (apenas no histórico)
    if (activeTab === 'historico' && (dateFrom || dateTo)) {
      filtered = filtered.filter(n => {
        const d = new Date(n.date);
        const dayOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const from = dateFrom ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()) : null;
        const to = dateTo ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate()) : null;
        if (from && !to) return dayOnly.getTime() === from.getTime();
        if (!from && to) return dayOnly.getTime() === to.getTime();
        if (from && to) return dayOnly >= from && dayOnly <= to;
        return true;
      });
    }

    // Ordenar: urgentes primeiro, depois por data
    filtered.sort((a, b) => {
      const aUrgent = isUrgent(a);
      const bUrgent = isUrgent(b);
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    return filtered;
  }, [notifications, activeTab, dateFrom, dateTo]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<DateGroup, typeof notifications> = {
      hoje: [],
      ontem: [],
      esta_semana: [],
      mais_antigas: []
    };

    filteredNotifications.forEach(notif => {
      const group = getDateGroup(notif.date);
      groups[group].push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'agendamento':
      case 'lembrete_consulta':
        return <Calendar className="h-5 w-5 text-primary" />;
      case 'cancelamento':
      case 'falta':
        return <X className="h-5 w-5 text-destructive" />;
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
                  className="gap-2 text-xs w-full sm:w-auto"
                >
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Ir ao Prontuário</span>
                  <span className="sm:hidden">Prontuário</span>
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
                  className="gap-2 text-xs w-full sm:w-auto"
                >
                  <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Ver Pagamentos</span>
                  <span className="sm:hidden">Pagamentos</span>
                </Button>
              );
            }
            break;
          case 'lembrete_consulta':
            return (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/agendamentos')}
                className="gap-2 text-xs w-full sm:w-auto"
              >
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Ver Agendamentos</span>
                <span className="sm:hidden">Agendamentos</span>
              </Button>
            );
        }
        return null;
      };

  const handleDelete = async (id: string) => {
    await deleteNotification(id);
    setDeleteConfirmId(null);
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map(n => n.id)));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleBulkMarkAsRead = async () => {
    for (const id of selectedIds) {
      await markNotificationRead(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      await deleteNotification(id);
    }
    setSelectedIds(new Set());
  };

  const handleMarkAllAsRead = async () => {
    for (const notif of filteredNotifications) {
      if (!notif.read) {
        await markNotificationRead(notif.id);
      }
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;
  const urgentCount = notifications.filter(n => isUrgent(n)).length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="space-y-2"
      >
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Notificações</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          {unreadCount} não lidas · {urgentCount} urgentes
        </p>
      </motion.div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className="w-full">
        <div className="w-full overflow-x-auto pb-2 -mx-2 px-2">
          <TabsList className="grid w-full min-w-[400px] sm:min-w-0 grid-cols-4 h-auto">
            <TabsTrigger value="todas" className="text-xs sm:text-sm py-2.5">Todas</TabsTrigger>
            <TabsTrigger value="nao_lidas" className="text-xs sm:text-sm py-2.5 flex items-center gap-1">
              <span className="hidden sm:inline">Não lidas</span>
              <span className="sm:hidden">Não lidas</span>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">{unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="urgentes" className="text-xs sm:text-sm py-2.5 flex items-center gap-1">
              Urgentes
              {urgentCount > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 px-1">{urgentCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="historico" className="text-xs sm:text-sm py-2.5">Histórico</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={activeTab} className="space-y-4 mt-6">
          {/* Filtro por data (somente no Histórico) */}
          {activeTab === 'historico' && (
            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start w-full sm:w-auto">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateFrom ? dateFrom.toLocaleDateString('pt-BR') : 'Data início'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFrom}
                    onSelect={(d) => setDateFrom(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start w-full sm:w-auto">
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateTo ? dateTo.toLocaleDateString('pt-BR') : 'Data fim'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateTo}
                    onSelect={(d) => setDateTo(d)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }} className="w-full sm:w-auto">
                  Limpar filtro
                </Button>
              )}
            </div>
          )}

          {/* Ações em massa */}
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-primary/10 rounded-lg border border-primary/20"
            >
              <span className="text-xs sm:text-sm font-medium">
                {selectedIds.size} selecionada(s)
              </span>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button onClick={handleBulkMarkAsRead} size="sm" variant="outline" className="w-full sm:w-auto">
                  Marcar como lidas
                </Button>
                <Button onClick={handleBulkDelete} size="sm" variant="destructive" className="w-full sm:w-auto">
                  Excluir selecionadas
                </Button>
                <Button onClick={() => setSelectedIds(new Set())} size="sm" variant="ghost" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </div>
            </motion.div>
          )}

          {/* Seleção em massa */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.size === filteredNotifications.length && filteredNotifications.length > 0}
                onCheckedChange={handleSelectAll}
                id="select-all"
                className="h-5 w-5"
              />
              <label htmlFor="select-all" className="text-sm text-muted-foreground cursor-pointer">
                Selecionar todas ({filteredNotifications.length})
              </label>
            </div>
          )}

          {/* Notificações agrupadas */}
          {filteredNotifications.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {(Object.keys(groupedNotifications) as DateGroup[]).map(group => {
                const notifs = groupedNotifications[group];
                if (notifs.length === 0) return null;

                return (
                  <div key={group} className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                      {dateGroupLabels[group]}
                    </h3>
                    {notifs.map((notification, index) => {
                      const urgent = isUrgent(notification);
                      const isSelected = selectedIds.has(notification.id);

                      return (
                        <motion.div
                          key={notification.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                        >
                          <Card 
                            className={`
                              ${notification.read ? 'opacity-60' : ''} 
                              ${urgent ? 'border-destructive/50 bg-destructive/5' : ''}
                              ${isSelected ? 'ring-2 ring-primary' : ''}
                            `}
                          >
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
                                <div className="flex items-start gap-3 w-full">
                                  <div className="flex items-center pt-1">
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleToggleSelect(notification.id)}
                                      className="h-4 w-4 sm:h-5 sm:w-5"
                                    />
                                  </div>
                                  
                                  <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
                                    {getNotificationIcon(notification.type)}
                                  </div>
                                  
                                  <div className="flex-1 min-w-0">
                                    <div className="flex flex-col gap-2">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                                            <h3 className="text-sm sm:text-base font-semibold break-words">{notification.title}</h3>
                                            {urgent && (
                                              <Badge variant="destructive" className="text-[10px] sm:text-xs">
                                                URGENTE
                                              </Badge>
                                            )}
                                            {!notification.read && (
                                              <Badge variant="default" className="text-[10px] sm:text-xs">
                                                Nova
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 break-words">
                                            {notification.message}
                                          </p>
                                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-2">
                                            {notification.date.toLocaleString('pt-BR', { 
                                              day: '2-digit', 
                                              month: '2-digit', 
                                              year: 'numeric', 
                                              hour: '2-digit', 
                                              minute: '2-digit' 
                                            })}
                                          </p>
                                        </div>
                                        
                                        <DropdownMenu>
                                          <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                                              <MoreVertical className="h-4 w-4" />
                                            </Button>
                                          </DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                            {!notification.read && (
                                              <DropdownMenuItem onClick={() => markNotificationRead(notification.id)}>
                                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                                Marcar como lida
                                              </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem 
                                              onClick={() => setDeleteConfirmId(notification.id)}
                                              className="text-destructive"
                                            >
                                              <Trash2 className="h-4 w-4 mr-2" />
                                              Excluir
                                            </DropdownMenuItem>
                                          </DropdownMenuContent>
                                        </DropdownMenu>
                                      </div>
                                      
                                      <div className="flex items-center gap-2">
                                        {getActionButton(notification)}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
