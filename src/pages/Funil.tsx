import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useClinic } from '@/contexts/ClinicContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Lead, LeadStage, PatientOrigin } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Phone, ChevronRight, ChevronLeft, Trash2, Edit, UserPlus,
  Calendar, TrendingUp, Users, DollarSign, ExternalLink, X,
} from 'lucide-react';
import { format, differenceInDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { PhoneInput, formatPhoneDisplay } from '@/components/ui/phone-input';

// ── Estágios ──────────────────────────────────────────────────────────────────
const STAGES: { id: LeadStage; label: string; color: string; dot: string }[] = [
  { id: 'novo_lead',          label: 'Novo Lead',           color: 'bg-slate-100 dark:bg-slate-800',     dot: 'bg-slate-400' },
  { id: 'em_contato',         label: 'Em Contato',          color: 'bg-blue-50 dark:bg-blue-950/40',     dot: 'bg-blue-400' },
  { id: 'follow_up_1',        label: 'Follow-Up 1',         color: 'bg-teal-50 dark:bg-teal-950/40',     dot: 'bg-teal-400' },
  { id: 'follow_up_2',        label: 'Follow-Up 2',         color: 'bg-cyan-50 dark:bg-cyan-950/40',     dot: 'bg-cyan-500' },
  { id: 'follow_up_3',        label: 'Follow-Up 3',         color: 'bg-sky-50 dark:bg-sky-950/40',       dot: 'bg-sky-500' },
  { id: 'consulta_agendada',  label: 'Consulta Agendada',   color: 'bg-violet-50 dark:bg-violet-950/40', dot: 'bg-violet-500' },
  { id: 'avaliacao_realizada',label: 'Avaliação Realizada', color: 'bg-amber-50 dark:bg-amber-950/40',   dot: 'bg-amber-500' },
  { id: 'convertido',         label: 'Convertido',          color: 'bg-green-50 dark:bg-green-950/40',   dot: 'bg-green-500' },
  { id: 'perdido',            label: 'Perdido',             color: 'bg-red-50 dark:bg-red-950/40',       dot: 'bg-red-400' },
];

const STAGE_INDEX = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));

const SERVICES = [
  'Implantes',
  'Coroas',
  'Facetas',
  'Ortodontia',
  'Limpeza e Restaurações',
  'Clareamento',
  'Endodontia',
  'Cirurgias/Exodontias',
  'Plastia Gengival',
  'Odontopediatria',
] as const;

const ORIGIN_COLORS: Record<PatientOrigin, string> = {
  'Google Ads':  'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  'Instagram':   'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  'Indicação':   'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  'Outro':       'bg-muted text-muted-foreground',
};

function daysInStage(updatedAt: Date) {
  const d = differenceInDays(new Date(), updatedAt);
  return d === 0 ? 'hoje' : `${d}d`;
}

function fmt(value?: number) {
  if (!value) return null;
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

// ── Formulário de lead ────────────────────────────────────────────────────────
const emptyForm = () => ({
  name: '', phone: '', email: '', origin: 'Outro' as PatientOrigin,
  treatmentInterest: '', estimatedValue: '', notes: '',
});

function LeadForm({
  initial, onSubmit, onCancel, submitLabel,
}: {
  initial?: ReturnType<typeof emptyForm>;
  onSubmit: (data: ReturnType<typeof emptyForm>) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
}) {
  const [form, setForm] = useState(initial ?? emptyForm());
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await onSubmit(form); } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handle} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label>Nome *</Label>
          <Input value={form.name} onChange={e => set('name', e.target.value)} required />
        </div>
        <div>
          <Label>Telefone *</Label>
          <PhoneInput value={form.phone} onChange={v => set('phone', v)} required />
        </div>
        <div>
          <Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <Label>Canal *</Label>
          <Select value={form.origin} onValueChange={v => set('origin', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Google Ads">Google Ads</SelectItem>
              <SelectItem value="Instagram">Instagram</SelectItem>
              <SelectItem value="Indicação">Indicação</SelectItem>
              <SelectItem value="Outro">Outro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Procedimento de interesse</Label>
          <Select
            value={form.treatmentInterest || '_none'}
            onValueChange={v => set('treatmentInterest', v === '_none' ? '' : v)}
          >
            <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
            <SelectContent position="popper" className="max-h-60 overflow-y-auto">
              <SelectItem value="_none">
                <span className="text-muted-foreground">Não identificado</span>
              </SelectItem>
              {SERVICES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2">
          <Label>Valor estimado (R$)</Label>
          <Input type="number" min="0" step="0.01" value={form.estimatedValue} onChange={e => set('estimatedValue', e.target.value)} placeholder="0,00" />
        </div>
        <div className="col-span-2">
          <Label>Observações</Label>
          <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className="resize-none" />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={saving}>{saving ? 'Salvando...' : submitLabel}</Button>
      </div>
    </form>
  );
}

// ── Card do lead ──────────────────────────────────────────────────────────────
function LeadCard({ lead, stageInfo, onSelect, onDragStart, onDragEnd }: {
  lead: Lead; stageInfo: typeof STAGES[0]; onSelect: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, leadId: string) => void;
  onDragEnd: () => void;
}) {
  const draggable = lead.stage !== 'convertido' && lead.stage !== 'perdido';
  return (
    <div
      draggable={draggable}
      onDragStart={(e) => { if (draggable) onDragStart(e, lead.id); }}
      onDragEnd={onDragEnd}
    >
    <motion.div
      onClick={onSelect}
      className="bg-card border border-border/80 rounded-xl p-3 space-y-3 cursor-pointer"
      style={{ boxShadow: 'var(--card-shadow)' }}
      whileHover={{
        y: -3,
        boxShadow: '0 8px 24px -6px hsl(40 25% 45% / 0.2), 0 2px 8px hsl(0 0% 0% / 0.04)',
        borderColor: 'hsl(var(--primary) / 0.3)',
      }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-tight font-cocon tracking-[0.02em]">{lead.name}</p>
        <span className={cn("text-xs px-1.5 py-0.5 rounded-full shrink-0 font-medium", ORIGIN_COLORS[lead.origin])}>
          {lead.origin}
        </span>
      </div>
      {lead.treatmentInterest ? (
        <p className="text-xs text-muted-foreground truncate">{lead.treatmentInterest}</p>
      ) : lead.stage !== 'novo_lead' && lead.stage !== 'convertido' && lead.stage !== 'perdido' ? (
        <span className="text-[10px] text-amber-500/70 flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          Sem procedimento
        </span>
      ) : null}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{formatPhoneDisplay(lead.phone)}</span>
        <span className="tabular-nums">{daysInStage(lead.updatedAt)}</span>
      </div>
      {lead.estimatedValue && (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(lead.estimatedValue)}</p>
      )}
    </motion.div>
    </div>
  );
}

// ── Painel de detalhes ────────────────────────────────────────────────────────
function LeadDetailPanel({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const { moveLeadStage, updateLead, deleteLead } = useAdmin();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [moving, setMoving] = useState(false);

  const stageIdx = STAGE_INDEX[lead.stage];
  const canGoBack = stageIdx > 0 && lead.stage !== 'convertido' && lead.stage !== 'perdido';
  const canAdvance = stageIdx < STAGES.length - 1 && lead.stage !== 'convertido' && lead.stage !== 'perdido';
  const nextStage = canAdvance ? STAGES[stageIdx + 1] : null;
  const prevStage = canGoBack ? STAGES[stageIdx - 1] : null;

  const handleAdvance = async () => {
    if (!nextStage) return;
    if (nextStage.id === 'perdido') { setShowLostDialog(true); return; }
    setMoving(true);
    try {
      const result = await moveLeadStage(lead.id, nextStage.id);
      if (nextStage.id === 'consulta_agendada' && result.patientId) {
        onClose();
        navigate('/');
      }
    } finally { setMoving(false); }
  };

  const handleBack = async () => {
    if (!prevStage) return;
    setMoving(true);
    try { await moveLeadStage(lead.id, prevStage.id); }
    finally { setMoving(false); }
  };

  const handleLost = async () => {
    setMoving(true);
    try { await moveLeadStage(lead.id, 'perdido', { lostReason }); setShowLostDialog(false); onClose(); }
    finally { setMoving(false); }
  };

  const stageInfo = STAGES[stageIdx];

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Editar Lead</h3>
          <Button variant="ghost" size="icon" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
        </div>
        <LeadForm
          initial={{
            name: lead.name, phone: lead.phone, email: lead.email ?? '',
            origin: lead.origin, treatmentInterest: lead.treatmentInterest ?? '',
            estimatedValue: lead.estimatedValue?.toString() ?? '', notes: lead.notes ?? '',
          }}
          submitLabel="Salvar"
          onCancel={() => setEditing(false)}
          onSubmit={async (form) => {
            await updateLead(lead.id, {
              name: form.name, phone: form.phone, email: form.email || undefined,
              origin: form.origin as PatientOrigin,
              treatmentInterest: form.treatmentInterest || undefined,
              estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
              notes: form.notes || undefined,
            });
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold text-lg leading-tight">{lead.name}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", ORIGIN_COLORS[lead.origin])}>{lead.origin}</span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", stageInfo.dot)} />
              {stageInfo.label}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(true)}>
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <a href={`tel:${lead.phone}`} className="hover:text-foreground">{formatPhoneDisplay(lead.phone)}</a>
        </div>
        {lead.email && (
          <div className="text-muted-foreground truncate">{lead.email}</div>
        )}
        {lead.treatmentInterest && (
          <div><span className="text-muted-foreground">Interesse: </span>{lead.treatmentInterest}</div>
        )}
        {lead.estimatedValue && (
          <div className="font-semibold text-green-600 dark:text-green-400">{fmt(lead.estimatedValue)}</div>
        )}
        {lead.notes && (
          <div className="bg-muted rounded-lg p-2.5 text-xs whitespace-pre-wrap">{lead.notes}</div>
        )}
        {lead.lostReason && (
          <div className="text-xs text-destructive bg-destructive/5 rounded-lg p-2.5">
            Motivo da perda: {lead.lostReason}
          </div>
        )}
        <div className="text-xs text-muted-foreground">
          Criado em {format(lead.createdAt, "dd/MM/yyyy", { locale: ptBR })} · {daysInStage(lead.updatedAt)} neste estágio
        </div>
      </div>

      {/* Paciente vinculado */}
      {lead.patientId && (
        <>
          <Separator />
          <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => { onClose(); navigate(`/pacientes/${lead.patientId}`); }}>
            <ExternalLink className="h-4 w-4" />
            Ver perfil do paciente
          </Button>
        </>
      )}

      {/* Ações de movimentação */}
      {lead.stage !== 'convertido' && lead.stage !== 'perdido' && (
        <>
          <Separator />
          <div className="space-y-2">
            {nextStage && (
              <Button
                className="w-full gap-2"
                disabled={moving}
                onClick={handleAdvance}
              >
                {nextStage.id === 'consulta_agendada' && !lead.patientId
                  ? <><UserPlus className="h-4 w-4" /> Criar paciente e agendar</>
                  : nextStage.id === 'consulta_agendada'
                  ? <><Calendar className="h-4 w-4" /> Ir para Agendamentos</>
                  : <><ChevronRight className="h-4 w-4" /> Mover para: {nextStage.label}</>
                }
              </Button>
            )}
            <div className="flex gap-2">
              {prevStage && (
                <Button variant="outline" size="sm" className="gap-1 flex-1" disabled={moving} onClick={handleBack}>
                  <ChevronLeft className="h-3.5 w-3.5" /> {prevStage.label}
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1 flex-1 text-destructive hover:text-destructive border-destructive/30"
                onClick={() => setShowLostDialog(true)}>
                Marcar como Perdido
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Dialog: motivo da perda */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Motivo da perda</DialogTitle>
            <DialogDescription>Registre o motivo para análise futura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="Ex: Preço, concorrente, desistiu..." rows={3} />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLostDialog(false)}>Cancelar</Button>
              <Button onClick={handleLost} disabled={moving}>Confirmar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: excluir */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lead</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir {lead.name} do funil?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => { await deleteLead(lead.id); onClose(); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Funil() {
  const { patients } = useClinic();
  const { leads, addLead, moveLeadStage } = useAdmin();
  const navigate = useNavigate();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [pendingDropLead, setPendingDropLead] = useState<Lead | null>(null);

  const byStage = useMemo(() => {
    const map: Record<LeadStage, Lead[]> = {} as any;
    STAGES.forEach(s => { map[s.id] = []; });
    leads.forEach(l => { map[l.stage]?.push(l); });
    return map;
  }, [leads]);

  const activeLeads = leads.filter(l => l.stage !== 'perdido' && l.stage !== 'convertido');
  const convertedLeads = leads.filter(l => l.stage === 'convertido');
  const pipelineValue = activeLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
  const conversionRate = leads.length > 0
    ? Math.round((convertedLeads.length / leads.length) * 100)
    : 0;

  // ── Estatísticas de canal ─────────────────────────────────────────────────
  const CHANNELS = [
    { name: 'Google Ads' as PatientOrigin, badge: ORIGIN_COLORS['Google Ads'], dot: 'bg-blue-400' },
    { name: 'Instagram'  as PatientOrigin, badge: ORIGIN_COLORS['Instagram'],  dot: 'bg-pink-400' },
    { name: 'Indicação'  as PatientOrigin, badge: ORIGIN_COLORS['Indicação'],  dot: 'bg-green-500' },
  ];

  const channelLeadStats = CHANNELS.map(ch => {
    const chLeads = leads.filter(l => l.origin === ch.name);
    const active    = chLeads.filter(l => l.stage !== 'convertido' && l.stage !== 'perdido').length;
    const converted = chLeads.filter(l => l.stage === 'convertido').length;
    const lost      = chLeads.filter(l => l.stage === 'perdido').length;
    const closed    = converted + lost;
    const rate      = closed > 0 ? Math.round((converted / closed) * 100) : null;
    return { ...ch, active, converted, lost, total: chLeads.length, rate };
  });

  const thirtyDaysAgo = subDays(new Date(), 30);
  const newPatients30d = patients.filter(p => new Date((p as any).createdAt ?? 0) >= thirtyDaysAgo).length;

  const patientChannelStats = CHANNELS.map(ch => ({
    ...ch,
    count: patients.filter(p => p.origin === ch.name).length,
  }));

  const serviceStats = SERVICES
    .map(name => ({
      name,
      active:    leads.filter(l => l.treatmentInterest === name && l.stage !== 'convertido' && l.stage !== 'perdido').length,
      converted: leads.filter(l => l.treatmentInterest === name && l.stage === 'convertido').length,
    }))
    .filter(s => s.active + s.converted > 0);

  const unidentifiedActive    = leads.filter(l => !l.treatmentInterest && l.stage !== 'convertido' && l.stage !== 'perdido').length;
  const unidentifiedConverted = leads.filter(l => !l.treatmentInterest && l.stage === 'convertido').length;

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, stageId: LeadStage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverStage(null);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>, targetStage: LeadStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (!draggedLeadId) return;
    const lead = leads.find(l => l.id === draggedLeadId);
    setDraggedLeadId(null);
    if (!lead || lead.stage === targetStage) return;
    if (targetStage === 'consulta_agendada' && !lead.patientId) {
      setPendingDropLead(lead);
      setShowBlockedDialog(true);
      return;
    }
    await moveLeadStage(lead.id, targetStage);
  };

  const handleRegisterAndSchedule = async () => {
    if (!pendingDropLead) return;
    const result = await moveLeadStage(pendingDropLead.id, 'consulta_agendada');
    setShowBlockedDialog(false);
    setPendingDropLead(null);
    if (result?.patientId) navigate('/');
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl">Marketing</h1>
          <p className="text-sm text-muted-foreground font-cocon">Canais de aquisição, leads e conversão</p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Lead
        </Button>
      </motion.div>

      {/* ── Números gerais ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-px bg-border rounded-xl overflow-hidden border border-border">
        {[
          { label: 'Pacientes',    value: patients.length },
          { label: 'Novos (30d)',  value: newPatients30d > 0 ? `+${newPatients30d}` : '0' },
          { label: 'Leads ativos', value: activeLeads.length },
          { label: 'Convertidos',  value: convertedLeads.length },
          { label: 'Taxa conv.',   value: `${conversionRate}%` },
          { label: 'Pipeline',     value: fmt(pipelineValue) ?? 'R$ 0' },
        ].map(stat => (
          <div key={stat.label} className="bg-card px-4 py-3.5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-1.5">{stat.label}</p>
            <p className="text-xl font-bold tabular-nums leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Canais de Aquisição ──────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Canais de Aquisição</p>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm min-w-[420px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Canal</th>
                  <th className="text-right py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Pacientes</th>
                  <th className="text-right py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">No funil</th>
                  <th className="text-right py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Convertidos</th>
                  <th className="text-right py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Taxa</th>
                </tr>
              </thead>
              <tbody>
                {channelLeadStats.map((ch, i) => {
                  const patCount = patientChannelStats.find(p => p.name === ch.name)?.count ?? 0;
                  return (
                    <tr key={ch.name} className={i < channelLeadStats.length - 1 ? 'border-b border-border' : ''}>
                      <td className="py-3 px-4">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ch.badge)}>
                          {ch.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">{patCount}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">{ch.active}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-green-600 dark:text-green-400">{ch.converted}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {ch.rate !== null ? `${ch.rate}%` : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* ── Serviços ─────────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Serviços</p>
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            {serviceStats.length === 0 && unidentifiedActive === 0 && unidentifiedConverted === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum procedimento registrado ainda</p>
            ) : (
              <table className="w-full text-sm min-w-[320px]">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Procedimento</th>
                    <th className="text-right py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">No funil</th>
                    <th className="text-right py-2.5 px-4 text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Convertidos</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceStats.map((svc, i) => {
                    const isLast = i === serviceStats.length - 1 && unidentifiedActive === 0 && unidentifiedConverted === 0;
                    return (
                      <tr key={svc.name} className={!isLast ? 'border-b border-border' : ''}>
                        <td className="py-3 px-4">{svc.name}</td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums">{svc.active}</td>
                        <td className="py-3 px-4 text-right font-bold tabular-nums text-green-600 dark:text-green-400">{svc.converted}</td>
                      </tr>
                    );
                  })}
                  {(unidentifiedActive > 0 || unidentifiedConverted > 0) && (
                    <tr>
                      <td className="py-3 px-4">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                          Não identificado
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-muted-foreground">{unidentifiedActive}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-muted-foreground">{unidentifiedConverted}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Funil de Vendas ──────────────────────────────────────────────────── */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Funil de Vendas</p>

      {/* Kanban */}
      <div className="flex gap-3 overflow-x-auto pb-4 snap-x snap-mandatory">
        {STAGES.map(stage => {
          const cards = byStage[stage.id] ?? [];
          const stageValue = cards.reduce((s, l) => s + (l.estimatedValue ?? 0), 0);
          return (
            <div
              key={stage.id}
              className={cn(
                "flex-none w-[82vw] sm:w-64 snap-center rounded-xl p-3 space-y-3 transition-all duration-150",
                stage.color,
                dragOverStage === stage.id && 'ring-2 ring-primary/60 brightness-95',
              )}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full shrink-0", stage.dot)} />
                    <h3 className="text-sm font-semibold">{stage.label}</h3>
                  </div>
                  <span className="text-xs font-medium bg-background/60 rounded-full px-1.5 py-0.5">
                    {cards.length}
                  </span>
                </div>
                {stageValue > 0 && (
                  <p className="text-xs text-muted-foreground pl-3.5">{fmt(stageValue)}</p>
                )}
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {cards.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6 opacity-60">Vazio</p>
                ) : (
                  cards.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      stageInfo={stage}
                      onSelect={() => setSelectedLead(lead)}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog: Novo lead */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Lead</DialogTitle>
            <DialogDescription>Adicione um potencial paciente ao funil.</DialogDescription>
          </DialogHeader>
          <LeadForm
            submitLabel="Adicionar"
            onCancel={() => setIsAddOpen(false)}
            onSubmit={async (form) => {
              await addLead({
                name: form.name, phone: form.phone, email: form.email || undefined,
                origin: form.origin as PatientOrigin,
                treatmentInterest: form.treatmentInterest || undefined,
                estimatedValue: form.estimatedValue ? parseFloat(form.estimatedValue) : undefined,
                notes: form.notes || undefined,
              });
              setIsAddOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Dialog: consulta agendada bloqueada por falta de cadastro */}
      <Dialog
        open={showBlockedDialog}
        onOpenChange={(open) => { if (!open) { setShowBlockedDialog(false); setPendingDropLead(null); } }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Paciente não cadastrado</DialogTitle>
            <DialogDescription>
              Para mover este lead para &quot;Consulta Agendada&quot;, é necessário que ele esteja cadastrado como paciente primeiro.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={() => { setShowBlockedDialog(false); setPendingDropLead(null); }}>
              Cancelar
            </Button>
            <Button className="gap-2" onClick={handleRegisterAndSchedule}>
              <UserPlus className="h-4 w-4" />
              Cadastrar e Agendar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Painel lateral de detalhes */}
      {selectedLead && (() => {
        const current = leads.find(l => l.id === selectedLead.id) ?? selectedLead;
        return (
          <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedLead(null)}>
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="relative w-full max-w-sm bg-card border-l border-border shadow-2xl h-full overflow-y-auto p-5"
              onClick={e => e.stopPropagation()}
            >
              <LeadDetailPanel lead={current} onClose={() => setSelectedLead(null)} />
            </motion.div>
          </div>
        );
      })()}
    </div>
  );
}
