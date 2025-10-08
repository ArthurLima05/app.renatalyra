import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AppointmentStatus } from '@/types';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

type DateFilter = 'dia' | 'semana' | 'mes';

export default function Agendamentos() {
  const navigate = useNavigate();
  const { 
    appointments, 
    patients, 
    addAppointment, 
    updateAppointmentStatus,
    getSuggestedSessionsByPatientId,
    linkAppointmentToSession,
    addSession
  } = useClinic();
  
  const [isOpen, setIsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>('dia');
  const [formData, setFormData] = useState({
    patientId: '',
    date: '',
    time: '',
    linkType: 'avulsa' as 'avulsa' | 'sessao',
    sessionId: '',
  });

  const selectedPatient = patients.find(p => p.id === formData.patientId);
  const suggestedSessions = selectedPatient ? getSuggestedSessionsByPatientId(selectedPatient.id) : [];

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
        default:
          return true;
      }
    });
  }, [appointments, dateFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) return;

    const appointmentDate = new Date(formData.date);
    
    if (formData.linkType === 'sessao' && formData.sessionId) {
      // Vincular a uma sessão sugerida
      linkAppointmentToSession(formData.sessionId, appointmentDate, formData.time);
      
      addAppointment({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        professionalId: 'renata-lyra',
        date: appointmentDate,
        time: formData.time,
        status: 'agendado',
        origin: selectedPatient.origin,
        sessionId: formData.sessionId,
      });
    } else {
      // Consulta avulsa
      const patientSessions = appointments.filter(a => a.patientId === selectedPatient.id);
      const sessionType = patientSessions.length === 0 ? 'primeira_consulta' : 'consulta_avulsa';
      
      addAppointment({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        professionalId: 'renata-lyra',
        date: appointmentDate,
        time: formData.time,
        status: 'agendado',
        origin: selectedPatient.origin,
      });

      // Criar sessão automaticamente
      addSession({
        patientId: selectedPatient.id,
        date: appointmentDate,
        type: sessionType === 'primeira_consulta' ? 'Primeira Consulta' : 'Consulta',
        sessionType,
        status: 'agendado',
        amount: 0,
        paymentStatus: 'em_aberto',
      });
    }
    
    setIsOpen(false);
    setFormData({
      patientId: '',
      date: '',
      time: '',
      linkType: 'avulsa',
      sessionId: '',
    });
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      agendado: 'outline',
      confirmado: 'default',
      realizado: 'secondary',
      cancelado: 'destructive',
      falta: 'destructive',
      sugerido: 'outline',
    };
    const labels: Record<AppointmentStatus, string> = {
      agendado: 'Agendado',
      confirmado: 'Confirmado',
      realizado: 'Realizado',
      cancelado: 'Cancelado',
      falta: 'Falta',
      sugerido: 'Sugerido',
    };
    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie todas as consultas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Consulta
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Nova Consulta</DialogTitle>
              <DialogDescription>
                Selecione um paciente cadastrado para agendar a consulta
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="patientId">Paciente *</Label>
                <Select
                  value={formData.patientId}
                  onValueChange={(value) => setFormData({ ...formData, patientId: value, sessionId: '' })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o paciente" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((patient) => (
                      <SelectItem key={patient.id} value={patient.id}>
                        {patient.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {suggestedSessions.length > 0 && (
                <div>
                  <Label>Tipo de Agendamento</Label>
                  <RadioGroup
                    value={formData.linkType}
                    onValueChange={(value: 'avulsa' | 'sessao') => setFormData({ ...formData, linkType: value })}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="avulsa" id="avulsa" />
                      <Label htmlFor="avulsa" className="font-normal cursor-pointer">
                        Consulta Avulsa
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sessao" id="sessao" />
                      <Label htmlFor="sessao" className="font-normal cursor-pointer">
                        Vincular a Sessão Sugerida
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {formData.linkType === 'sessao' && suggestedSessions.length > 0 && (
                <div>
                  <Label htmlFor="sessionId">Sessão Sugerida *</Label>
                  <Select
                    value={formData.sessionId}
                    onValueChange={(value) => setFormData({ ...formData, sessionId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a sessão" />
                    </SelectTrigger>
                    <SelectContent>
                      {suggestedSessions.map((session) => (
                        <SelectItem key={session.id} value={session.id}>
                          {session.type} - Sugerida para {session.nextAppointment?.toLocaleDateString('pt-BR') || 'data a definir'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="time">Horário *</Label>
                  <Input
                    id="time"
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    required
                  />
                </div>
              </div>
              <Button type="submit" className="w-full">Agendar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs value={dateFilter} onValueChange={(v) => setDateFilter(v as DateFilter)}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="dia">Hoje</TabsTrigger>
          <TabsTrigger value="semana">Esta Semana</TabsTrigger>
          <TabsTrigger value="mes">Este Mês</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4">
        {filteredAppointments.map((appointment, index) => {
          const patient = patients.find(p => p.id === appointment.patientId);
          return (
            <motion.div
              key={appointment.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card>
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 sm:gap-4 flex-1">
                      <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                        <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 
                          className="font-semibold text-base sm:text-lg truncate cursor-pointer hover:text-primary transition-colors"
                          onClick={() => patient && navigate(`/pacientes/${patient.id}`)}
                        >
                          {appointment.patientName}
                        </h3>
                        <p className="text-xs sm:text-sm mt-1">
                          {appointment.date.toLocaleDateString('pt-BR')} às {appointment.time}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Origem: {appointment.origin}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 items-start sm:items-center lg:items-end">
                      {getStatusBadge(appointment.status)}
                      <Select
                        value={appointment.status}
                        onValueChange={(value) => updateAppointmentStatus(appointment.id, value as AppointmentStatus)}
                      >
                        <SelectTrigger className="w-full sm:w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="agendado">Agendado</SelectItem>
                          <SelectItem value="confirmado">Confirmado</SelectItem>
                          <SelectItem value="realizado">Realizado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                          <SelectItem value="falta">Falta</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        {filteredAppointments.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Nenhum agendamento encontrado para este período.
          </p>
        )}
      </div>
    </div>
  );
}
