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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ArrowLeft, ChevronLeft, Calendar, Plus, Phone, Mail, MapPin, Trash2, UserCircle, Save, Stethoscope, Camera, Images, ClipboardList, DollarSign, CalendarRange, CreditCard, Banknote, Bell, FolderOpen, History, MessageCircle, FileText } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { PhoneInput, formatPhoneDisplay } from '@/components/ui/phone-input';
import { Odontograma } from '@/components/Odontograma';
import { PatientPhotos } from '@/components/PatientPhotos';
import { PatientAnamnese } from '@/components/PatientAnamnese';
import { PatientDocuments } from '@/components/PatientDocuments';
import { ReciboModal } from '@/components/ReciboModal';
import { PaymentStatus, PaymentMethod, PatientGender, MaritalStatus, PatientOrigin, Session } from '@/types';
import { useRef } from 'react';
import { usePermissionsCtx } from '@/contexts/PermissionsContext';
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
    addReturnAlert,
    returnAlerts,
    sendFeedbackRequest,
  } = useClinic();

  const { canEdit, canDelete, canCreate, canView } = usePermissionsCtx();
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
        birthDate: cadastroData.birthDate ? new Date(cadastroData.birthDate + 'T12:00:00') : undefined,
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
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [isDeletingPatient, setIsDeletingPatient] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [appointmentData, setAppointmentData] = useState({
    date: '',
    time: '',
  });
  const [observations, setObservations] = useState(patient?.notes || '');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Toggle feedback — estado local para evitar flickering
  const [feedbackEnabled, setFeedbackEnabled] = useState(!(patient?.feedbackGiven ?? false));
  const handleFeedbackToggle = (v: boolean) => {
    setFeedbackEnabled(v);
    if (patient) updatePatient(patient.id, { feedbackGiven: !v });
  };

  // Dialog: Alerta de retorno
  const [isReturnAlertOpen, setIsReturnAlertOpen] = useState(false);
  const [returnAlertData, setReturnAlertData] = useState({ months: '6', customDate: '', notes: '' });
  const patientReturnAlerts = id ? returnAlerts.filter(a => a.patientId === id) : [];
  const activeReturnAlert = patientReturnAlerts.find(a => !a.whatsappSent);

  const handleReturnAlertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    let returnDate: Date;
    if (returnAlertData.customDate) {
      returnDate = new Date(returnAlertData.customDate + 'T12:00:00');
    } else {
      returnDate = new Date();
      returnDate.setMonth(returnDate.getMonth() + parseInt(returnAlertData.months));
    }
    await addReturnAlert(id, returnDate, returnAlertData.notes || undefined);
    setReturnAlertData({ months: '6', customDate: '', notes: '' });
    setIsReturnAlertOpen(false);
  };

  // Dialog: Recibo
  const [reciboSession, setReciboSession] = useState<Session | null>(null);

  // Dialog: Adicionar Lançamento
  const [isLancamentoOpen, setIsLancamentoOpen] = useState(false);
  const [lancamentoData, setLancamentoData] = useState({
    description: '',
    amount: '',
    date: '',
    paymentStatus: 'em_aberto' as PaymentStatus,
    paymentMethod: '' as PaymentMethod | '',
    professionalId: '',
    cardInstallments: '',
  });

  // Dialog: Adicionar Plano Parcelado
  const [isPlanoOpen, setIsPlanoOpen] = useState(false);
  const [planoData, setPlanoData] = useState({
    description: '',
    amount: '',
    installmentsCount: '',
    firstPaymentDate: '',
    paymentMethod: '' as PaymentMethod | '',
    professionalId: '',
  });

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

  const handleDeleteSession = async () => {
    if (deletingSessionId) {
      await deleteSession(deletingSessionId);
      setDeletingSessionId(null);
    }
  };

  const handleLancamentoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    await addSession({
      patientId: id,
      date: new Date((lancamentoData.date || new Date().toISOString().split('T')[0]) + 'T12:00:00'),
      procedure: lancamentoData.description,
      sessionType: 'consulta_avulsa',
      status: 'realizado',
      amount: parseFloat(lancamentoData.amount),
      paymentStatus: lancamentoData.paymentStatus,
      paymentMethod: lancamentoData.paymentMethod || undefined,
      professionalId: lancamentoData.professionalId || undefined,
      cardInstallments: lancamentoData.cardInstallments ? parseInt(lancamentoData.cardInstallments) : undefined,
    });
    setLancamentoData({ description: '', amount: '', date: '', paymentStatus: 'em_aberto', paymentMethod: '', professionalId: '', cardInstallments: '' });
    setIsLancamentoOpen(false);
  };

  const handlePlanoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const count = parseInt(planoData.installmentsCount);
    await addSession({
      patientId: id,
      date: new Date(planoData.firstPaymentDate + 'T12:00:00'),
      procedure: planoData.description,
      sessionType: 'consulta_avulsa',
      status: 'realizado',
      amount: parseFloat(planoData.amount),
      paymentStatus: 'em_aberto',
      paymentMethod: planoData.paymentMethod || undefined,
      professionalId: planoData.professionalId || undefined,
      installmentsCount: count,
      firstPaymentDate: new Date(planoData.firstPaymentDate + 'T12:00:00'),
    });
    setPlanoData({ description: '', amount: '', installmentsCount: '', firstPaymentDate: '', paymentMethod: '', professionalId: '' });
    setIsPlanoOpen(false);
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
      
      navigate('/');
    }
  };

  const handleSaveObservations = () => {
    if (id) {
      updatePatient(id, { notes: observations });
    }
  };


  const patientAppointments = appointments
    .filter(a => a.patientId === id)
    .sort((a, b) => b.date.getTime() - a.date.getTime());

  const apptStatusConfig: Record<string, { label: string; className: string }> = {
    agendado:   { label: 'Agendado',   className: 'border-border text-foreground' },
    confirmado: { label: 'Confirmado', className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300' },
    realizado:  { label: 'Realizado',  className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300' },
    cancelado:  { label: 'Cancelado',  className: 'bg-destructive/10 text-destructive border-destructive/20' },
    falta:      { label: 'Falta',      className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300' },
    sugerido:   { label: 'Sugerido',   className: 'border-border text-muted-foreground' },
  };

  const patientInstallments = installments.filter(i => {
    const session = sessions.find(s => s.id === i.sessionId);
    return session?.patientId === id;
  });

  const totalPaid = sessions
    .filter(s => s.patientId === id && s.paymentStatus === 'pago')
    .reduce((sum, s) => {
      const hasInstallments = installments.some(i => i.sessionId === s.id);
      return hasInstallments ? sum : sum + s.amount;
    }, 0)
    + patientInstallments.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);

  const totalPending = sessions
    .filter(s => s.patientId === id && s.paymentStatus === 'em_aberto')
    .reduce((sum, s) => {
      const sessionInst = installments.filter(i => i.sessionId === s.id);
      if (sessionInst.length > 0) {
        return sum + sessionInst.filter(i => !i.paid).reduce((a, i) => a + i.amount, 0);
      }
      return sum + s.amount;
    }, 0);

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
      {/* Mobile: barra de navegação estilo nativo */}
      <button
        onClick={() => navigate('/pacientes')}
        className="sm:hidden -mx-4 -mt-4 px-3 py-3 flex items-center gap-1.5 border-b border-border bg-card/80 backdrop-blur w-[calc(100%+2rem)] text-left mb-4"
      >
        <ChevronLeft className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-primary">Pacientes</span>
      </button>
      {/* Desktop */}
      <Button variant="ghost" onClick={() => navigate('/pacientes')} className="hidden sm:flex mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para Pacientes
      </Button>

      <Card className="relative">
        <Button
          variant="ghost"
          size="icon"
          disabled={!canDelete('pacientes')}
          onClick={() => setIsDeletingPatient(true)}
          className="absolute top-3 right-3 h-8 w-8 text-muted-foreground hover:text-destructive transition-colors z-10"
        >
          <Trash2 className="h-4 w-4" />
        </Button>

        <CardContent className="pt-6 pb-4">
          {/* Topo: avatar + info — coluna centrada no mobile, linha no desktop */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 mb-4 sm:pr-8">
            {/* Avatar */}
            <div className="relative group cursor-pointer shrink-0" onClick={() => avatarInputRef.current?.click()}>
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center shadow-[0_2px_8px_-2px_hsl(40_20%_50%/0.2)]">
                {patient.avatarUrl ? (
                  <img src={patient.avatarUrl} alt={patient.fullName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl font-cocon text-muted-foreground/70 tracking-[0.04em]">
                    {patient.fullName.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
                  </span>
                )}
              </div>
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 transition-all duration-300 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
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

            {/* Nome + contatos */}
            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-2xl font-bold leading-snug break-words font-cocon">{patient.fullName}</h2>
              {patient.nickname && <p className="text-sm text-muted-foreground mt-0.5">{patient.nickname}</p>}
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-start gap-1.5 mt-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{formatPhoneDisplay(patient.phone)}</span>
                </div>
                {patient.email && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="break-all text-sm">{patient.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  <Badge variant="outline" className="text-xs">{patient.origin}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
              {/* Toggle Feedback */}
              <div className="flex items-center justify-between border rounded-md px-3 h-9 w-full text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  <span>Enviar Feedback</span>
                </div>
                <Switch checked={feedbackEnabled} onCheckedChange={handleFeedbackToggle} />
              </div>
              {/* Dialog: Alerta de retorno */}
              <Dialog open={isReturnAlertOpen} onOpenChange={setIsReturnAlertOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant={activeReturnAlert ? 'default' : 'outline'} className="gap-2 w-full">
                    <Bell className="h-4 w-4" />
                    <span className="truncate">{activeReturnAlert ? 'Alerta ativo' : 'Alerta de Retorno'}</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
                  <DialogHeader>
                    <DialogTitle>Alerta de Retorno</DialogTitle>
                    <DialogDescription>
                      Defina quando {patient.fullName} deve retornar à clínica.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Alerta ativo existente */}
                  {activeReturnAlert && (
                    <div className="p-3 rounded-lg border border-primary/40 bg-primary/5 text-sm space-y-1">
                      <p className="font-medium text-primary">Alerta ativo</p>
                      <p className="text-muted-foreground">
                        Retorno em {activeReturnAlert.returnDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </p>
                      {activeReturnAlert.notes && (
                        <p className="text-xs text-muted-foreground">{activeReturnAlert.notes}</p>
                      )}
                    </div>
                  )}

                  <form onSubmit={handleReturnAlertSubmit} className="space-y-4">
                    <div>
                      <Label>Retorno em quantos meses?</Label>
                      <Select
                        value={returnAlertData.months}
                        onValueChange={(v) => setReturnAlertData({ ...returnAlertData, months: v, customDate: '' })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 mês</SelectItem>
                          <SelectItem value="2">2 meses</SelectItem>
                          <SelectItem value="3">3 meses</SelectItem>
                          <SelectItem value="4">4 meses</SelectItem>
                          <SelectItem value="6">6 meses</SelectItem>
                          <SelectItem value="12">1 ano</SelectItem>
                          <SelectItem value="custom">Data específica</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {returnAlertData.months === 'custom' && (
                      <div>
                        <Label>Data específica</Label>
                        <Input
                          type="date"
                          value={returnAlertData.customDate}
                          onChange={(e) => setReturnAlertData({ ...returnAlertData, customDate: e.target.value })}
                          required
                        />
                      </div>
                    )}
                    <div>
                      <Label>Observação (opcional)</Label>
                      <Input
                        value={returnAlertData.notes}
                        onChange={(e) => setReturnAlertData({ ...returnAlertData, notes: e.target.value })}
                        placeholder="Ex: Revisão semestral..."
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button type="button" variant="outline" onClick={() => setIsReturnAlertOpen(false)}>Cancelar</Button>
                      <Button type="submit">Criar Alerta</Button>
                    </div>
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
                <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] rounded-xl">
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
                              today: "bg-gray-500 text-white font-semibold rounded-md",
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
        </CardContent>
      </Card>

      <Tabs defaultValue="cadastro" className="w-full mt-6">
        <div className="border-b border-border overflow-x-auto">
          <TabsList className="inline-flex h-14 items-center bg-transparent p-0 gap-0 min-w-max">
            {(
              [
                { value: 'cadastro',    icon: <UserCircle className="h-5 w-5 shrink-0" />,   label: 'Cadastro' },
                { value: 'financial',   icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0"><line x1="12" x2="12" y1="2" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>, label: 'Financeiro' },
                { value: 'historico',   icon: <History className="h-5 w-5 shrink-0" />,       label: 'Histórico' },
                { value: 'anamnese',    icon: <ClipboardList className="h-5 w-5 shrink-0" />, label: 'Anamnese' },
                { value: 'fotos',       icon: <Images className="h-5 w-5 shrink-0" />,        label: 'Fotos' },
                { value: 'odontograma', icon: <Stethoscope className="h-5 w-5 shrink-0" />,  label: 'Odontograma' },
                { value: 'documentos',  icon: <FolderOpen className="h-5 w-5 shrink-0" />,   label: 'Documentos' },
                { value: 'notes',       icon: <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'Observações' },
              ] as { value: string; icon: React.ReactNode; label: string }[]
            ).map(({ value, icon, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="relative inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-none border-b-2 border-transparent bg-transparent px-3 pb-3 pt-2 text-[13px] font-medium text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:shadow-none"
              >
                {icon}
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* ── ABA CADASTRO ────────────────────────────────────────── */}
        <TabsContent value="cadastro" className="mt-4">
          <Card>
            <CardContent className="pt-4 pb-4 space-y-3">
              {/* Grid compacto — 3 colunas no desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-3">
                <Field label="Nome *">
                  <Input className="h-10 text-sm" value={cadastroData.fullName} onChange={(e) => handleCadastroChange('fullName', e.target.value)} />
                </Field>
                <Field label="Apelido">
                  <Input className="h-10 text-sm" value={cadastroData.nickname} placeholder="—" onChange={(e) => handleCadastroChange('nickname', e.target.value)} />
                </Field>
                <Field label="Data de Nascimento">
                  <Input className="h-10 text-sm" type="date" value={cadastroData.birthDate} onChange={(e) => handleCadastroChange('birthDate', e.target.value)} />
                </Field>
                <Field label="Sexo">
                  <Select value={cadastroData.gender} onValueChange={(v) => handleCadastroChange('gender', v)}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="masculino">Masculino</SelectItem>
                      <SelectItem value="feminino">Feminino</SelectItem>
                      <SelectItem value="outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="CPF">
                  <Input className="h-10 text-sm" value={cadastroData.cpf} placeholder="000.000.000-00" onChange={(e) => handleCadastroChange('cpf', e.target.value)} />
                </Field>
                <Field label="RG">
                  <Input className="h-10 text-sm" value={cadastroData.rg} placeholder="00.000.000-0" onChange={(e) => handleCadastroChange('rg', e.target.value)} />
                </Field>
                <Field label="Estado Civil">
                  <Select value={cadastroData.maritalStatus} onValueChange={(v) => handleCadastroChange('maritalStatus', v)}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
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
                    <SelectTrigger className="h-10 text-sm"><SelectValue placeholder="—" /></SelectTrigger>
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
                  <PhoneInput
                    value={cadastroData.phone}
                    onChange={(v) => handleCadastroChange('phone', v)}
                    className="h-10 text-sm"
                  />
                </Field>
                <Field label="E-mail">
                  <Input className="h-10 text-sm" type="email" value={cadastroData.email} onChange={(e) => handleCadastroChange('email', e.target.value)} />
                </Field>
                <Field label="Como conheceu">
                  <Select value={cadastroData.origin} onValueChange={(v) => handleCadastroChange('origin', v)}>
                    <SelectTrigger className="h-10 text-sm"><SelectValue /></SelectTrigger>
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
                  <Button size="sm" className="gap-2" onClick={handleCadastroSave} disabled={cadastroSaving || !canEdit('pacientes')}>
                    <Save className="h-3.5 w-3.5" />
                    {cadastroSaving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <AlertDialog open={!!deletingSessionId} onOpenChange={(open) => !open && setDeletingSessionId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Lançamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
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
          {/* Totais — visível apenas com canView */}
          {canView('financeiro') && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-primary">R$ {totalPaid.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Total Pendente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl sm:text-3xl font-bold text-destructive">R$ {totalPending.toFixed(2)}</p>
              </CardContent>
            </Card>
          </div>
          )}

          {/* Botões de ação */}
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Dialog: Lançamento avulso */}
            <Dialog open={isLancamentoOpen} onOpenChange={setIsLancamentoOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" disabled={!canCreate('financeiro')} className="gap-2 w-full sm:w-auto">
                  <DollarSign className="h-4 w-4" />
                  Adicionar Lançamento
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Lançamento</DialogTitle>
                  <DialogDescription>Cobrança avulsa — à vista ou em aberto.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleLancamentoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={lancamentoData.amount}
                        onChange={(e) => setLancamentoData({ ...lancamentoData, amount: e.target.value })}
                        placeholder="0,00"
                        required
                      />
                    </div>
                    <div>
                      <Label>Data *</Label>
                      <Input
                        type="date"
                        value={lancamentoData.date}
                        onChange={(e) => setLancamentoData({ ...lancamentoData, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select
                        value={lancamentoData.paymentMethod}
                        onValueChange={(v) => setLancamentoData({ ...lancamentoData, paymentMethod: v as PaymentMethod, cardInstallments: '' })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX</SelectItem>
                          <SelectItem value="dinheiro">Dinheiro</SelectItem>
                          <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                          <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Status *</Label>
                      <Select
                        value={lancamentoData.paymentStatus}
                        onValueChange={(v) => setLancamentoData({ ...lancamentoData, paymentStatus: v as PaymentStatus })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pago">Pago</SelectItem>
                          <SelectItem value="em_aberto">Em aberto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {lancamentoData.paymentMethod === 'cartao_credito' && (
                    <div>
                      <Label>Nº de Parcelas do Cartão</Label>
                      <Input
                        type="number"
                        min="1"
                        max="72"
                        placeholder="1 = à vista"
                        value={lancamentoData.cardInstallments}
                        onChange={(e) => setLancamentoData({ ...lancamentoData, cardInstallments: e.target.value })}
                      />
                    </div>
                  )}
                  <div>
                    <Label>Dentista</Label>
                    <Select
                      value={lancamentoData.professionalId}
                      onValueChange={(v) => setLancamentoData({ ...lancamentoData, professionalId: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {professionals.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Procedimento</Label>
                    <Input
                      value={lancamentoData.description}
                      onChange={(e) => setLancamentoData({ ...lancamentoData, description: e.target.value })}
                      placeholder="Ex: Clareamento, Extração..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsLancamentoOpen(false)}>Cancelar</Button>
                    <Button type="submit">Salvar</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Dialog: Plano parcelado */}
            <Dialog open={isPlanoOpen} onOpenChange={setIsPlanoOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!canCreate('financeiro')} className="gap-2 w-full sm:w-auto">
                  <CalendarRange className="h-4 w-4" />
                  Adicionar Mensalidade
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Novo Plano Parcelado</DialogTitle>
                  <DialogDescription>Divide o valor em até 18 parcelas mensais automáticas.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handlePlanoSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Valor Total (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={planoData.amount}
                        onChange={(e) => setPlanoData({ ...planoData, amount: e.target.value })}
                        placeholder="0,00"
                        required
                      />
                    </div>
                    <div>
                      <Label>Nº de Parcelas *</Label>
                      <Input
                        type="number"
                        min="1"
                        max="18"
                        value={planoData.installmentsCount}
                        onChange={(e) => setPlanoData({ ...planoData, installmentsCount: e.target.value })}
                        placeholder="Ex: 12"
                        required
                      />
                    </div>
                  </div>
                  {planoData.amount && planoData.installmentsCount && parseInt(planoData.installmentsCount) > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {parseInt(planoData.installmentsCount)}x de R$ {(parseFloat(planoData.amount) / parseInt(planoData.installmentsCount)).toFixed(2)}
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Forma de Pagamento</Label>
                      <Select
                        value={planoData.paymentMethod}
                        onValueChange={(v) => setPlanoData({ ...planoData, paymentMethod: v as PaymentMethod })}
                      >
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pix">PIX Parcelado</SelectItem>
                          <SelectItem value="boleto">Boleto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Data da 1ª Parcela *</Label>
                      <Input
                        type="date"
                        value={planoData.firstPaymentDate}
                        onChange={(e) => setPlanoData({ ...planoData, firstPaymentDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Dentista</Label>
                    <Select
                      value={planoData.professionalId}
                      onValueChange={(v) => setPlanoData({ ...planoData, professionalId: v === '__none__' ? '' : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Selecione (opcional)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nenhum</SelectItem>
                        {professionals.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Procedimento</Label>
                    <Input
                      value={planoData.description}
                      onChange={(e) => setPlanoData({ ...planoData, description: e.target.value })}
                      placeholder="Ex: Tratamento ortodôntico..."
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button type="button" variant="outline" onClick={() => setIsPlanoOpen(false)}>Cancelar</Button>
                    <Button type="submit">Criar Plano</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de lançamentos — visível apenas com canView */}
          {canView('financeiro') && (
          <div className="space-y-2">
            {sessions.filter(s => s.patientId === id).length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum lançamento registrado.</p>
            ) : (
              sessions
                .filter(s => s.patientId === id)
                .map((session) => {
                  const sessionInstallments = installments.filter(i => i.sessionId === session.id);
                  const hasInstallments = sessionInstallments.length > 0;
                  const isExpanded = expandedSessionId === session.id;
                  const paidCount = sessionInstallments.filter(i => i.paid).length;
                  const allInstallmentsPaid = hasInstallments && paidCount === sessionInstallments.length;
                  const effectiveStatus = allInstallmentsPaid ? 'pago' : session.paymentStatus;

                  const paymentMethodLabels: Record<string, string> = {
                    pix: 'PIX',
                    dinheiro: 'Dinheiro',
                    cartao_credito: 'Cartão de Crédito',
                    cartao_debito: 'Cartão de Débito',
                    boleto: 'Boleto',
                    cheque: 'Cheque',
                  };

                  return (
                    <Card key={`${session.id}-${paidCount}`}>
                      <CardContent className="pt-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium break-words">{session.procedure}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {session.date.toLocaleDateString('pt-BR')}
                              </span>
                              {session.paymentMethod && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <CreditCard className="h-3 w-3" />
                                  {paymentMethodLabels[session.paymentMethod] ?? session.paymentMethod}
                                </span>
                              )}
                              {hasInstallments && (
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {paidCount}/{sessionInstallments.length} parcelas
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 w-full sm:w-auto justify-between sm:justify-start">
                            <p className="text-base sm:text-lg font-bold">R$ {session.amount.toFixed(2)}</p>
                            <div className="flex items-center gap-2">
                              {getPaymentBadge(effectiveStatus)}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => setDeletingSessionId(session.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Ações para lançamento sem parcelas */}
                        {!hasInstallments && (effectiveStatus === 'em_aberto' || effectiveStatus === 'pago') && (
                          <div className="mt-3 pt-3 border-t flex items-center gap-2">
                            {effectiveStatus === 'em_aberto' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateSession(session.id, { paymentStatus: 'pago' })}
                                className="text-xs"
                              >
                                <Banknote className="h-3.5 w-3.5 mr-1.5" />
                                Registrar Pagamento
                              </Button>
                            )}
                            {effectiveStatus === 'pago' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setReciboSession(session)}
                                className="text-xs"
                              >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Gerar Recibo
                              </Button>
                            )}
                          </div>
                        )}

                        {/* Expand/collapse parcelas */}
                        {hasInstallments && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                                className="text-xs h-7 px-2"
                              >
                                {isExpanded ? 'Ocultar' : 'Ver'} parcelas
                              </Button>
                              {allInstallmentsPaid && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReciboSession(session)}
                                  className="text-xs h-7"
                                >
                                  <FileText className="h-3.5 w-3.5 mr-1.5" />
                                  Gerar Recibo
                                </Button>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-2 space-y-1.5">
                                {sessionInstallments
                                  .sort((a, b) => a.installmentNumber - b.installmentNumber)
                                  .map((inst) => (
                                    <div key={inst.id} className="p-2 rounded-md border text-xs space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium shrink-0 w-9 text-center tabular-nums">
                                          {inst.installmentNumber}/{inst.totalInstallments}
                                        </span>
                                        <span className="text-muted-foreground shrink-0 tabular-nums">
                                          {inst.predictedDate.toLocaleDateString('pt-BR')}
                                        </span>
                                        <span className="font-medium ml-auto shrink-0 tabular-nums">
                                          R$ {inst.amount.toFixed(2)}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between gap-2 pl-11">
                                        <Badge variant={inst.paid ? 'default' : 'secondary'} className="text-xs">
                                          {inst.paid ? 'Pago' : inst.predictedDate < new Date() ? 'Vencido' : 'Pendente'}
                                        </Badge>
                                        {!inst.paid && (
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateInstallment(inst.id, { paid: true, paidDate: new Date() })}
                                            className="text-xs h-6 px-2 shrink-0"
                                          >
                                            Pagar
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
            )}
          </div>
          )}
        </TabsContent>

        {/* ── ABA HISTÓRICO DE AGENDAMENTOS ──────────────────────────── */}
        <TabsContent value="historico" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{patientAppointments.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Realizados</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {patientAppointments.filter(a => a.status === 'realizado').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-[11px] leading-tight text-muted-foreground">Cancelamentos</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {patientAppointments.filter(a => a.status === 'cancelado').length}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-3">
                <p className="text-xs text-muted-foreground">Faltas</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {patientAppointments.filter(a => a.status === 'falta').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {patientAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Nenhum agendamento registrado para este paciente.</p>
          ) : (
            <div className="space-y-2">
              {patientAppointments.map((appt) => {
                const professional = professionals.find(p => p.id === appt.professionalId);
                const config = apptStatusConfig[appt.status] ?? { label: appt.status, className: 'border-border text-foreground' };
                return (
                  <Card key={appt.id}>
                    <CardContent className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="text-center shrink-0">
                          <p className="text-sm font-semibold leading-tight">
                            {appt.date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                          </p>
                          <p className="text-xs text-muted-foreground">{appt.date.getFullYear()}</p>
                        </div>
                        <div className="w-px self-stretch bg-border shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium">{appt.time}</p>
                              <p className="text-xs text-muted-foreground break-words">
                                {professional?.name ?? 'Profissional não identificado'}
                              </p>
                              {appt.notes && (
                                <p className="text-xs text-muted-foreground mt-0.5 break-words">{appt.notes}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={cn("shrink-0 text-xs", config.className)}>
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="anamnese">
          {id && <PatientAnamnese patientId={id} patientName={patient.fullName} />}
        </TabsContent>

        <TabsContent value="fotos">
          {id && <PatientPhotos patientId={id} />}
        </TabsContent>

        <TabsContent value="odontograma">
          {id && <Odontograma patientId={id} />}
        </TabsContent>

        <TabsContent value="documentos" className="space-y-4">
          <h3 className="text-base sm:text-lg font-semibold">Documentos do Paciente</h3>
          {id && <PatientDocuments patientId={id} />}
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
              <Button onClick={handleSaveObservations} disabled={!canEdit('pacientes')} className="w-full sm:w-auto">Salvar Observações</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {reciboSession && patient && (
        <ReciboModal
          open={!!reciboSession}
          onClose={() => setReciboSession(null)}
          patient={patient}
          session={reciboSession}
        />
      )}
    </motion.div>
  );
};

export default ProntuarioPaciente;
