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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ArrowLeft, Edit, Calendar, Plus, Phone, Mail, MapPin, Trash2, UserCircle, Save, Stethoscope, Camera, Images } from 'lucide-react';
import { Odontograma } from '@/components/Odontograma';
import { PatientPhotos } from '@/components/PatientPhotos';
import { SessionStatus, PaymentStatus, SessionType, PatientGender, MaritalStatus, PatientOrigin } from '@/types';
import { useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-0.5">
    <p className="text-xs text-muted-foreground">{label}</p>
    {children}
  </div>
);

const ProntuarioPaciente = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const {
    getPatientById,
    getSessionsByPatientId,
    getTransactionsByPatientId,
    updatePatient,
    deletePatient,
    addSession,
    updateSession,
    deleteSession,
    addAppointment,
    installments,
    updateInstallment,
    appointments,
    professionals,
    updatePatientAvatar,
  } = useClinic();

  const patient = id ? getPatientById(id) : undefined;
  const sessions = id ? getSessionsByPatientId(id) : [];
  const transactions = id ? getTransactionsByPatientId(id) : [];

  // Gera horários de 30 em 30 minutos das 8h às 18h
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 8; hour <= 18; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 18) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  // Verifica se um horário está ocupado
  const isTimeSlotOccupied = (date: string, time: string) => {
    if (!date) return false;
    const selectedDate = new Date(date);
    return appointments.some((app) => {
      const appDate = new Date(app.date);
      return (
        appDate.getFullYear() === selectedDate.getFullYear() &&
        appDate.getMonth() === selectedDate.getMonth() &&
        appDate.getDate() === selectedDate.getDate() &&
        app.time === time &&
        app.status !== 'cancelado'
      );
    });
  };

  const timeSlots = generateTimeSlots();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [cadastroData, setCadastroData] = useState({
    fullName: patient?.fullName ?? '',
    phone: patient?.phone ?? '',
    email: patient?.email ?? '',
    birthDate: patient?.birthDate ? format(patient.birthDate, 'yyyy-MM-dd') : '',
    nickname: patient?.nickname ?? '',
    gender: patient?.gender ?? '' as PatientGender | '',
    cpf: patient?.cpf ?? '',
    rg: patient?.rg ?? '',
    maritalStatus: patient?.maritalStatus ?? '' as MaritalStatus | '',
    education: patient?.education ?? '',
    origin: patient?.origin ?? 'Outro' as PatientOrigin,
    notes: patient?.notes ?? '',
  });
  const [cadastroDirty, setCadastroDirty] = useState(false);
  const [cadastroSaving, setCadastroSaving] = useState(false);

  const handleCadastroChange = (field: string, value: string) => {
    setCadastroData((prev) => ({ ...prev, [field]: value }));
    setCadastroDirty(true);
  };

  const handleCadastroSave = async () => {
    if (!id) return;
    setCadastroSaving(true);
    try {
      await updatePatient(id, {
        fullName: cadastroData.fullName,
        phone: cadastroData.phone,
        email: cadastroData.email || undefined,
        birthDate: cadastroData.birthDate ? new Date(cadastroData.birthDate) : undefined,
        nickname: cadastroData.nickname || undefined,
        gender: cadastroData.gender || undefined,
        cpf: cadastroData.cpf || undefined,
        rg: cadastroData.rg || undefined,
        maritalStatus: cadastroData.maritalStatus || undefined,
        education: cadastroData.education || undefined,
        origin: cadastroData.origin,
        notes: cadastroData.notes || undefined,
      });
      setCadastroDirty(false);
    } finally {
      setCadastroSaving(false);
    }
  };
  const [isSessionOpen, setIsSessionOpen] = useState(false);
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [editData, setEditData] = useState(patient || { fullName: '', phone: '', email: '', notes: '' });
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [sessionData, setSessionData] = useState({
    date: '',
    procedure: '',
    sessionTypeSelection: '' as 'primeira_consulta' | 'retorno' | 'outra' | '',
    customType: '',
    notes: '',
    amount: '',
    paymentStatus: 'em_aberto' as PaymentStatus,
    nextAppointment: '',
    installmentsCount: '',
    firstPaymentDate: '',
  });
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
  });
  const [observations, setObservations] = useState(patient?.notes || '');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

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
          date: new Date(sessionData.date + 'T12:00:00'),
          procedure: sessionData.procedure,
          notes: sessionData.notes,
          amount: parseFloat(sessionData.amount),
          paymentStatus: sessionData.paymentStatus,
          nextAppointment: sessionData.nextAppointment ? new Date(sessionData.nextAppointment) : undefined,
        });
      } else {
        // Determinar o tipo de sessão baseado na seleção do usuário
        let sessionType: SessionType;
        if (sessionData.sessionTypeSelection === 'outra') {
          sessionType = 'consulta_avulsa'; // Para "Outra", usar consulta_avulsa
        } else {
          sessionType = sessionData.sessionTypeSelection as 'primeira_consulta' | 'retorno';
        }
        
        // Adicionar nova sessão
        const finalNotes = sessionData.sessionTypeSelection === 'outra' && sessionData.customType
          ? `Tipo de sessão: ${sessionData.customType}\n\n${sessionData.notes}`
          : sessionData.notes;
        
        addSession({
          patientId: id,
          date: new Date(sessionData.date + 'T12:00:00'),
          procedure: sessionData.procedure,
          sessionType: sessionType,
          status: 'realizado',
          notes: finalNotes,
          amount: parseFloat(sessionData.amount),
          paymentStatus: sessionData.paymentStatus,
          nextAppointment: sessionData.nextAppointment ? new Date(sessionData.nextAppointment) : undefined,
          installmentsCount: sessionData.installmentsCount ? parseInt(sessionData.installmentsCount) : undefined,
          firstPaymentDate: sessionData.firstPaymentDate ? new Date(sessionData.firstPaymentDate) : undefined,
        });
      }
      setSessionData({
        date: '',
        procedure: '',
        sessionTypeSelection: '',
        customType: '',
        notes: '',
        amount: '',
        paymentStatus: 'em_aberto',
        nextAppointment: '',
        installmentsCount: '',
        firstPaymentDate: '',
      });
      setEditingSessionId(null);
      setIsSessionOpen(false);
    }
  };

  const handleEditSession = (session: any) => {
    setEditingSessionId(session.id);
    setSessionData({
      date: session.date.toISOString().split('T')[0],
      procedure: session.procedure,
      sessionTypeSelection: '',
      customType: '',
      notes: session.notes || '',
      amount: session.amount.toString(),
      paymentStatus: session.paymentStatus,
      nextAppointment: session.nextAppointment ? session.nextAppointment.toISOString().split('T')[0] : '',
      installmentsCount: '',
      firstPaymentDate: '',
    });
    setIsSessionOpen(true);
  };

  const handleDeleteSession = async () => {
    if (deletingSessionId) {
      await deleteSession(deletingSessionId);
      setDeletingSessionId(null);
    }
  };

  const handleDeletePatient = async () => {
    if (id) {
      await deletePatient(id);
      setIsDeletingPatient(false);
      navigate('/pacientes');
    }
  };

  const handleAppointmentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (id && patient) {
      const renataLyra = professionals.find((p) => p.name === "Renata Lyra");

      if (!renataLyra) {
        toast({ 
          title: 'Erro', 
          description: 'Profissional não encontrado',
          variant: 'destructive'
        });
        return;
      }

      const appointmentDate = new Date(appointmentData.date + 'T12:00:00');
      
      addAppointment({
        patientId: id,
        patientName: patient.fullName,
        professionalId: renataLyra.id,
        date: appointmentDate,
        time: appointmentData.time,
        status: 'agendado',
      });

      setAppointmentData({
        date: '',
        time: '',
      });
      setIsAppointmentOpen(false);
      
      toast({ 
        title: 'Sucesso', 
        description: 'Agendamento criado com sucesso'
      });
      
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

  const getStatusBadge = (status: SessionStatus) => {
    const variants: Record<SessionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      sugerido: 'outline',
      agendado: 'secondary',
      realizado: 'outline',
    };
    const labels: Record<SessionStatus, string> = {
      sugerido: '',
      agendado: 'Agendado',
      realizado: 'Realizado',
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

      <Card className="relative">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsDeletingPatient(true)}
          className="absolute top-4 right-4 h-8 w-8 text-muted-foreground hover:text-destructive transition-colors z-10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
        
        <CardHeader className="pr-12">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-4">
              {/* Avatar clicável */}
              <div className="relative flex-shrink-0 group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                  {patient.avatarUrl ? (
                    <img src={patient.avatarUrl} alt={patient.fullName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-muted-foreground">
                      {patient.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file && id) { await updatePatientAvatar(id, file); e.target.value = ""; }
                }}
              />

              <div className="space-y-2 min-w-0">
                <CardTitle className="text-xl sm:text-2xl">{patient.fullName}</CardTitle>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span className="truncate">{patient.phone}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span className="truncate">{patient.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  <Badge variant="outline">{patient.origin}</Badge>
                </div>
              </div>
            </div>
            </div>{/* fecha flex avatar + info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setEditData(patient)} className="w-full">
                    <Edit className="h-4 w-4 mr-2" />
                    <span>Editar Dados</span>
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
                  <Button size="sm" className="gap-2 w-full">
                    <Calendar className="h-4 w-4" />
                    <span>Agendar Consulta</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Agendar Consulta</DialogTitle>
                    <DialogDescription>
                      Criar um novo agendamento para {patient.fullName}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAppointmentSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="patientName">Paciente</Label>
                      <Input
                        id="patientName"
                        type="text"
                        value={patient.fullName}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data da Consulta *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !appointmentData.date && "text-muted-foreground"
                            )}
                          >
                            <Calendar className="mr-2 h-4 w-4" />
                            {appointmentData.date ? format(new Date(appointmentData.date + 'T12:00:00'), "PPP", { locale: ptBR }) : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={appointmentData.date ? new Date(appointmentData.date + 'T12:00:00') : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setAppointmentData({
                                  ...appointmentData,
                                  date: format(date, 'yyyy-MM-dd'),
                                  time: '',
                                });
                              }
                            }}
                            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                            initialFocus
                            locale={ptBR}
                            className="p-3 pointer-events-auto"
                            modifiers={{
                              today: new Date(),
                            }}
                            modifiersClassNames={{
                              today: "bg-gray-200 text-black font-semibold rounded-md",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {appointmentData.date && (
                      <div className="space-y-2">
                        <Label>Horário Disponível *</Label>
                        <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-lg">
                          {timeSlots.map((slot) => {
                            const isOccupied = isTimeSlotOccupied(appointmentData.date, slot);
                            const isSelected = appointmentData.time === slot;

                            return (
                              <Button
                                key={slot}
                                type="button"
                                variant={isSelected ? "default" : "outline"}
                                size="sm"
                                disabled={isOccupied}
                                onClick={() => setAppointmentData({ ...appointmentData, time: slot })}
                                className={cn(
                                  "relative transition-all",
                                  isOccupied && "opacity-40 cursor-not-allowed",
                                  isSelected && "ring-2 ring-primary ring-offset-2"
                                )}
                              >
                                {slot}
                              </Button>
                            );
                          })}
                        </div>
                        {!appointmentData.time && <p className="text-xs text-muted-foreground">Selecione um horário disponível</p>}
                      </div>
                    )}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsAppointmentOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={!appointmentData.time}>
                        Agendar
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="cadastro" className="w-full mt-6">
        <div className="border-b border-border">
          <TabsList className="inline-flex h-12 items-center justify-start gap-1 bg-transparent p-0 w-full overflow-x-auto">
            <TabsTrigger
              value="cadastro"
              className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <UserCircle className="h-4 w-4" />
              Cadastro
            </TabsTrigger>
            <TabsTrigger
              value="sessions"
              className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <Calendar className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger 
              value="financial" 
              className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              Financeiro
            </TabsTrigger>
            <TabsTrigger
              value="fotos"
              className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <Images className="h-4 w-4" />
              Fotos
            </TabsTrigger>
            <TabsTrigger
              value="odontograma"
              className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <Stethoscope className="h-4 w-4" />
              Odontograma
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 text-sm font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              Observações
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── ABA CADASTRO ────────────────────────────────────────── */}
        <TabsContent value="cadastro" className="mt-4">
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              {/* Grid compacto — 3 colunas no desktop */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <Field label="Nome *">
                  <Input className="h-8 text-sm" value={cadastroData.fullName} onChange={(e) => handleCadastroChange('fullName', e.target.value)} />
                </Field>
                <Field label="Apelido">
                  <Input className="h-8 text-sm" value={cadastroData.nickname} placeholder="—" onChange={(e) => handleCadastroChange('nickname', e.target.value)} />
                </Field>
                <Field label="Data de Nascimento">
                  <Input className="h-8 text-sm" type="date" value={cadastroData.birthDate} onChange={(e) => handleCadastroChange('birthDate', e.target.value)} />
                </Field>
                <Field label="Sexo">
                  <Select value={cadastroData.gender} onValueChange={(v) => handleCadastroChange('gender', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="CPF">
                  <Input className="h-8 text-sm" value={cadastroData.cpf} placeholder="000.000.000-00" onChange={(e) => handleCadastroChange('cpf', e.target.value)} />
                </Field>
                <Field label="RG">
                  <Input className="h-8 text-sm" value={cadastroData.rg} placeholder="00.000.000-0" onChange={(e) => handleCadastroChange('rg', e.target.value)} />
                </Field>
                <Field label="Estado Civil">
                  <Select value={cadastroData.maritalStatus} onValueChange={(v) => handleCadastroChange('maritalStatus', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                      <SelectItem value="casado">Casado(a)</SelectItem>
                      <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                      <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Escolaridade">
                  <Select value={cadastroData.education} onValueChange={(v) => handleCadastroChange('education', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fundamental_incompleto">Fundamental Incompleto</SelectItem>
                      <SelectItem value="fundamental_completo">Fundamental Completo</SelectItem>
                      <SelectItem value="medio_incompleto">Médio Incompleto</SelectItem>
                      <SelectItem value="medio_completo">Médio Completo</SelectItem>
                      <SelectItem value="superior_incompleto">Superior Incompleto</SelectItem>
                      <SelectItem value="superior_completo">Superior Completo</SelectItem>
                      <SelectItem value="pos_graduacao">Pós-graduação</SelectItem>
                      <SelectItem value="mestrado">Mestrado</SelectItem>
                      <SelectItem value="doutorado">Doutorado</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Telefone">
                  <Input className="h-8 text-sm" value={cadastroData.phone} placeholder="(00) 00000-0000" onChange={(e) => handleCadastroChange('phone', e.target.value)} />
                </Field>
                <Field label="E-mail">
                  <Input className="h-8 text-sm" type="email" value={cadastroData.email} onChange={(e) => handleCadastroChange('email', e.target.value)} />
                </Field>
                <Field label="Como conheceu">
                  <Select value={cadastroData.origin} onValueChange={(v) => handleCadastroChange('origin', v)}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Google Ads">Google Ads</SelectItem>
                      <SelectItem value="Instagram">Instagram</SelectItem>
                      <SelectItem value="Indicação">Indicação</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Cadastrado em">
                  <Input className="h-8 text-sm bg-muted text-muted-foreground"
                    value={patient?.createdAt ? format(patient.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : ''}
                    disabled />
                </Field>
              </div>

              {/* Observações */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Observações</Label>
                <Textarea className="text-sm resize-none" value={cadastroData.notes} rows={2}
                  placeholder="Informações adicionais..."
                  onChange={(e) => handleCadastroChange('notes', e.target.value)} />
              </div>

              {cadastroDirty && (
                <div className="flex justify-end">
                  <Button size="sm" className="gap-2" onClick={handleCadastroSave} disabled={cadastroSaving}>
                    <Save className="h-3.5 w-3.5" />
                    {cadastroSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h3 className="text-base sm:text-lg font-semibold">Histórico de Sessões</h3>
            <Dialog open={isSessionOpen} onOpenChange={setIsSessionOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full sm:w-auto" onClick={() => {
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
                    installmentsCount: '',
                    firstPaymentDate: '',
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
                  {sessionData.sessionTypeSelection === 'outra' && (
                    <div>
                      <Label>Especifique o Tipo de Sessão *</Label>
                      <Input
                        value={sessionData.customType}
                        onChange={(e) => setSessionData({ ...sessionData, customType: e.target.value })}
                        placeholder="Ex: Avaliação, Emergência..."
                        required
                      />
                    </div>
                  )}
                  <div>
                    <Label>Título do Atendimento *</Label>
                    <Input
                      value={sessionData.procedure}
                      onChange={(e) => setSessionData({ ...sessionData, procedure: e.target.value })}
                      placeholder="Ex: Limpeza, Botox, Laser..."
                      required
                    />
                  </div>
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
                  {!editingSessionId && parseFloat(sessionData.amount) > 0 && (
                    <>
                      <div>
                        <Label>Parcelar Pagamento?</Label>
                        <Input
                          type="number"
                          min="2"
                          max="12"
                          value={sessionData.installmentsCount}
                          onChange={(e) => setSessionData({ ...sessionData, installmentsCount: e.target.value })}
                          placeholder="Número de parcelas (deixe vazio para à vista)"
                        />
                      </div>
                      {sessionData.installmentsCount && parseInt(sessionData.installmentsCount) > 1 && (
                        <div>
                          <Label>Data da Primeira Parcela *</Label>
                          <Input
                            type="date"
                            value={sessionData.firstPaymentDate}
                            onChange={(e) => setSessionData({ ...sessionData, firstPaymentDate: e.target.value })}
                            required
                          />
                        </div>
                      )}
                    </>
                  )}
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
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm sm:text-base font-semibold">{session.procedure}</h4>
                            <Badge variant="secondary" className="text-xs">{sessionTypeLabels[session.sessionType]}</Badge>
                            {getStatusBadge(session.status)}
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {session.date.toLocaleDateString('pt-BR', { 
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                          {session.notes && (
                            <p className="text-xs sm:text-sm mt-2 p-2 bg-muted rounded break-words">{session.notes}</p>
                          )}
                          {session.nextAppointment && (
                            <p className="text-xs sm:text-sm text-primary font-medium">
                              Próxima consulta sugerida: {session.nextAppointment.toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleEditSession(session)}
                            className="w-full sm:w-auto"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive"
                            onClick={() => setDeletingSessionId(session.id)}
                            className="w-full sm:w-auto"
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

        <AlertDialog open={isDeletingPatient} onOpenChange={(open) => !open && setIsDeletingPatient(false)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Paciente</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este paciente? Esta ação irá remover todos os dados relacionados e não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeletePatient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Excluir Permanentemente
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-primary">R$ {totalPaid.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-destructive">R$ {totalPending.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>

          <h3 className="text-base sm:text-lg font-semibold mt-6">Transações</h3>
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma transação registrada.</p>
            ) : (
              sessions.map((session) => {
                const sessionInstallments = installments.filter(i => i.sessionId === session.id);
                const hasInstallments = sessionInstallments.length > 0;
                const isExpanded = expandedSessionId === session.id;
                const allPaid = sessionInstallments.length > 0 && sessionInstallments.every(i => i.paid);

                return (
                  <Card key={`${session.id}-${sessionInstallments.length}-${sessionInstallments.filter(i => i.paid).length}`}>
                    <CardContent className="pt-4 sm:pt-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex-1">
                          <p className="text-sm sm:text-base font-medium">{session.procedure}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {session.date.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end gap-2 w-full sm:w-auto">
                          <p className="text-lg sm:text-xl font-bold">R$ {session.amount.toFixed(2)}</p>
                          {allPaid && session.paymentStatus === 'em_aberto' ? getPaymentBadge('pago') : getPaymentBadge(session.paymentStatus)}
                          {!allPaid && session.paymentStatus === 'em_aberto' && session.amount > 0 && (
                            <>
                              {hasInstallments ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                  className="w-full sm:w-auto text-xs sm:text-sm"
                                >
                                  {isExpanded ? 'Ocultar' : 'Exibir'} Parcelas
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => {
                                    if (id) {
                                      updateSession(session.id, { paymentStatus: 'pago' });
                                    }
                                  }}
                                  className="w-full sm:w-auto text-xs sm:text-sm"
                                >
                                  Registrar Pagamento
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {isExpanded && hasInstallments && (
                        <div className="mt-4 border-t pt-4">
                          <h4 className="text-sm sm:text-base font-medium mb-2">Parcelas desta Sessão</h4>
                          <div className="overflow-x-auto -mx-2 sm:mx-0">
                          <Table className="min-w-full">
                            <TableHeader>
                              <TableRow>
                                <TableHead className="text-xs sm:text-sm">Parcela</TableHead>
                                <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                                <TableHead className="text-xs sm:text-sm">Previsão</TableHead>
                                <TableHead className="text-xs sm:text-sm">Status</TableHead>
                                <TableHead className="text-xs sm:text-sm">Ações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sessionInstallments
                                .sort((a, b) => a.installmentNumber - b.installmentNumber)
                                .map((installment) => (
                                  <TableRow key={installment.id}>
                                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                      {installment.installmentNumber}/{installment.totalInstallments}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">R$ {installment.amount.toFixed(2)}</TableCell>
                                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                      {installment.predictedDate.toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                      <Badge variant={installment.paid ? 'default' : 'secondary'} className="text-xs">
                                        {installment.paid ? 'Pago' : 'Pendente'}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                      {!installment.paid && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={async () => {
                                            await updateInstallment(installment.id, {
                                              paid: true,
                                              paidDate: new Date(),
                                            });
                                          }}
                                          className="text-xs whitespace-nowrap"
                                        >
                                          Marcar como pago
                                        </Button>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                            </TableBody>
                          </Table>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

        </TabsContent>

        <TabsContent value="fotos">
          {id && <PatientPhotos patientId={id} />}
        </TabsContent>

        <TabsContent value="odontograma">
          {id && <Odontograma patientId={id} />}
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">Prontuário Livre</h3>
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <Textarea
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Observações odontológicas, histórico de tratamentos, alergias, notas clínicas..."
                rows={10}
                className="mb-4 text-sm"
              />
              <Button onClick={handleSaveObservations} className="w-full sm:w-auto">Salvar Observações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ProntuarioPaciente;
