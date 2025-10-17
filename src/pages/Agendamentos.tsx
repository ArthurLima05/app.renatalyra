import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar as CalendarIcon, Search, Trash2, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AppointmentStatus } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type DateFilter = 'dia' | 'semana' | 'mes' | 'ano';
type MainTab = 'agendamentos' | 'historico';

export default function Agendamentos() {
  const navigate = useNavigate();
  const { 
    appointments, 
    patients, 
    addAppointment, 
    updateAppointmentStatus,
    deleteAppointment,
    getSuggestedSessionsByPatientId,
    linkAppointmentToSession,
    addSession,
    professionals,
  } = useClinic();
  
  const [isOpen, setIsOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>('agendamentos');
  const [dateFilter, setDateFilter] = useState<DateFilter>('dia');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
  });
  
  // Filtros do histórico
  const [historyFilters, setHistoryFilters] = useState({
    patientName: '',
    date: '',
    time: '',
    status: 'all' as AppointmentStatus | 'all',
  });

  const selectedPatient = patients.find(p => p.id === formData.patientId);

  // Agendamentos ativos (hoje ou futuros)
  const activeAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return appointments.filter(app => {
      const appDate = new Date(app.date);
      const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      
      // Apenas agendamentos de hoje ou futuros
      if (appDay < today) return false;
      
      // Se tem data personalizada, filtrar por ela
      if (customDate) {
        const customDay = new Date(customDate.getFullYear(), customDate.getMonth(), customDate.getDate());
        return appDay.getTime() === customDay.getTime();
      }
      
      switch (dateFilter) {
        case 'dia':
          return appDay.getTime() === today.getTime();
        case 'semana':
          const weekStart = new Date(today);
          weekStart.setDate(today.getDate() - today.getDay());
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);
          return appDay >= weekStart && appDay <= weekEnd;
        case 'mes':
          return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
        case 'ano':
          return appDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  }, [appointments, dateFilter, customDate]);

  // Histórico (agendamentos passados)
  const historyAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return appointments.filter(app => {
      const appDate = new Date(app.date);
      const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      
      // Apenas agendamentos passados
      if (appDay >= today) return false;
      
      // Aplicar filtros
      if (historyFilters.patientName && !app.patientName.toLowerCase().includes(historyFilters.patientName.toLowerCase())) {
        return false;
      }
      
      if (historyFilters.date) {
        const filterDate = new Date(historyFilters.date);
        const filterDay = new Date(filterDate.getFullYear(), filterDate.getMonth(), filterDate.getDate());
        if (appDay.getTime() !== filterDay.getTime()) return false;
      }
      
      if (historyFilters.time && app.time !== historyFilters.time) {
        return false;
      }
      
      if (historyFilters.status && historyFilters.status !== 'all' && app.status !== historyFilters.status) {
        return false;
      }
      
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, historyFilters]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !formData.patientId || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const appointmentDate = new Date(formData.date);
      const renataLyra = professionals.find(p => p.name === 'Renata Lyra');
      
      if (!renataLyra) return;
      
      await addAppointment({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        professionalId: renataLyra.id,
        date: appointmentDate,
        time: formData.time,
        status: 'agendado',
        origin: selectedPatient.origin,
      });
      
      setIsOpen(false);
      setFormData({ patientId: '', date: '', time: '' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      agendado: 'outline', confirmado: 'default', realizado: 'secondary',
      cancelado: 'destructive', falta: 'destructive', sugerido: 'outline',
    };
    const labels: Record<AppointmentStatus, string> = {
      agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado',
      cancelado: 'Cancelado', falta: 'Falta', sugerido: 'Sugerido',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie todas as consultas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
...
        </Dialog>
      </motion.div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="agendamentos" className="space-y-6 mt-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Ocultar Filtros' : 'Filtros'}
            </Button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex items-center gap-2 flex-wrap p-4 bg-muted/50 rounded-lg">
                <Button
                  variant={dateFilter === 'dia' && !customDate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDateFilter('dia');
                    setCustomDate(undefined);
                  }}
                  className="rounded-full"
                >
                  Hoje
                </Button>
                <Button
                  variant={dateFilter === 'semana' && !customDate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDateFilter('semana');
                    setCustomDate(undefined);
                  }}
                  className="rounded-full"
                >
                  Esta Semana
                </Button>
                <Button
                  variant={dateFilter === 'mes' && !customDate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setDateFilter('mes');
                    setCustomDate(undefined);
                  }}
                  className="rounded-full"
                >
                  Este Mês
                </Button>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={customDate ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-full"
                    >
                      {customDate ? format(customDate, "dd/MM/yyyy", { locale: ptBR }) : 'Data Personalizada'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customDate}
                      onSelect={(date) => {
                        setCustomDate(date);
                        setDateFilter('dia');
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>

                {customDate && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCustomDate(undefined);
                      setDateFilter('dia');
                    }}
                    className="rounded-full"
                  >
                    Limpar
                  </Button>
                )}
              </div>
            </motion.div>
          )}
          
          <div className="grid gap-4">
            {activeAppointments.map((appointment, index) => {
          const patient = patients.find(p => p.id === appointment.patientId);
          return (
            <motion.div key={appointment.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0"><CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-base sm:text-lg truncate cursor-pointer hover:text-primary transition-colors" onClick={() => patient && navigate(`/pacientes/${patient.id}`)}>{appointment.patientName}</h3>
                        <p className="text-xs sm:text-sm mt-1">{appointment.date.toLocaleDateString('pt-BR')} às {appointment.time}</p>
                        <p className="text-xs text-muted-foreground mt-1">Origem: {appointment.origin}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                      <Select value={appointment.status} onValueChange={(value) => updateAppointmentStatus(appointment.id, value as AppointmentStatus)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendado">Agendado</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="realizado">Realizado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o agendamento de {appointment.patientName}? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteAppointment(appointment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            );
          })}
          {activeAppointments.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado para este período.</p>}
          </div>
        </TabsContent>

        <TabsContent value="historico" className="space-y-6 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="filter-patient">Nome do Paciente</Label>
                  <Input 
                    id="filter-patient"
                    placeholder="Buscar por nome..."
                    value={historyFilters.patientName}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, patientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="filter-date">Data</Label>
                  <Input 
                    id="filter-date"
                    type="date"
                    value={historyFilters.date}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="filter-time">Horário</Label>
                  <Input 
                    id="filter-time"
                    type="time"
                    value={historyFilters.time}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, time: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="filter-status">Status</Label>
                  <Select 
                    value={historyFilters.status} 
                    onValueChange={(value) => setHistoryFilters({ ...historyFilters, status: value as AppointmentStatus | 'all' })}
                  >
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="agendado">Agendado</SelectItem>
                      <SelectItem value="confirmado">Confirmado</SelectItem>
                      <SelectItem value="realizado">Realizado</SelectItem>
                      <SelectItem value="cancelado">Cancelado</SelectItem>
                      <SelectItem value="falta">Falta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(historyFilters.patientName || historyFilters.date || historyFilters.time || historyFilters.status !== 'all') && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-4"
                  onClick={() => setHistoryFilters({ patientName: '', date: '', time: '', status: 'all' })}
                >
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4">
            {historyAppointments.map((appointment, index) => {
              const patient = patients.find(p => p.id === appointment.patientId);
              return (
                <motion.div key={appointment.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                  <Card>
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-3 sm:gap-4 flex-1">
                          <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0"><CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /></div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-base sm:text-lg truncate cursor-pointer hover:text-primary transition-colors" onClick={() => patient && navigate(`/pacientes/${patient.id}`)}>{appointment.patientName}</h3>
                            <p className="text-xs sm:text-sm mt-1">{appointment.date.toLocaleDateString('pt-BR')} às {appointment.time}</p>
                            <p className="text-xs text-muted-foreground mt-1">Origem: {appointment.origin}</p>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                          {getStatusBadge(appointment.status)}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o agendamento de {appointment.patientName}? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteAppointment(appointment.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
            {historyAppointments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {historyFilters.patientName || historyFilters.date || historyFilters.time || historyFilters.status !== 'all'
                  ? 'Nenhum agendamento encontrado com os filtros aplicados.' 
                  : 'Nenhum agendamento no histórico.'}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
