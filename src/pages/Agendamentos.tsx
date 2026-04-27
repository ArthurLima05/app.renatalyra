import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent } from "@/components/ui/card";
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

type DateFilter = "dia" | "semana" | "mes" | "ano";
type MainTab = "agendamentos" | "historico";
type ViewMode = "calendario" | "lista";
type CalendarSubView = "dia" | "semana" | "mes";

const DAY_NAMES = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const SLOT_HEIGHT = 32; // px por slot de 30 min

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
  agendado: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  confirmado: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  realizado: "bg-gray-100 text-gray-700 dark:bg-gray-700/40 dark:text-gray-300",
  cancelado: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  falta: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  sugerido: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
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

// ─── Card de detalhes do agendamento ────────────────────────────────────────
function AppointmentDetailCard({
  appointment,
  onClose,
}: {
  appointment: Appointment;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const { patients, professionals, appointments: allAppointments, updateAppointmentStatus, updateAppointmentTime, updateAppointmentProfessional } = useClinic();
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
        <span className={cn("text-xs px-2 py-1 rounded-full font-medium flex-shrink-0", STATUS_COLORS[appointment.status])}>
          {STATUS_LABELS[appointment.status]}
        </span>
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
  } = useClinic();

  const [isOpen, setIsOpen] = useState(false);
  const [mainTab, setMainTab] = useState<MainTab>("agendamentos");
  const [dateFilter, setDateFilter] = useState<DateFilter>("dia");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [viewMode, setViewMode] = useState<ViewMode>("calendario");
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
    date: "",
    time: "",
    status: "all" as AppointmentStatus | "all",
  });

  const selectedPatient = patients.find((p) => p.id === formData.patientId);

  const activeAppointments = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return appointments.filter((app) => {
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
        const appDate = new Date(app.date);
        const appDay = new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate());
        if (appDay >= today) return false;
        if (historyFilters.patientName && !app.patientName.toLowerCase().includes(historyFilters.patientName.toLowerCase())) return false;
        if (historyFilters.date) {
          const fd = new Date(historyFilters.date);
          if (appDay.getTime() !== new Date(fd.getFullYear(), fd.getMonth(), fd.getDate()).getTime()) return false;
        }
        if (historyFilters.time && app.time !== historyFilters.time) return false;
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
        date: new Date(formData.date),
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
    return <Badge variant={variants[status]}>{STATUS_LABELS[status]}</Badge>;
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
            <div className="font-semibold truncate mb-0.5">
              {compact ? app.patientName.split(" ")[0] : app.patientName}
            </div>
            {!compact && (
              <div className="opacity-75 text-xs flex items-center gap-0.5">
                <Timer className="h-3 w-3" />
                {durationLabel(app.duration ?? 1)}
              </div>
            )}
          </div>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[420px]">
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
  const TimeGrid = ({ days }: { days: Date[] }) => {
    const isSingleDay = days.length === 1;
    const totalH = TIME_SLOTS.length * SLOT_HEIGHT;

    return (
      <div
        className="border rounded-lg overflow-hidden"
        style={{
          display: "grid",
          gridTemplateColumns: `72px repeat(${days.length}, 1fr)`,
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
            {isSingleDay ? (
              <div className="text-xs text-muted-foreground font-medium">Consulta</div>
            ) : (
              <>
                <div className="text-xs font-medium">{DAY_NAMES[day.getDay()]}</div>
                <div className="text-sm font-bold">{format(day, "d")}</div>
              </>
            )}
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
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Gerencie todas as consultas</p>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-5 w-5" />
              Novo Agendamento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
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
                      {formData.date ? format(new Date(formData.date), "PPP", { locale: ptBR }) : "Selecione a data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single"
                      selected={formData.date ? new Date(formData.date) : undefined}
                      onSelect={(date) => date && setFormData({ ...formData, date: format(date, "yyyy-MM-dd"), time: "" })}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus locale={ptBR} className="p-3 pointer-events-auto"
                      modifiers={{ today: new Date() }}
                      modifiersClassNames={{ today: "bg-gray-200 text-black font-semibold rounded-md" }}
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
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="agendamentos" className="space-y-4 mt-6">
          {/* Toggle principal + sub-toggle */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center border rounded-lg p-1 gap-1">
                <Button variant={viewMode === "calendario" ? "secondary" : "ghost"} size="sm"
                  onClick={() => setViewMode("calendario")} className="gap-2">
                  <CalendarIcon className="h-4 w-4" /> Calendário
                </Button>
                <Button variant={viewMode === "lista" ? "secondary" : "ghost"} size="sm"
                  onClick={() => setViewMode("lista")} className="gap-2">
                  <List className="h-4 w-4" /> Lista
                </Button>
              </div>
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
              <div className="flex items-center border rounded-lg p-1 gap-1 w-fit">
                {(["dia", "semana", "mes"] as CalendarSubView[]).map((sv) => (
                  <Button key={sv} variant={calendarSubView === sv ? "secondary" : "ghost"} size="sm"
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
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateDay(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-medium text-sm capitalize">{dayLabel}</span>
                <Button variant="outline" size="sm" onClick={() => navigateDay(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <TimeGrid days={[calendarDate]} />
            </div>
          )}

          {/* ══ SEMANA ═══════════════════════════════════════════════════════ */}
          {viewMode === "calendario" && calendarSubView === "semana" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-medium text-sm capitalize">{weekRangeLabel}</span>
                <Button variant="outline" size="sm" onClick={() => navigateWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="overflow-x-auto pb-2">
                <div className="min-w-[700px]">
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
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => navigateMonth(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="font-semibold">{MONTH_NAMES[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
                <Button variant="outline" size="sm" onClick={() => navigateMonth(1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {DAY_NAMES.map((n) => (
                  <div key={n} className="text-center text-xs font-medium text-muted-foreground py-2">{n}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthGrid.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} className="min-h-[80px]" />;
                  const dayApps = getAppointmentsForDay(day);
                  const today = isToday(day);
                  return (
                    <button key={idx}
                      onClick={() => { setCalendarDate(day); setCalendarSubView("dia"); }}
                      className={cn(
                        "min-h-[80px] p-1 rounded-lg border text-left transition-colors hover:bg-secondary/60 focus:outline-none focus:ring-2 focus:ring-primary/50",
                        today ? "border-primary bg-primary/5" : "border-border",
                      )}
                    >
                      <div className={cn("text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full", today && "bg-primary text-primary-foreground")}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-0.5">
                        {dayApps.slice(0, 3).map((app) => {
                          const pro = professionals.find((p) => p.id === app.professionalId);
                          return (
                            <div key={app.id} className="text-xs rounded px-1 py-0.5 truncate"
                              style={dentistStyle(pro?.name)}>
                              {app.time} {app.patientName.split(" ")[0]}
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
                                <DialogContent className="sm:max-w-[420px]">
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
                              onValueChange={(v) => updateAppointmentStatus(appointment.id, v as AppointmentStatus)}>
                              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="agendado">Agendado</SelectItem>
                                <SelectItem value="confirmado">Confirmado</SelectItem>
                                <SelectItem value="realizado">Realizado</SelectItem>
                                <SelectItem value="falta">Falta</SelectItem>
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
                                    Tem certeza que deseja excluir o agendamento de {appointment.patientName}?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteAppointment(appointment.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
                ))}
                {activeAppointments.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">Nenhum agendamento encontrado para este período.</p>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ══ HISTÓRICO ════════════════════════════════════════════════════ */}
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
                  <Input id="filter-patient" placeholder="Buscar por nome..."
                    value={historyFilters.patientName}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, patientName: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="filter-date">Data</Label>
                  <Input id="filter-date" type="date" value={historyFilters.date}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="filter-time">Horário</Label>
                  <Input id="filter-time" type="time" value={historyFilters.time}
                    onChange={(e) => setHistoryFilters({ ...historyFilters, time: e.target.value })} />
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
              {(historyFilters.patientName || historyFilters.date || historyFilters.time || historyFilters.status !== "all") && (
                <Button variant="outline" size="sm" className="mt-4"
                  onClick={() => setHistoryFilters({ patientName: "", date: "", time: "", status: "all" })}>
                  Limpar Filtros
                </Button>
              )}
            </CardContent>
          </Card>
          <div className="grid gap-4">
            {historyAppointments.map((appointment, index) => (
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
                            <DialogContent className="sm:max-w-[420px]">
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
                                Tem certeza que deseja excluir o agendamento de {appointment.patientName}?
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteAppointment(appointment.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
            ))}
            {historyAppointments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {historyFilters.patientName || historyFilters.date || historyFilters.time || historyFilters.status !== "all"
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
