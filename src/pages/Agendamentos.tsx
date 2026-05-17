import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Calendar as CalendarIcon,
  Search,
  Trash2,
  Filter,
  List,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
  User,
  ExternalLink,
  Timer,
  Stethoscope,
  Bell,
  MessageCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AppointmentStatus, Appointment } from "@/types";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DENTIST_VARS, dentistStyle } from "@/lib/dentist-colors";
import { usePermissionsCtx } from "@/contexts/PermissionsContext";
import { useToast } from "@/hooks/use-toast";

type DateFilter = "dia" | "semana" | "mes" | "ano";
type MainTab = "agendamentos" | "historico";
type ViewMode = "calendario" | "lista";
type CalendarSubView = "dia" | "semana" | "mes";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SLOT_HEIGHT = 48; // px por slot de 30 min

const TIME_SLOTS: string[] = [];
for (let h = 8; h <= 18; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  if (h < 18) TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

const DURATION_OPTIONS = [
  { value: 1, label: "30 min" },
  { value: 2, label: "1h" },
  { value: 3, label: "1h30" },
  { value: 4, label: "2h" },
  { value: 5, label: "2h30" },
  { value: 6, label: "3h" },
];


const durationLabel = (d: number) => DURATION_OPTIONS.find((o) => o.value === d)?.label ?? `${d * 30} min`;

// Cores de status ainda usadas na lista e badges
const STATUS_COLORS: Record<AppointmentStatus, string> = {
  agendado: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  confirmado: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  realizado: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  falta: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  sugerido: "bg-gray-500 text-white dark:bg-gray-600 dark:text-white",
};

// Semáforo: ponto colorido por status
const SEMAPHORE_DOT: Record<AppointmentStatus, string> = {
  agendado: "bg-yellow-400",
  confirmado: "bg-green-500",
  realizado: "bg-blue-500",
  cancelado: "bg-red-500",
  falta: "bg-orange-500",
  sugerido: "bg-gray-400",
};

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  falta: "Falta",
  sugerido: "Sugerido",
};

// Atribui coluna e largura a cada agendamento para exibição lado a lado
function layoutAppointments(apps: Appointment[]): Array<{ app: Appointment; left: number; width: number }> {
  if (apps.length === 0) return [];
  const sorted = [...apps].sort((a, b) => {
    const d = TIME_SLOTS.indexOf(a.time) - TIME_SLOTS.indexOf(b.time);
    return d !== 0 ? d : a.patientName.localeCompare(b.patientName);
  });
  const colEnds: number[] = [];
  const colAssigned: number[] = [];
  for (const app of sorted) {
    const start = TIME_SLOTS.indexOf(app.time);
    const end = start + (app.duration ?? 1);
    let assigned = -1;
    for (let c = 0; c < colEnds.length; c++) {
      if (colEnds[c] <= start) { assigned = c; colEnds[c] = end; break; }
    }
    if (assigned === -1) { assigned = colEnds.length; colEnds.push(end); }
    colAssigned.push(assigned);
  }
  const totalCols = colEnds.length;
  return sorted.map((app, i) => ({
    app,
    left: colAssigned[i] / totalCols,
    width: 1 / totalCols,
  }));
}

// Verifica sobreposição considerando duração
function slotsOverlap(
  aStart: number, aDuration: number,
  bStart: number, bDuration: number
) {
  return aStart < bStart + bDuration && aStart + aDuration > bStart;
}

// ─── Dialog de exclusão com opção de notificar ───────────────────────────────
function DeleteAppointmentDialog({
  appointment,
  trigger,
  onDeleted,
}: {
  appointment: Appointment;
  trigger: React.ReactNode;
  onDeleted?: () => void;
}) {
  const { deleteAppointment, patients, clinicSettings } = useClinic();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState<"delete" | "notify" | null>(null);
  const patient = patients.find((p) => p.id === appointment.patientId);

  const doDelete = async () => {
    await deleteAppointment(appointment.id);
    setOpen(false);
    onDeleted?.();
  };

  const handleDelete = async () => {
    setLoading("delete");
    try { await doDelete(); } finally { setLoading(null); }
  };

  const handleDeleteAndNotify = async () => {
    setLoading("notify");
    try {
      await doDelete();

      if (!patient?.phone) {
        toast({ title: "Sem telefone", description: "Agendamento excluído, mas o paciente não tem telefone cadastrado.", variant: "destructive" });
        return;
      }

      const template = clinicSettings["msg_appointment_cancellation"]
        ?? "Olá, {{nome_paciente}}! Sua consulta do dia *{{data}}* foi cancelada. Entre em contato para reagendar. 📞";
      const dateStr = format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR });
      const message = template
        .replace(/\{\{nome_paciente\}\}/g, appointment.patientName)
        .replace(/\{\{data\}\}/g, dateStr);

      const webhookUrl = (import.meta.env.VITE_N8N_CANCELAMENTO_WEBHOOK_URL as string | undefined)
        ?? "http://localhost:5678/webhook-test/cancelar-consulta";

      try {
        await fetch(webhookUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patientName: appointment.patientName,
            phone: patient.phone,
            appointmentDate: appointment.date.toISOString(),
            appointmentTime: appointment.time,
            message,
          }),
        });
        toast({ title: "Paciente notificado", description: `Mensagem de cancelamento enviada para ${appointment.patientName}.` });
      } catch {
        toast({ title: "WhatsApp não enviado", description: "Agendamento excluído, mas a mensagem não foi enviada.", variant: "destructive" });
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="w-[calc(100%-2rem)] max-w-sm rounded-xl">
        <DialogHeader>
          <DialogTitle>Excluir agendamento</DialogTitle>
          <DialogDescription>
            Agendamento de <strong>{appointment.patientName}</strong> em{" "}
            {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.time}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2 pt-1">
          <Button
            variant="destructive"
            onClick={handleDeleteAndNotify}
            disabled={!!loading}
            className="w-full gap-2"
          >
            <MessageCircle className="h-4 w-4" />
            {loading === "notify" ? "Enviando..." : "Excluir e avisar paciente"}
          </Button>
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={!!loading}
            className="w-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          >
            {loading === "delete" ? "Excluindo..." : "Excluir sem notificar"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={!!loading} className="w-full">
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Card de detalhes do agendamento ────────────────────────────────────────
function AppointmentDetailCard({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { patients, professionals, appointments: allAppointments, updateAppointmentStatus, updateAppointmentTime, updateAppointmentProfessional, deleteAppointment } = useClinic();
  const { canDelete } = usePermissionsCtx();
  const patient = patients.find((p) => p.id === appointment.patientId);
  const professional = professionals.find((p) => p.id === appointment.professionalId);
  const proStyle = dentistStyle(professional?.name);

  const [editingTime, setEditingTime] = useState(false);
  const [newTime, setNewTime] = useState(appointment.time);
  const [newDate, setNewDate] = useState<Date>(new Date(appointment.date));
  const [newDuration, setNewDuration] = useState(appointment.duration ?? 1);
  const [saving, setSaving] = useState(false);

  const isSlotAvailable = (slot: string, slotDuration: number = newDuration) => {
    const targetStart = TIME_SLOTS.indexOf(slot);
    if (targetStart === -1) return false;
    if (targetStart + slotDuration > TIME_SLOTS.length) return false;
    return !allAppointments.some((a) => {
      if (a.id === appointment.id) return false;
      if (a.status === "cancelado") return false;
      if (a.professionalId !== appointment.professionalId) return false;
      if (new Date(a.date).toDateString() !== newDate.toDateString()) return false;
      const aStart = TIME_SLOTS.indexOf(a.time);
      if (aStart === -1) return false;
      return slotsOverlap(targetStart, slotDuration, aStart, a.duration ?? 1);
    });
  };

  const handleSaveTime = async () => {
    setSaving(true);
    try {
      await updateAppointmentTime(appointment.id, newDate, newTime, newDuration);
      setEditingTime(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Nome + status + telefone */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-lg">{appointment.patientName}</p>
          {patient?.phone && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
              <Phone className="h-3.5 w-3.5" />
              {patient.phone}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={cn("inline-block w-2.5 h-2.5 rounded-full", SEMAPHORE_DOT[appointment.status])} />
          <span className={cn("text-xs px-2 py-1 rounded-full font-medium", STATUS_COLORS[appointment.status])}>
            {STATUS_LABELS[appointment.status]}
          </span>
        </div>
      </div>

      {/* Dentista */}
      {professional && (
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full font-medium" style={proStyle}>
            {professional.name}
          </span>
        </div>
      )}

      {/* Agendado em */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
        <span>
          Agendado em:{" "}
          <span className="text-foreground font-medium">
            {format(new Date(appointment.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </span>
      </div>

      {/* Horário + duração */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Horário e duração</span>
          </div>
          {!editingTime && (
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingTime(true)}>
              Alterar
            </Button>
          )}
        </div>

        {!editingTime ? (
          <div className="pl-5 flex items-center gap-3">
            <p className="text-sm font-semibold">
              {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })} às {appointment.time}
            </p>
            <span className={cn("text-xs px-1.5 py-0.5 rounded", STATUS_COLORS[appointment.status])}>
              <Timer className="h-3 w-3 inline mr-0.5" />
              {durationLabel(appointment.duration ?? 1)}
            </span>
          </div>
        ) : (
          <div className="pl-5 space-y-3">
            {/* Nova data */}
            <div className="space-y-1">
              <Label className="text-xs">Nova data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start font-normal">
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {format(newDate, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single" selected={newDate} onSelect={(d) => d && setNewDate(d)}
                    initialFocus locale={ptBR} className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Duração */}
            <div className="space-y-1">
              <Label className="text-xs">Duração</Label>
              <Select value={String(newDuration)} onValueChange={(v) => setNewDuration(Number(v))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horário */}
            <div className="space-y-1">
              <Label className="text-xs">Horário</Label>
              <div className="grid grid-cols-3 gap-1 max-h-40 overflow-y-auto">
                {TIME_SLOTS.map((slot) => {
                  const available = isSlotAvailable(slot, newDuration);
                  return (
                    <Button key={slot} type="button"
                      variant={newTime === slot ? "default" : "outline"} size="sm"
                      disabled={!available}
                      className={cn("text-xs h-7", !available && "opacity-40 cursor-not-allowed")}
                      onClick={() => setNewTime(slot)}
                    >
                      {slot}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveTime} disabled={saving} className="flex-1">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditingTime(false)}>Cancelar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Dentista */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <Stethoscope className="h-3.5 w-3.5" /> Dentista
        </Label>
        <div className="flex flex-wrap gap-2">
          {professionals.map((pro) => {
            const selected = pro.id === appointment.professionalId;
            return (
              <button
                key={pro.id}
                type="button"
                style={dentistStyle(pro.name)}
                onClick={() => updateAppointmentProfessional(appointment.id, pro.id)}
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium transition-all border-2",
                  selected ? "border-current shadow-sm" : "border-transparent opacity-60 hover:opacity-100",
                )}
              >
                {pro.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground flex items-center gap-1">
          <User className="h-3.5 w-3.5" /> Status
        </Label>
        <Select value={appointment.status}
          onValueChange={(v) => updateAppointmentStatus(appointment.id, v as AppointmentStatus)}>
          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="agendado">Agendado</SelectItem>
            <SelectItem value="confirmado">Confirmado</SelectItem>
            <SelectItem value="realizado">Realizado</SelectItem>
            <SelectItem value="falta">Falta</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Perfil */}
      <Button variant="outline" size="sm" className="w-full gap-2"
        onClick={() => { onClose(); navigate(`/pacientes/${appointment.patientId}`); }}>
        <ExternalLink className="h-3.5 w-3.5" />
        Ver perfil do paciente
      </Button>

      {/* Excluir */}
      {canDelete('agenda') && (
        <DeleteAppointmentDialog
          appointment={appointment}
          onDeleted={onClose}
          trigger={
            <Button variant="ghost" size="sm" className="w-full gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" />
              Excluir agendamento
            </Button>
          }
        />
      )}
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────
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
    returnAlerts,
    deleteReturnAlert,
    sendReturnAlertWhatsApp,
    getPatientById,
    clinicSettings,
  } = useClinic();

  const [isOpen, setIsOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("agendamentos");
  const [dateFilter, setDateFilter] = useState<DateFilter>("dia");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const viewMode = (clinicSettings['agenda_view_mode'] ?? 'calendario') as ViewMode;
  const [calendarSubView, setCalendarSubView] = useState<CalendarSubView>("dia");
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [detailAppointment, setDetailAppointment] = useState<Appointment | null>(null);
  const [formData, setFormData] = useState({
    patientId: "",
    professionalId: "",
    date: "",
    time: "",
    duration: 1,
  });

  // Verifica disponibilidade por dentista — mesmo horário é permitido para dentistas diferentes
  const isSlotAvailable = (date: string, time: string, duration: number = 1, professionalId?: string, excludeId?: string) => {
    if (!date) return true;
    const targetStart = TIME_SLOTS.indexOf(time);
    if (targetStart === -1) return false;
    if (targetStart + duration > TIME_SLOTS.length) return false;
    const dateStr = new Date(date).toDateString();
    return !appointments.some((app) => {
      if (excludeId && app.id === excludeId) return false;
      if (app.status === "cancelado") return false;
      if (professionalId && app.professionalId !== professionalId) return false;
      if (new Date(app.date).toDateString() !== dateStr) return false;
      const appStart = TIME_SLOTS.indexOf(app.time);
      if (appStart === -1) return false;
      return slotsOverlap(targetStart, duration, appStart, app.duration ?? 1);
    });
  };

  const [historyFilters, setHistoryFilters] = useState({
    patientName: "",
    dateFrom: "",
    dateTo: "",
    status: "all" as AppointmentStatus | "all",
  });

  const selectedPatient = patients.find((p) => p.id === formData.patientId);

  const { canCreate, canEdit, canDelete } = usePermissionsCtx();

  const activeAlerts = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today); in7Days.setDate(today.getDate() + 7);
    return returnAlerts
      .filter(a => {
        if (a.whatsappSent) return false;
        const rd = new Date(a.returnDate); rd.setHours(0, 0, 0, 0);
        return rd <= in7Days;
      })
      .sort((a, b) => a.returnDate.getTime() - b.returnDate.getTime());
  }, [returnAlerts]);

  const activeAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return appointments.filter((app) => {
      if (app.deletedAt) return false;
      const appDate = new Date(app.date);
      const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
      if (appDay < today) return false;
      if (customStartDate) {
        const startDay = new Date(customStartDate.getFullYear(), customStartDate.getMonth(), customStartDate.getDate());
        if (customEndDate) {
          const endDay = new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate());
          return appDay >= startDay && appDay <= endDay;
        }
        return appDay.getTime() === startDay.getTime();
      }
      switch (dateFilter) {
        case "dia": return appDay.getTime() === today.getTime();
        case "semana": {
          const ws = new Date(today); ws.setDate(today.getDate() - today.getDay());
          const we = new Date(ws); we.setDate(ws.getDate() + 6);
          return appDay >= ws && appDay <= we;
        }
        case "mes": return appDate.getMonth() === now.getMonth() && appDate.getFullYear() === now.getFullYear();
        case "ano": return appDate.getFullYear() === now.getFullYear();
        default: return true;
      }
    });
  }, [appointments, dateFilter, customStartDate, customEndDate]);

  const historyAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return appointments
      .filter((app) => {
        if (app.deletedAt) return false;
        const appDate = new Date(app.date);
        const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
        if (appDay >= today) return false;
        if (historyFilters.patientName && !app.patientName.toLowerCase().includes(historyFilters.patientName.toLowerCase())) return false;
        if (historyFilters.dateFrom) {
          const from = new Date(historyFilters.dateFrom + "T00:00:00");
          if (appDay < new Date(from.getFullYear(), from.getMonth(), from.getDate())) return false;
        }
        if (historyFilters.dateTo) {
          const to = new Date(historyFilters.dateTo + "T00:00:00");
          if (appDay > new Date(to.getFullYear(), to.getMonth(), to.getDate())) return false;
        }
        if (historyFilters.status !== "all" && app.status !== historyFilters.status) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [appointments, historyFilters]);

  const navigateDay = (dir: -1 | 1) =>
    setCalendarDate((p) => { const d = new Date(p); d.setDate(d.getDate() + dir); return d; });
  const navigateWeek = (dir: -1 | 1) =>
    setCalendarDate((p) => { const d = new Date(p); d.setDate(d.getDate() + dir * 7); return d; });
  const navigateMonth = (dir: -1 | 1) =>
    setCalendarDate((p) => { const d = new Date(p); d.setMonth(d.getMonth() + dir); return d; });

  const weekDays = useMemo(() => {
    const start = new Date(calendarDate);
    start.setDate(start.getDate() - start.getDay());
    start.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(start.getDate() + i); return d; });
  }, [calendarDate]);

  const monthGrid = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [calendarDate]);

  const getAppointmentsForDay = (day: Date) =>
    appointments
      .filter((app) => {
        const d = new Date(app.date);
        return d.getFullYear() === day.getFullYear() && d.getMonth() === day.getMonth() && d.getDate() === day.getDate();
      })
      .sort((a, b) => a.time.localeCompare(b.time));

  const isToday = (day: Date) => {
    const t = new Date();
    return day.getFullYear() === t.getFullYear() && day.getMonth() === t.getMonth() && day.getDate() === t.getDate();
  };

  const dayLabel = useMemo(
    () => format(calendarDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }),
    [calendarDate]
  );

  const weekRangeLabel = useMemo(() => {
    if (!weekDays.length) return "";
    const s = weekDays[0], e = weekDays[6];
    if (s.getMonth() === e.getMonth())
      return `${format(s, "d")} – ${format(e, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}`;
    return `${format(s, "d MMM", { locale: ptBR })} – ${format(e, "d MMM yyyy", { locale: ptBR })}`;
  }, [weekDays]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !formData.patientId || !formData.professionalId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await addAppointment({
        patientId: selectedPatient.id,
        patientName: selectedPatient.fullName,
        professionalId: formData.professionalId,
        date: new Date(formData.date + 'T12:00:00'),
        time: formData.time,
        duration: formData.duration,
        status: "agendado",
      });
      setIsOpen(false);
      setFormData({ patientId: "", professionalId: "", date: "", time: "", duration: 1 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: AppointmentStatus) => {
    const variants: Record<AppointmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
      agendado: "outline", confirmado: "default", realizado: "secondary",
      cancelado: "destructive", falta: "destructive", sugerido: "outline",
    };
    return (
      <div className="flex items-center gap-1.5">
        <span className={cn("inline-block w-2.5 h-2.5 rounded-full flex-shrink-0", SEMAPHORE_DOT[status])} />
        <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>
      </div>
    );
  };

  // ── Pill clicável ─────────────────────────────────────────────────────────
  const AppointmentPill = ({ app, compact = false }: { app: Appointment; compact?: boolean }) => {
    const pro = professionals.find((p) => p.id === app.professionalId);
    return (
      <Dialog open={detailAppointment?.id === app.id} onOpenChange={(open) => !open && setDetailAppointment(null)}>
        <DialogTrigger asChild>
          <div
            className={cn(
              "rounded-md cursor-pointer hover:opacity-80 transition-opacity h-full w-full overflow-hidden",
              compact ? "p-1 text-xs" : "p-2 text-sm",
            )}
            style={dentistStyle(pro?.name)}
            onClick={() => setDetailAppointment(app)}
          >
            <div className="font-semibold truncate mb-0.5 flex items-center gap-1">
              <span className={cn("inline-block w-2 h-2 rounded-full flex-shrink-0", SEMAPHORE_DOT[app.status])} />
              {app.patientName}
            </div>
            {!compact && (
              <div className="opacity-75 text-xs flex items-center gap-0.5">
                <Timer className="h-3 w-3" />
                {durationLabel(app.duration ?? 1)}
              </div>
            )}
          </div>
        </DialogTrigger>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[420px] rounded-xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>Consulta do dia {format(new Date(app.date), "dd/MM/yyyy", { locale: ptBR })}</DialogDescription>
          </DialogHeader>
          <AppointmentDetailCard appointment={app} onClose={() => setDetailAppointment(null)} />
        </DialogContent>
      </Dialog>
    );
  };

  // ── Grade de horários (dia e semana) ──────────────────────────────────────
  const TimeGrid = ({ days, className }: { days: Date[]; className?: string }) => {
    const isSingleDay = days.length === 1;
    const totalH = TIME_SLOTS.length * SLOT_HEIGHT;

    return (
      <div
        className={cn("border rounded-lg overflow-hidden", className)}
        style={{
          display: "grid",
          gridTemplateColumns: `clamp(2.5rem, 12%, 4.5rem) repeat(${days.length}, 1fr)`,
          gridTemplateRows: `auto ${totalH}px`,
        }}
      >
        {/* Cabeçalho */}
        <div className="bg-muted border-b border-r" style={{ gridRow: 1, gridColumn: 1 }} />
        {days.map((day, di) => (
          <div
            key={di}
            className={cn(
              "bg-muted border-b border-r px-1 py-1.5 text-center",
              isToday(day) && "bg-primary text-primary-foreground",
            )}
            style={{ gridRow: 1, gridColumn: di + 2 }}
          >
            <div className={cn("text-[10px] font-medium uppercase tracking-wide", isToday(day) ? "text-primary-foreground/80" : "text-muted-foreground")}>
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div className={cn("text-base font-bold leading-none mt-0.5", isToday(day) ? "text-primary-foreground" : "text-foreground")}>
              {format(day, "d")}
            </div>
          </div>
        ))}

        {/* Coluna de horários */}
        <div
          className="border-r bg-muted/40 relative"
          style={{ gridRow: 2, gridColumn: 1, height: totalH }}
        >
          {TIME_SLOTS.map((slot, si) => (
            <div
              key={slot}
              className="absolute w-full border-b flex items-start justify-center pt-0.5 text-xs font-mono text-muted-foreground"
              style={{ top: si * SLOT_HEIGHT, height: SLOT_HEIGHT }}
            >
              {slot}
            </div>
          ))}
        </div>

        {/* Colunas de dias — posicionamento absoluto com side-by-side */}
        {days.map((day, di) => {
          const layout = layoutAppointments(getAppointmentsForDay(day));
          return (
            <div
              key={di}
              className="relative border-r"
              style={{ gridRow: 2, gridColumn: di + 2, height: totalH }}
            >
              {/* Linhas de fundo */}
              {TIME_SLOTS.map((_, si) => (
                <div
                  key={si}
                  className="absolute w-full border-b"
                  style={{ top: si * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                />
              ))}

              {/* Agendamentos lado a lado */}
              {layout.map(({ app, left, width }) => {
                const startIdx = TIME_SLOTS.indexOf(app.time);
                if (startIdx === -1) return null;
                const duration = app.duration ?? 1;
                return (
                  <div
                    key={app.id}
                    className="absolute p-0.5 z-10"
                    style={{
                      top: startIdx * SLOT_HEIGHT + 1,
                      height: duration * SLOT_HEIGHT - 2,
                      left: `${left * 100}%`,
                      width: `${width * 100}%`,
                    }}
                  >
                    <AppointmentPill app={app} compact={!isSingleDay || width < 1} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie todas as consultas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto" disabled={!canCreate('agenda')}>
              <Plus className="h-5 w-5" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-[500px] rounded-xl">
            <DialogHeader>
              <DialogTitle>Novo Agendamento</DialogTitle>
              <DialogDescription>Selecione paciente, data, duração e horário.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Paciente */}
              <div>
                <Label>Paciente</Label>
                <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {selectedPatient?.fullName || "Selecione um paciente..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Buscar paciente..." />
                      <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                      <CommandList>
                        <CommandGroup>
                          {patients.map((patient) => (
                            <CommandItem key={patient.id} value={patient.fullName}
                              onSelect={() => { setFormData({ ...formData, patientId: patient.id }); setSearchOpen(false); }}>
                              {patient.fullName}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Dentista */}
              <div className="space-y-2">
                <Label>Dentista</Label>
                <div className="flex gap-2 flex-wrap">
                  {professionals.map((pro) => {
                    const selected = formData.professionalId === pro.id;
                    return (
                      <button
                        key={pro.id}
                        type="button"
                        onClick={() => setFormData({ ...formData, professionalId: pro.id, time: "" })}
                        style={dentistStyle(pro.name)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-sm font-medium transition-all border-2",
                          selected ? "border-current shadow-sm scale-105" : "border-transparent opacity-70 hover:opacity-100",
                        )}
                      >
                        {pro.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Data */}
              <div className="space-y-2">
                <Label>Data da Consulta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formData.date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.date ? format(new Date(formData.date + 'T12:00:00'), "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single"
                      selected={formData.date ? new Date(formData.date + 'T12:00:00') : undefined}
                      onSelect={(date) => date && setFormData({ ...formData, date: format(date, "yyyy-MM-dd"), time: "" })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus locale={ptBR} className="p-3 pointer-events-auto"
                      modifiers={{ today: new Date() }}
                      modifiersClassNames={{ today: "bg-gray-500 text-white font-semibold rounded-md" }}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Duração */}
              {formData.date && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Timer className="h-4 w-4" /> Duração do procedimento
                  </Label>
                  <div className="flex gap-2 flex-wrap">
                    {DURATION_OPTIONS.map((o) => (
                      <Button key={o.value} type="button" size="sm"
                        variant={formData.duration === o.value ? "default" : "outline"}
                        onClick={() => setFormData({ ...formData, duration: o.value, time: "" })}
                      >
                        {o.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Horários */}
              {formData.date && (
                <div className="space-y-2">
                  <Label>Horário de Início</Label>
                  <div className="grid grid-cols-3 gap-2 max-h-[260px] overflow-y-auto p-2 border rounded-lg">
                    {TIME_SLOTS.map((slot) => {
                      const available = isSlotAvailable(formData.date, slot, formData.duration, formData.professionalId);
                      const selected = formData.time === slot;
                      // Oculta slots onde a duração ultrapassaria o fim do dia
                      const startIdx = TIME_SLOTS.indexOf(slot);
                      if (startIdx + formData.duration > TIME_SLOTS.length) return null;
                      return (
                        <Button key={slot} type="button"
                          variant={selected ? "default" : "outline"} size="sm"
                          disabled={!available}
                          onClick={() => setFormData({ ...formData, time: slot })}
                          className={cn("transition-all", !available && "opacity-40 cursor-not-allowed", selected && "ring-2 ring-primary ring-offset-2")}
                        >
                          {slot}
                        </Button>
                      );
                    })}
                  </div>
                  {!formData.time && <p className="text-xs text-muted-foreground">Selecione um horário disponível</p>}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting || !formData.time || !formData.professionalId}>
                  {isSubmitting ? "Agendando..." : "Agendar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as MainTab)}>
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto sm:mx-0">
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="agendamentos" className="mt-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-start">
          <div className="flex-1 min-w-0 w-full space-y-4">
          {/* Toggle principal + sub-toggle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              {viewMode === "lista" && (
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                  <Filter className="h-4 w-4" />
                  {showFilters ? "Ocultar" : "Filtros"}
                </Button>
              )}
              {viewMode === "lista" && !showFilters && (customStartDate || customEndDate) && (
                <Badge variant="secondary">
                  {customStartDate && format(customStartDate, "dd/MM", { locale: ptBR })}
                  {customEndDate && ` - ${format(customEndDate, "dd/MM", { locale: ptBR })}`}
                </Badge>
              )}
            </div>
            {viewMode === "calendario" && (
              <div className="grid grid-cols-3 border rounded-lg p-1 gap-1 w-full">
                {(["dia", "semana", "mes"] as CalendarSubView[]).map((sv) => (
                  <Button key={sv} variant={calendarSubView === sv ? "secondary" : "ghost"} size="sm"
                    className="w-full"
                    onClick={() => setCalendarSubView(sv)}>
                    {sv.charAt(0).toUpperCase() + sv.slice(1)}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* ══ DIA ══════════════════════════════════════════════════════════ */}
          {viewMode === "calendario" && calendarSubView === "dia" && (
            <div className="space-y-3">
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 w-full">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigateDay(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-col items-center gap-0.5 min-w-0">
                  <span className="text-[11px] font-medium text-muted-foreground capitalize">
                    {format(calendarDate, "EEEE", { locale: ptBR })}
                  </span>
                  <span className="text-sm font-bold leading-none text-center">
                    {format(calendarDate, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                </div>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigateDay(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <TimeGrid days={[calendarDate]} />
            </div>
          )}

          {/* ══ SEMANA ═══════════════════════════════════════════════════════ */}
          {viewMode === "calendario" && calendarSubView === "semana" && (
            <div className="space-y-3">
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 w-full">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigateWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-medium text-sm capitalize text-center">{weekRangeLabel}</span>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigateWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div style={{ minWidth: 720 }}>
                  <TimeGrid days={weekDays} />
                </div>
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {Object.keys(DENTIST_VARS).map((name) => (
                  <div key={name} className="text-xs px-2 py-0.5 rounded-full font-medium" style={dentistStyle(name)}>{name}</div>
                ))}
              </div>
            </div>
          )}

          {/* ══ MÊS ══════════════════════════════════════════════════════════ */}
          {viewMode === "calendario" && calendarSubView === "mes" && (
            <div className="space-y-3">
              <div className="grid grid-cols-[2.5rem_1fr_2.5rem] items-center gap-2 w-full">
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-semibold text-center">{MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                <Button variant="outline" size="icon" className="h-10 w-10" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((n) => (
                  <div key={n} className="text-center text-xs font-medium text-muted-foreground py-2">{n}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
                {monthGrid.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} className="min-h-[44px] sm:min-h-[80px]" />;
                  const dayApps = getAppointmentsForDay(day);
                  const today = isToday(day);
                  return (
                    <button key={idx}
                      onClick={() => { setCalendarDate(day); setCalendarSubView("dia"); }}
                      className={cn(
                        "min-h-[44px] sm:min-h-[80px] p-0.5 sm:p-1 rounded-lg border text-left transition-colors hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50",
                        today ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <div className={cn("text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full", today && "bg-primary text-primary-foreground")}>
                        {day.getDate()}
                      </div>
                      {/* Mobile: só mostra ponto indicador se tiver consultas */}
                      {dayApps.length > 0 && (
                        <div className="flex gap-0.5 flex-wrap sm:hidden mt-0.5">
                          {dayApps.slice(0, 3).map((app) => (
                            <span key={app.id} className={cn("inline-block w-1.5 h-1.5 rounded-full", SEMAPHORE_DOT[app.status])} />
                          ))}
                        </div>
                      )}
                      <div className="space-y-0.5 hidden sm:block">
                        {dayApps.slice(0, 3).map((app) => {
                          const pro = professionals.find((p) => p.id === app.professionalId);
                          return (
                            <div key={app.id} className="text-xs rounded px-1 py-0.5 truncate flex items-center gap-1"
                              style={dentistStyle(pro?.name)}>
                              <span className={cn("inline-block w-1.5 h-1.5 rounded-full flex-shrink-0", SEMAPHORE_DOT[app.status])} />
                              {app.time} {app.patientName}
                            </div>
                          );
                        })}
                        {dayApps.length > 3 && (
                          <div className="text-xs text-muted-foreground px-1">+{dayApps.length - 3} mais</div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-3 items-center">
                {Object.keys(DENTIST_VARS).map((name) => (
                  <div key={name} className="text-xs px-2 py-0.5 rounded-full font-medium" style={dentistStyle(name)}>{name}</div>
                ))}
              </div>
            </div>
          )}

          {/* ══ LISTA ════════════════════════════════════════════════════════ */}
          {viewMode === "lista" && (
            <>
              {showFilters && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      {(["dia", "semana", "mes"] as DateFilter[]).map((f, i) => (
                        <Button key={f} variant={dateFilter === f && !customStartDate ? "default" : "ghost"} size="sm"
                          onClick={() => { setDateFilter(f); setCustomStartDate(undefined); setCustomEndDate(undefined); }}>
                          {["Hoje", "Esta Semana", "Este Mês"][i]}
                        </Button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2 sm:ml-2 sm:pl-2 sm:border-l justify-center">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={customStartDate ? "default" : "ghost"} size="sm">
                            {customStartDate ? format(customStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Início"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate}
                            initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant={customEndDate ? "default" : "ghost"} size="sm" disabled={!customStartDate}>
                            {customEndDate ? format(customEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Fim"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate}
                            disabled={(d) => customStartDate ? d < customStartDate : false}
                            initialFocus className="p-3 pointer-events-auto" />
                        </PopoverContent>
                      </Popover>
                      {(customStartDate || customEndDate) && (
                        <Button variant="ghost" size="sm"
                          onClick={() => { setCustomStartDate(undefined); setCustomEndDate(undefined); setDateFilter("dia"); }}>
                          Limpar
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
              <div className="grid gap-4">
                {activeAppointments.map((appointment, index) => (
                  <motion.div key={appointment.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                    <Card>
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          <div className="flex items-start gap-3 sm:gap-4 flex-1">
                            <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                              <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <Dialog open={detailAppointment?.id === appointment.id}
                                onOpenChange={(open) => !open && setDetailAppointment(null)}>
                                <DialogTrigger asChild>
                                  <h3 className="font-semibold text-base sm:text-lg truncate cursor-pointer hover:text-primary transition-colors"
                                    onClick={() => setDetailAppointment(appointment)}>
                                    {appointment.patientName}
                                  </h3>
                                </DialogTrigger>
                                <DialogContent className="w-[calc(100%-2rem)] max-w-[420px] rounded-xl">
                                  <DialogHeader>
                                    <DialogTitle>Detalhes do Agendamento</DialogTitle>
                                    <DialogDescription>Consulta do dia {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}</DialogDescription>
                                  </DialogHeader>
                                  <AppointmentDetailCard appointment={appointment} onClose={() => setDetailAppointment(null)} />
                                </DialogContent>
                              </Dialog>
                              <p className="text-xs sm:text-sm mt-1">
                                {appointment.date.toLocaleDateString("pt-BR")} às {appointment.time}
                                {" · "}
                                <span className="text-muted-foreground">{durationLabel(appointment.duration ?? 1)}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                            <Select value={appointment.status}
                              disabled={!canEdit('agenda')}
                              onValueChange={(v) => updateAppointmentStatus(appointment.id, v as AppointmentStatus)}>
                              <SelectTrigger className="w-full sm:w-[140px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agendado">Agendado</SelectItem>
                                <SelectItem value="confirmado">Confirmado</SelectItem>
                                <SelectItem value="realizado">Realizado</SelectItem>
                                <SelectItem value="falta">Falta</SelectItem>
                                <SelectItem value="cancelado">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                              <DeleteAppointmentDialog
                                appointment={appointment}
                                trigger={
                                  <Button variant="ghost" size="icon" disabled={!canDelete('agenda')} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                }
                              />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
                {activeAppointments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado para este período.</p>
                )}
              </div>
            </>
          )}
          </div>{/* fim coluna principal */}

          {/* ── Sidebar: alertas de retorno ────────────────────────────── */}
          <div className="w-full lg:w-72 shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Alertas de Retorno
                  {activeAlerts.length > 0 && (
                    <span className="ml-auto text-xs font-normal bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                      {activeAlerts.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {activeAlerts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum alerta pendente</p>
                ) : (
                  <div className="space-y-3">
                    {activeAlerts.map(alert => {
                      const alertPatient = getPatientById(alert.patientId);
                      if (!alertPatient) return null;
                      const today = new Date(); today.setHours(0, 0, 0, 0);
                      const rd = new Date(alert.returnDate); rd.setHours(0, 0, 0, 0);
                      const diffDays = Math.round((rd.getTime() - today.getTime()) / 86400000);
                      const isOverdue = diffDays < 0;
                      const isUrgent = diffDays >= 0 && diffDays <= 14;
                      return (
                        <div key={alert.id} className={cn(
                          "rounded-lg border p-3 space-y-2",
                          isOverdue ? "border-destructive/50 bg-destructive/5"
                            : isUrgent ? "border-orange-400/50 bg-orange-50 dark:bg-orange-950/20"
                            : "border-border"
                        )}>
                          <div
                            className="min-w-0 cursor-pointer hover:opacity-75 transition-opacity"
                            onClick={() => navigate(`/pacientes/${alertPatient.id}`)}
                          >
                            <p className="text-sm font-medium truncate">{alertPatient.fullName}</p>
                            <p className={cn("text-xs mt-0.5", isOverdue ? "text-destructive font-medium" : isUrgent ? "text-orange-600" : "text-muted-foreground")}>
                              {isOverdue
                                ? `Vencido há ${Math.abs(diffDays)} dia${Math.abs(diffDays) !== 1 ? 's' : ''}`
                                : diffDays === 0 ? "Retorno hoje!"
                                : `Em ${diffDays} dia${diffDays !== 1 ? 's' : ''}`}
                              {" · "}{rd.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </p>
                            {alert.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{alert.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              className="flex-1 h-7 text-xs gap-1"
                              onClick={() => sendReturnAlertWhatsApp(alert.id)}
                            >
                              <MessageCircle className="h-3 w-3" />
                              Enviar WhatsApp
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir alerta</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Deseja excluir o alerta de retorno de {alertPatient.fullName}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteReturnAlert(alert.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          </div>{/* fim flex container */}
        </TabsContent>

        {/* ══ HISTÓRICO ════════════════════════════════════════════════════ */}
        <TabsContent value="historico" className="space-y-4 mt-6">
          <Card className="overflow-hidden">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Filtros</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="filter-patient">Nome do Paciente</Label>
                  <Input id="filter-patient" placeholder="Buscar por nome..."
                    value={historyFilters.patientName}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, patientName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="filter-date-from">De</Label>
                  <Input id="filter-date-from" type="date" value={historyFilters.dateFrom}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, dateFrom: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="filter-date-to">Até</Label>
                  <Input id="filter-date-to" type="date" value={historyFilters.dateTo}
                    min={historyFilters.dateFrom || undefined}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, dateTo: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={historyFilters.status}
                    onValueChange={(v) => setHistoryFilters({ ...historyFilters, status: v as AppointmentStatus | "all" })}>
                    <SelectTrigger id="filter-status"><SelectValue placeholder="Todos" /></SelectTrigger>
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
              {(historyFilters.patientName || historyFilters.dateFrom || historyFilters.dateTo || historyFilters.status !== "all") && (
                <Button variant="outline" size="sm" className="mt-3 w-full sm:w-auto"
                  onClick={() => setHistoryFilters({ patientName: "", dateFrom: "", dateTo: "", status: "all" })}>
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-3">
            {historyAppointments.map((appointment, index) => (
              <motion.div key={appointment.id} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}>
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="flex items-start gap-3">
                      {/* Ícone */}
                      <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0 mt-0.5">
                        <CalendarIcon className="h-4 w-4 text-primary" />
                      </div>

                      {/* Conteúdo principal */}
                      <div className="flex-1 min-w-0">

                        {/* Nome + lixeira */}
                        <div className="flex items-start justify-between gap-2">
                          <Dialog open={detailAppointment?.id === appointment.id}
                            onOpenChange={(open) => !open && setDetailAppointment(null)}>
                            <DialogTrigger asChild>
                              <h3
                                className="font-semibold text-sm leading-snug cursor-pointer hover:text-primary transition-colors break-words"
                                onClick={() => setDetailAppointment(appointment)}
                              >
                                {appointment.patientName}
                              </h3>
                            </DialogTrigger>
                            <DialogContent className="w-[calc(100%-2rem)] max-w-[420px] rounded-xl">
                              <DialogHeader>
                                <DialogTitle>Detalhes do Agendamento</DialogTitle>
                                <DialogDescription>Consulta do dia {format(new Date(appointment.date), "dd/MM/yyyy", { locale: ptBR })}</DialogDescription>
                              </DialogHeader>
                              <AppointmentDetailCard appointment={appointment} onClose={() => setDetailAppointment(null)} />
                            </DialogContent>
                          </Dialog>
                          <DeleteAppointmentDialog
                            appointment={appointment}
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={!canDelete('agenda')}
                                className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            }
                          />
                        </div>

                        {/* Data e horário */}
                        <p className="text-xs text-muted-foreground mt-1">
                          {appointment.date.toLocaleDateString("pt-BR")} às {appointment.time}
                          {" · "}
                          {durationLabel(appointment.duration ?? 1)}
                        </p>

                        {/* Status */}
                        <div className="mt-2">
                          {getStatusBadge(appointment.status)}
                        </div>

                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
            {historyAppointments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {historyFilters.patientName || historyFilters.dateFrom || historyFilters.dateTo || historyFilters.status !== "all"
                  ? "Nenhum agendamento encontrado com os filtros aplicados."
                  : "Nenhum agendamento no histórico."}
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
