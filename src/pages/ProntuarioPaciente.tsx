import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Edit, Calendar, Phone, Mail, MapPin } from 'lucide-react';
import { AppointmentStatus } from '@/types';

const ProntuarioPaciente = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getPatientById,
    getAppointmentsByPatientId,
    getFeedbacksByPatientId,
    updatePatient,
    addAppointment,
    professionals,
  } = useClinic();

  const patient = id ? getPatientById(id) : undefined;
  const patientAppointments = id ? getAppointmentsByPatientId(id) : [];
  const feedbacks = id ? getFeedbacksByPatientId(id) : [];
  
  const futureAppointments = patientAppointments.filter(a => a.date >= new Date());

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [editData, setEditData] = useState(patient || { fullName: '', phone: '', email: '', notes: '' });
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
  });
  const [observations, setObservations] = useState(patient?.notes || '');

  if (!patient) {
    return (
      <div className="p-8">
        <Button variant="ghost" onClick={() => navigate('/pacientes')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <p className="text-muted-foreground">Paciente não encontrado.</p>
      </div>
    );
  }

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      updatePatient(id, editData);
      setIsEditOpen(false);
    }
  };

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id && patient) {
      const appointmentDate = new Date(appointmentData.date);
      const renataLyra = professionals.find(p => p.name === 'Renata Lyra');
      
      if (!renataLyra) return;
      
      addAppointment({
        patientId: id,
        patientName: patient.fullName,
        professionalId: renataLyra.id,
        date: appointmentDate,
        time: appointmentData.time,
        status: 'agendado',
        origin: patient.origin,
      });

      setAppointmentData({
        date: '',
        time: '',
      });
      setIsAppointmentOpen(false);
      navigate('/agendamentos');
    }
  };

  const handleSaveObservations = () => {
    if (id) {
      updatePatient(id, { notes: observations });
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      agendado: 'secondary',
      confirmado: 'default',
      realizado: 'outline',
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-6"
    >
      <Button variant="ghost" onClick={() => navigate('/pacientes')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para Pacientes
      </Button>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-2">
              <CardTitle className="text-2xl">{patient.fullName}</CardTitle>
              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  {patient.phone}
                </div>
                {patient.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {patient.email}
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <Badge variant="outline">{patient.origin}</Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditData(patient)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Editar Dados
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Editar Paciente</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div>
                      <Label>Nome Completo</Label>
                      <Input
                        value={editData.fullName}
                        onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>Telefone</Label>
                      <Input
                        value={editData.phone}
                        onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label>E-mail</Label>
                      <Input
                        value={editData.email || ''}
                        onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      />
                    </div>
                    <Button type="submit" className="w-full">Salvar</Button>
                  </form>
                </DialogContent>
              </Dialog>
              
              <Dialog open={isAppointmentOpen} onOpenChange={setIsAppointmentOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Agendar Consulta
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Agendar Consulta</DialogTitle>
                    <DialogDescription>
                      Criar um novo agendamento para {patient.fullName}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="appointmentDate">Data *</Label>
                      <Input
                        id="appointmentDate"
                        type="date"
                        value={appointmentData.date}
                        onChange={(e) => setAppointmentData({ ...appointmentData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="appointmentTime">Horário *</Label>
                      <Input
                        id="appointmentTime"
                        type="time"
                        value={appointmentData.time}
                        onChange={(e) => setAppointmentData({ ...appointmentData, time: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full">Agendar</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="appointments" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="appointments">Agendamentos</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <h3 className="text-lg font-semibold">Agendamentos Futuros</h3>
          <div className="space-y-3">
            {futureAppointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum agendamento futuro.</p>
            ) : (
              futureAppointments.map((appointment) => (
                <Card key={appointment.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">Consulta Agendada</h4>
                          {getStatusBadge(appointment.status)}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {appointment.date.toLocaleDateString('pt-BR', { 
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })} às {appointment.time}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Origem: {appointment.origin}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <h3 className="text-lg font-semibold">Prontuário Livre</h3>
          <Card>
            <CardContent className="pt-6">
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observações odontológicas, histórico de tratamentos, alergias, notas clínicas..."
                rows={10}
                className="mb-4"
              />
              <Button onClick={handleSaveObservations}>Salvar Observações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ProntuarioPaciente;
