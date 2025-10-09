import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Edit, Calendar, Plus, Phone, Mail, MapPin, Trash2 } from 'lucide-react';
import { AppointmentStatus, PaymentStatus } from '@/types';

const ProntuarioPaciente = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    getPatientById,
    getSessionsByPatientId,
    getTransactionsByPatientId,
    getFeedbacksByPatientId,
    updatePatient,
    addSession,
    updateSession,
    deleteSession,
    addAppointment,
  } = useClinic();

  const patient = id ? getPatientById(id) : undefined;
  const sessions = id ? getSessionsByPatientId(id) : [];
  const transactions = id ? getTransactionsByPatientId(id) : [];
  const feedbacks = id ? getFeedbacksByPatientId(id) : [];

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [editData, setEditData] = useState(patient || { fullName: '', phone: '', email: '', notes: '' });
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState({
    date: '',
    type: '',
    sessionTypeSelection: '' as 'primeira_consulta' | 'retorno' | 'outra' | '',
    customType: '',
    notes: '',
    amount: '',
    paymentStatus: 'em_aberto' as PaymentStatus,
    nextAppointment: '',
  });
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

  const handleSessionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id) {
      if (editingSessionId) {
        // Editar sessão existente
        updateSession(editingSessionId, {
          date: new Date(sessionData.date),
          type: sessionData.type,
          notes: sessionData.notes,
          amount: parseFloat(sessionData.amount),
          paymentStatus: sessionData.paymentStatus,
          nextAppointment: sessionData.nextAppointment ? new Date(sessionData.nextAppointment) : undefined,
        });
      } else {
        // Determinar o tipo de sessão baseado na seleção do usuário
        let sessionType: 'primeira_consulta' | 'retorno' | 'consulta_avulsa';
        if (sessionData.sessionTypeSelection === 'outra') {
          sessionType = 'consulta_avulsa';
        } else {
          sessionType = sessionData.sessionTypeSelection as 'primeira_consulta' | 'retorno';
        }
        
        // Adicionar nova sessão
        addSession({
          patientId: id,
          date: new Date(sessionData.date),
          type: sessionData.sessionTypeSelection === 'outra' ? sessionData.customType : sessionData.type,
          sessionType: sessionType,
          status: 'realizado',
          notes: sessionData.notes,
          amount: parseFloat(sessionData.amount),
          paymentStatus: sessionData.paymentStatus,
          nextAppointment: sessionData.nextAppointment ? new Date(sessionData.nextAppointment) : undefined,
        });
      }
      setSessionData({
        date: '',
        type: '',
        sessionTypeSelection: '',
        customType: '',
        notes: '',
        amount: '',
        paymentStatus: 'em_aberto',
        nextAppointment: '',
      });
      setEditingSessionId(null);
      setIsSessionOpen(false);
    }
  };

  const handleEditSession = (session: any) => {
    setEditingSessionId(session.id);
    setSessionData({
      date: session.date.toISOString().split('T')[0],
      type: session.type,
      sessionTypeSelection: '',
      customType: '',
      notes: session.notes || '',
      amount: session.amount.toString(),
      paymentStatus: session.paymentStatus,
      nextAppointment: session.nextAppointment ? session.nextAppointment.toISOString().split('T')[0] : '',
    });
    setIsSessionOpen(true);
  };

  const handleDeleteSession = async () => {
    if (deletingSessionId) {
      await deleteSession(deletingSessionId);
      setDeletingSessionId(null);
    }
  };

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id && patient) {
      const appointmentDate = new Date(appointmentData.date);
      
      addAppointment({
        patientId: id,
        patientName: patient.fullName,
        professionalId: 'renata-lyra',
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

  const totalPaid = sessions
    .filter(s => s.paymentStatus === 'pago')
    .reduce((sum, s) => sum + s.amount, 0);

  const totalPending = sessions
    .filter(s => s.paymentStatus === 'em_aberto')
    .reduce((sum, s) => sum + s.amount, 0);

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
      sugerido: '',
    };
    return status === 'sugerido' ? null : <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const getPaymentBadge = (status: PaymentStatus) => {
    return (
      <Badge variant={status === 'pago' ? 'default' : 'destructive'}>
        {status === 'pago' ? 'Pago' : 'Em aberto'}
      </Badge>
    );
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

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="sessions">Histórico</TabsTrigger>
          <TabsTrigger value="financial">Financeiro</TabsTrigger>
          <TabsTrigger value="feedbacks">Feedbacks</TabsTrigger>
          <TabsTrigger value="notes">Observações</TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Histórico de Sessões</h3>
            <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => {
                  setEditingSessionId(null);
                  setSessionData({
                    date: '',
                    type: '',
                    sessionTypeSelection: '',
                    customType: '',
                    notes: '',
                    amount: '',
                    paymentStatus: 'em_aberto',
                    nextAppointment: '',
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Sessão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSessionId ? 'Editar Sessão' : 'Nova Sessão'}</DialogTitle>
                  <DialogDescription>
                    {editingSessionId ? 'Editar os dados da sessão' : 'Adicionar uma nova sessão com data sugerida para retorno'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSessionSubmit} className="space-y-4">
                  <div>
                    <Label>Data da Sessão Realizada *</Label>
                    <Input
                      type="date"
                      value={sessionData.date}
                      onChange={(e) => setSessionData({ ...sessionData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label>Tipo de Sessão *</Label>
                    <Select 
                      value={sessionData.sessionTypeSelection} 
                      onValueChange={(value: 'primeira_consulta' | 'retorno' | 'outra') => 
                        setSessionData({ ...sessionData, sessionTypeSelection: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="primeira_consulta">Primeira Consulta</SelectItem>
                        <SelectItem value="retorno">Retorno</SelectItem>
                        <SelectItem value="outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {sessionData.sessionTypeSelection === 'outra' ? (
                    <div>
                      <Label>Especifique o Título do Atendimento *</Label>
                      <Input
                        value={sessionData.customType}
                        onChange={(e) => setSessionData({ ...sessionData, customType: e.target.value })}
                        placeholder="Ex: Limpeza, Botox, Laser..."
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>Título do Atendimento *</Label>
                      <Input
                        value={sessionData.type}
                        onChange={(e) => setSessionData({ ...sessionData, type: e.target.value })}
                        placeholder="Ex: Limpeza, Botox, Laser..."
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label>Valor da Sessão *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={sessionData.amount}
                      onChange={(e) => setSessionData({ ...sessionData, amount: e.target.value })}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div>
                    <Label>Status de Pagamento *</Label>
                    <Select value={sessionData.paymentStatus} onValueChange={(value: PaymentStatus) => setSessionData({ ...sessionData, paymentStatus: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pago">Pago</SelectItem>
                        <SelectItem value="em_aberto">Em aberto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Comentários da Doutora</Label>
                    <Textarea
                      value={sessionData.notes}
                      onChange={(e) => setSessionData({ ...sessionData, notes: e.target.value })}
                      placeholder="Observações sobre o procedimento..."
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label>Próxima Data Sugerida</Label>
                    <Input
                      type="date"
                      value={sessionData.nextAppointment}
                      onChange={(e) => setSessionData({ ...sessionData, nextAppointment: e.target.value })}
                    />
                  </div>
                  <Button type="submit" className="w-full">Salvar Sessão</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma sessão registrada ainda.</p>
            ) : (
              sessions.map((session) => {
                const sessionTypeLabels = {
                  primeira_consulta: 'Primeira Consulta',
                  consulta_avulsa: 'Consulta Avulsa',
                  retorno: 'Retorno'
                };
                
                return (
                  <Card key={session.id}>
                    <CardContent className="pt-6">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold">{session.type}</h4>
                            <Badge variant="secondary">{sessionTypeLabels[session.sessionType]}</Badge>
                            {getStatusBadge(session.status)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {session.date.toLocaleDateString('pt-BR', { 
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {session.notes && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">{session.notes}</p>
                          )}
                          {session.nextAppointment && (
                            <p className="text-sm text-primary font-medium">
                              Próxima consulta sugerida: {session.nextAppointment.toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditSession(session)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setDeletingSessionId(session.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <AlertDialog open={!!deletingSessionId} onOpenChange={(open) => !open && setDeletingSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Sessão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir esta sessão? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteSession}>Excluir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">R$ {totalPaid.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">R$ {totalPending.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-lg font-semibold mt-6">Transações</h3>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma transação registrada.</p>
            ) : (
              sessions.map((session) => (
                <Card key={session.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-medium">{session.type}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.date.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="text-right space-y-2">
                        <p className="text-xl font-bold">R$ {session.amount.toFixed(2)}</p>
                        {getPaymentBadge(session.paymentStatus)}
                        {session.paymentStatus === 'em_aberto' && session.amount > 0 && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              if (id) {
                                updateSession(session.id, { paymentStatus: 'pago' });
                              }
                            }}
                          >
                            Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="feedbacks" className="space-y-4">
          <h3 className="text-lg font-semibold">Feedbacks do Paciente</h3>
          <div className="space-y-3">
            {feedbacks.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum feedback registrado ainda.</p>
            ) : (
              feedbacks.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex gap-1">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className="text-xl">
                            {i < feedback.rating ? '★' : '☆'}
                          </span>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {feedback.date.toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <p className="text-sm">{feedback.comment}</p>
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
