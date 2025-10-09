import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar as CalendarIcon, Search, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentStatus } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DateFilter = 'dia' | 'semana' | 'mes' | 'ano';

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
  const [dateFilter, setDateFilter] = useState<DateFilter>('dia');
  const [searchOpen, setSearchOpen] = useState(false);
  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
  });

  const selectedPatient = patients.find(p => p.id === formData.patientId);

  const filteredAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return appointments.filter(app => {
      const appDate = new Date(app.date);
      const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      
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
  }, [appointments, dateFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient || !formData.patientId) return;

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
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Nova Consulta</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Nova Consulta</DialogTitle>
              <DialogDescription>Selecione um paciente cadastrado para agendar a consulta</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label>Paciente</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      {formData.patientId ? patients.find(p => p.id === formData.patientId)?.fullName : 'Selecione o paciente'}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar paciente..." />
                      <CommandList>
                        <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem key={patient.id} value={patient.fullName} onSelect={() => { setFormData({ ...formData, patientId: patient.id }); setSearchOpen(false); }}>
                              {patient.fullName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label htmlFor="date">Data</Label><Input id="date" type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} required /></div>
                <div><Label htmlFor="time">Horário</Label><Input id="time" type="time" value={formData.time} onChange={(e) => setFormData({ ...formData, time: e.target.value })} required /></div>
              </div>
              <Button type="submit" className="w-full" disabled={!formData.patientId}>Agendar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
      <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="dia">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Esta Semana</TabsTrigger>
          <TabsTrigger value="mes">Este Mês</TabsTrigger>
          <TabsTrigger value="ano">Este Ano</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="grid gap-4">
        {filteredAppointments.map((appointment, index) => {
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
        {filteredAppointments.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado para este período.</p>}
      </div>
    </div>
  );
}
