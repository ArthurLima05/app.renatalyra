import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { useAdmin } from '@/contexts/AdminContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Save, RotateCcw, MessageSquare, Palette, ChevronRight, ChevronLeft, ArrowLeft, Info,
  Sun, Moon, Users, Plus, ChevronDown, ChevronUp, Mail, Phone, Shield,
  SlidersHorizontal, CalendarDays, List, Upload, FileSpreadsheet,
  CheckCircle2, XCircle, AlertCircle, Loader2, Trash2, RefreshCw,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, UserProfile, AppModule, UserPermission } from '@/types';
import { usePermissionsCtx } from '@/contexts/PermissionsContext';
import { cn } from '@/lib/utils';

type Section = null | 'aparencia' | 'mensagens' | 'usuarios' | 'preferencias' | 'importar' | 'feriados';
type UserView = null | AppUser;

// ── Constantes ────────────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<UserProfile, string> = {
  administrador: 'Administrador',
  auxiliar_tecnico: 'Auxiliar Técnico',
  profissional: 'Profissional',
  financeiro: 'Financeiro',
  gestor_relacionamento: 'Gestor de Relacionamento',
  recepcionista: 'Recepcionista',
  marketing: 'Marketing',
};

const PROFILE_COLORS: Record<UserProfile, string> = {
  administrador: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  auxiliar_tecnico: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  profissional: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  financeiro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  gestor_relacionamento: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  recepcionista: 'bg-gray-500 text-white dark:bg-gray-600 dark:text-white',
  marketing: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
};

const MODULES: { id: AppModule; label: string; description: string }[] = [
  { id: 'agenda',        label: 'Agenda',         description: 'Agendamentos e calendário' },
  { id: 'dashboard',     label: 'Dashboard',      description: 'Métricas e relatórios' },
  { id: 'pacientes',     label: 'Pacientes',      description: 'Cadastro e prontuários' },
  { id: 'financeiro',    label: 'Financeiro',     description: 'Transações e parcelas' },
  { id: 'profissionais', label: 'Profissionais',  description: 'Gestão de profissionais' },
  { id: 'notificacoes',  label: 'Notificações',   description: 'Central de notificações' },
  { id: 'configuracoes', label: 'Configurações',  description: 'Configurações do sistema' },
  { id: 'funil' as AppModule,         label: 'Funil de Vendas', description: 'Leads e pipeline de conversão' },
];

const CONFIRMATION_TEMPLATES = [
  {
    key: 'msg_appointment_confirmation',
    tabLabel: '24h antes',
    variables: ['{{nome_paciente}}', '{{data}}', '{{hora}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 😊 Você tem consulta para *{{data}}* às *{{hora}}*.',
  },
  {
    key: 'msg_confirmation_12h',
    tabLabel: '12h antes',
    variables: ['{{nome_paciente}}', '{{data}}', '{{hora}}'],
    defaultValue: '🔔 Ainda aguardamos sua confirmação.\n\nOlá, {{nome_paciente}}! Sua consulta está marcada para *{{data}}* às *{{hora}}*.',
  },
];

const REPLY_OPTIONS = [
  { label: 'SIM',      color: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  { label: 'NÃO',      color: 'bg-red-100   text-red-800   dark:bg-red-900/40   dark:text-red-300'   },
  { label: 'REMARCAR', color: 'bg-blue-100  text-blue-800  dark:bg-blue-900/40  dark:text-blue-300'  },
];

const RETURN_ALERT_TEMPLATES = [
  {
    key: 'msg_return_alert_1',
    tabLabel: '1ª mensagem',
    variables: ['{{nome_paciente}}', '{{data_retorno}}', '{{observacoes}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 😊\n\nA equipe da *Dra. Renata Lyra* entrando em contato.\n\nChegou a hora do seu *retorno odontológico*! 🦷\n\nPara agendar sua consulta de retorno, responda essa mensagem com:\n👇 *AGENDAR* — e nossa equipe entrará em contato para marcar o melhor horário para você.\n\nCuide do seu sorriso! 😊',
  },
  {
    key: 'msg_return_alert_2',
    tabLabel: '2ª mensagem',
    variables: ['{{nome_paciente}}'],
    defaultValue: 'Oi, {{nome_paciente}}! 😊\n\nPassando novamente para lembrar do seu *retorno* na Clínica Dra. Renata Lyra. 🦷\n\nAinda não conseguimos marcar sua consulta — e queremos muito cuidar do seu sorriso!\n\nResponda *AGENDAR* que nossa equipe entra em contato rapidinho! 💙',
  },
  {
    key: 'msg_return_alert_3',
    tabLabel: '3ª mensagem',
    variables: ['{{nome_paciente}}'],
    defaultValue: '{{nome_paciente}}, última lembrança do seu retorno! 🦷\n\nSabemos que a rotina é corrida, mas cuidar da saúde bucal faz toda a diferença. 😊\n\nNossa equipe está à disposição — responda *AGENDAR* ou ligue diretamente para a clínica.\n\nTe esperamos! 😊 — Clínica Dra. Renata Lyra',
  },
];

const MESSAGE_TEMPLATES = [
  {
    key: 'msg_appointment_cancellation',
    label: 'Cancelamento de Consulta',
    description: 'Enviada ao paciente quando uma consulta é cancelada.',
    variables: ['{{nome_paciente}}', '{{data}}'],
    defaultValue: 'Olá, {{nome_paciente}}! Sua consulta do dia *{{data}}* foi cancelada. Entre em contato para reagendar. 📞',
  },
  {
    key: 'msg_falta_notification',
    label: 'Aviso de Falta',
    description: 'Enviada automaticamente ao paciente quando o status da consulta é marcado como falta.',
    variables: ['{{nome_paciente}}', '{{data}}', '{{hora}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 😊 Notamos que você não pôde comparecer à sua consulta do dia *{{data}}* às *{{hora}}*. Sabemos que imprevistos acontecem! Caso queira reagendar, é só responder *REAGENDAR*. 📅',
  },
  {
    key: 'msg_feedback_request',
    label: 'Solicitação de Feedback',
    description: 'Enviada após a consulta pedindo avaliação no Google.',
    variables: ['{{nome_paciente}}', '{{link}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 🌟 Esperamos que sua consulta tenha sido excelente. Deixe sua avaliação: {{link}}',
  },
  {
    key: 'msg_birthday',
    label: 'Feliz Aniversário',
    description: 'Enviada automaticamente às 8h do dia do aniversário do paciente (exige data de nascimento cadastrada).',
    variables: ['{{nome_paciente}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 🎂 A equipe da Dra. Renata Lyra deseja a você um feliz aniversário! Que este dia seja repleto de alegria e saúde. 🎉',
  },
];

// ── Seção: Aparência ──────────────────────────────────────────────────────────
function AparenciaSection() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Aparência</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Ajuste o tema visual do sistema.</p>
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tema atual</p>
              <p className="text-xs text-muted-foreground">Alterne entre modo claro e escuro.</p>
            </div>
            <ThemeToggle />
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-3">
            {(['light', 'dark'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all ${
                  theme === t ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/40'
                }`}
              >
                {t === 'light' ? <Sun className="h-6 w-6 text-yellow-500" /> : <Moon className="h-6 w-6 text-blue-400" />}
                <span className="text-sm font-medium">{t === 'light' ? 'Claro' : 'Escuro'}</span>
                {theme === t && <Badge variant="default" className="text-xs">Ativo</Badge>}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Editor de mensagem com variáveis em negrito ───────────────────────────────
function toMsgHtml(text: string) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
    .replace(/(\{\{[^}]+\}\})/g, '<strong style="font-weight:700;color:hsl(var(--primary))">$1</strong>');
}

function VarEditor({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const focused = useRef(false);

  // Aplica negrito nas variáveis e move cursor para o final
  const applyFormat = () => {
    const el = ref.current;
    if (!el) return;
    const plain = el.innerText.replace(/\n$/, ''); // remove trailing newline do contenteditable
    el.innerHTML = toMsgHtml(plain);
    // cursor para o final
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  };

  // Sync valor vindo de fora (reset, etc.) apenas quando não está em foco
  useEffect(() => {
    const el = ref.current;
    if (!el || focused.current) return;
    el.innerHTML = toMsgHtml(value);
  }, [value]);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const variable = e.dataTransfer.getData('text/plain');
    if (!variable || !ref.current) return;

    // Posição do mouse → fronteira de palavra
    const plain = ref.current.innerText.replace(/\n$/, '');
    let rawPos = plain.length;
    try {
      const doc = document as any;
      if (doc.caretPositionFromPoint) {
        const cp = doc.caretPositionFromPoint(e.clientX, e.clientY);
        if (cp?.offset !== undefined) rawPos = cp.offset;
      } else if (doc.caretRangeFromPoint) {
        const r = doc.caretRangeFromPoint(e.clientX, e.clientY);
        if (r) rawPos = r.startOffset;
      }
    } catch {}
    rawPos = Math.max(0, Math.min(rawPos, plain.length));

    const isSep = (ch: string) => ch === ' ' || ch === '\n';
    let l = rawPos; while (l > 0 && !isSep(plain[l - 1])) l--;
    let r = rawPos; while (r < plain.length && !isSep(plain[r])) r++;
    const pos = (rawPos - l) <= (r - rawPos) ? l : r;

    const before = pos > 0 && !isSep(plain[pos - 1]) ? ' ' : '';
    const after  = pos < plain.length && !isSep(plain[pos]) ? ' ' : '';
    const newPlain = plain.slice(0, pos) + before + variable + after + plain.slice(pos);

    ref.current.innerHTML = toMsgHtml(newPlain);
    onChange(newPlain);
  };

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => { focused.current = true; }}
      onBlur={() => {
        focused.current = false;
        applyFormat();
        onChange(ref.current?.innerText.replace(/\n$/, '') ?? '');
      }}
      onInput={() => onChange(ref.current?.innerText.replace(/\n$/, '') ?? '')}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDrop}
      className="min-h-[5rem] w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: '1.6' }}
    />
  );
}

// ── Card: Confirmação de Consulta ─────────────────────────────────────────────
function ConfirmacaoCard({
  clinicSettings, updateClinicSetting, canEdit: canEditFn, toast,
}: {
  clinicSettings: Record<string, string>;
  updateClinicSetting: (key: string, value: string) => Promise<void>;
  canEdit: (module: string) => boolean;
  toast: (opts: { title: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<0 | 1>(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const t of CONFIRMATION_TEMPLATES) init[t.key] = clinicSettings[t.key] ?? t.defaultValue;
    setDrafts(init);
  }, [clinicSettings]);

  const tpl = CONFIRMATION_TEMPLATES[activeTab];
  const saved = clinicSettings[tpl.key] ?? tpl.defaultValue;
  const dirty = drafts[tpl.key] !== undefined && drafts[tpl.key] !== saved;

  const handleSave = async () => {
    setSaving(p => ({ ...p, [tpl.key]: true }));
    try { await updateClinicSetting(tpl.key, drafts[tpl.key]); toast({ title: 'Mensagem salva' }); }
    finally { setSaving(p => ({ ...p, [tpl.key]: false })); }
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div>
          <Label className="text-sm font-semibold">Confirmação de Consulta</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Enviada automaticamente para o paciente confirmar, cancelar ou remarcar o agendamento.
          </p>
        </div>

        {/* Tabs 24h / 12h */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {CONFIRMATION_TEMPLATES.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(i as 0 | 1)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                activeTab === i
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.tabLabel}
            </button>
          ))}
        </div>

        {/* Variable chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Arraste para inserir:
          </span>
          {tpl.variables.map(v => (
            <span
              key={v}
              draggable
              onDragStart={e => { e.dataTransfer.setData('text/plain', v); e.dataTransfer.effectAllowed = 'copy'; }}
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-gray-500 text-white hover:bg-gray-600 cursor-grab active:cursor-grabbing select-none transition-colors"
            >
              {v}
            </span>
          ))}
        </div>

        <VarEditor
          key={tpl.key}
          value={drafts[tpl.key] ?? tpl.defaultValue}
          onChange={v => setDrafts(p => ({ ...p, [tpl.key]: v }))}
        />

        {/* Reply options preview */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Opções de resposta incluídas automaticamente:</p>
          <div className="flex flex-wrap gap-2">
            {REPLY_OPTIONS.map(opt => (
              <span key={opt.label} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${opt.color}`}>
                {opt.label}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
            disabled={!canEditFn('configuracoes')}
            onClick={() => setDrafts(p => ({ ...p, [tpl.key]: tpl.defaultValue }))}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </Button>
          <Button size="sm" className="gap-1.5"
            disabled={!dirty || saving[tpl.key] || !canEditFn('configuracoes')}
            onClick={handleSave}>
            <Save className="h-3.5 w-3.5" />{saving[tpl.key] ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Card: Alerta de Retorno (3 mensagens) ─────────────────────────────────────
function RetornoAlertaCard({
  clinicSettings, updateClinicSetting, canEdit: canEditFn, toast,
}: {
  clinicSettings: Record<string, string>;
  updateClinicSetting: (key: string, value: string) => Promise<void>;
  canEdit: (module: string) => boolean;
  toast: (opts: { title: string }) => void;
}) {
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const t of RETURN_ALERT_TEMPLATES) init[t.key] = clinicSettings[t.key] ?? t.defaultValue;
    setDrafts(init);
  }, [clinicSettings]);

  const tpl = RETURN_ALERT_TEMPLATES[activeTab];
  const saved = clinicSettings[tpl.key] ?? tpl.defaultValue;
  const dirty = drafts[tpl.key] !== undefined && drafts[tpl.key] !== saved;

  const handleSave = async () => {
    setSaving(p => ({ ...p, [tpl.key]: true }));
    try { await updateClinicSetting(tpl.key, drafts[tpl.key]); toast({ title: 'Mensagem salva' }); }
    finally { setSaving(p => ({ ...p, [tpl.key]: false })); }
  };

  return (
    <Card>
      <CardContent className="pt-5 space-y-3">
        <div>
          <Label className="text-sm font-semibold">Alerta de Retorno</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sequência de 3 mensagens enviadas automaticamente quando o prazo de retorno vence. A 2ª e 3ª são enviadas com 3 dias de intervalo se o paciente não agendar.
          </p>
        </div>

        {/* Tabs 1ª / 2ª / 3ª */}
        <div className="flex rounded-lg bg-muted p-1 gap-1">
          {RETURN_ALERT_TEMPLATES.map((t, i) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(i as 0 | 1 | 2)}
              className={`flex-1 text-xs font-medium py-1.5 rounded-md transition-colors ${
                activeTab === i
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.tabLabel}
            </button>
          ))}
        </div>

        {/* Variable chips */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Arraste para inserir:
          </span>
          {tpl.variables.map(v => (
            <span
              key={v}
              draggable
              onDragStart={e => { e.dataTransfer.setData('text/plain', v); e.dataTransfer.effectAllowed = 'copy'; }}
              className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-gray-500 text-white hover:bg-gray-600 cursor-grab active:cursor-grabbing select-none transition-colors"
            >
              {v}
            </span>
          ))}
        </div>

        <VarEditor
          key={tpl.key}
          value={drafts[tpl.key] ?? tpl.defaultValue}
          onChange={v => setDrafts(p => ({ ...p, [tpl.key]: v }))}
        />

        {activeTab === 0 && (
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Variáveis disponíveis na 1ª mensagem:</p>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <p><code className="bg-muted px-1 rounded">{'{{data_retorno}}'}</code> — data prevista de retorno (se cadastrada)</p>
              <p><code className="bg-muted px-1 rounded">{'{{observacoes}}'}</code> — observação do alerta (se preenchida)</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
            disabled={!canEditFn('configuracoes')}
            onClick={() => setDrafts(p => ({ ...p, [tpl.key]: tpl.defaultValue }))}>
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar
          </Button>
          <Button size="sm" className="gap-1.5"
            disabled={!dirty || saving[tpl.key] || !canEditFn('configuracoes')}
            onClick={handleSave}>
            <Save className="h-3.5 w-3.5" />{saving[tpl.key] ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Seção: Mensagens ──────────────────────────────────────────────────────────
function MensagensSection() {
  const { clinicSettings, updateClinicSetting } = useClinic();
  const { canEdit } = usePermissionsCtx();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const t of [...MESSAGE_TEMPLATES, ...CONFIRMATION_TEMPLATES, ...RETURN_ALERT_TEMPLATES]) {
      init[t.key] = clinicSettings[t.key] ?? t.defaultValue;
    }
    setDrafts(init);
  }, [clinicSettings]);

  const handleSave = async (key: string) => {
    setSaving(p => ({ ...p, [key]: true }));
    try { await updateClinicSetting(key, drafts[key]); toast({ title: 'Mensagem salva' }); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  };

  const [feedbackLink, setFeedbackLink] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  useEffect(() => {
    setFeedbackLink(clinicSettings['feedback_link'] ?? '');
  }, [clinicSettings]);

  const handleSaveFeedbackLink = async () => {
    setSavingLink(true);
    try { await updateClinicSetting('feedback_link', feedbackLink); toast({ title: 'Link salvo' }); }
    finally { setSavingLink(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mensagens WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edite os textos enviados automaticamente. As variáveis são substituídas pelos dados reais.
        </p>
      </div>

      {/* Link Google Reviews */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div>
            <Label className="text-sm font-semibold">Link do Google Reviews</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              URL usada como <code className="bg-muted px-1 rounded text-xs">{'{{link}}'}</code> na mensagem de feedback. Cole o link de avaliação da clínica no Google.
            </p>
          </div>
          <div className="flex gap-2">
            <Input
              value={feedbackLink}
              onChange={e => setFeedbackLink(e.target.value)}
              placeholder="https://g.page/r/..."
              disabled={!canEdit('configuracoes')}
            />
            <Button
              size="sm"
              disabled={savingLink || feedbackLink === (clinicSettings['feedback_link'] ?? '') || !canEdit('configuracoes')}
              onClick={handleSaveFeedbackLink}
            >
              {savingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <ConfirmacaoCard
          clinicSettings={clinicSettings}
          updateClinicSetting={updateClinicSetting}
          canEdit={canEdit}
          toast={toast}
        />
        <RetornoAlertaCard
          clinicSettings={clinicSettings}
          updateClinicSetting={updateClinicSetting}
          canEdit={canEdit}
          toast={toast}
        />
        {MESSAGE_TEMPLATES.map(tpl => {
          const saved = clinicSettings[tpl.key] ?? tpl.defaultValue;
          const dirty = drafts[tpl.key] !== undefined && drafts[tpl.key] !== saved;
          return (
            <Card key={tpl.key}>
              <CardContent className="pt-5 space-y-3">
                <div>
                  <Label className="text-sm font-semibold">{tpl.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                </div>

                {/* Chips de variáveis arrastáveis */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" /> Arraste para inserir:
                  </span>
                  {tpl.variables.map(v => (
                    <span
                      key={v}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('text/plain', v);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-mono bg-gray-500 text-white hover:bg-gray-600 cursor-grab active:cursor-grabbing select-none transition-colors"
                    >
                      {v}
                    </span>
                  ))}
                </div>

                <VarEditor
                  value={drafts[tpl.key] ?? tpl.defaultValue}
                  onChange={v => setDrafts(p => ({ ...p, [tpl.key]: v }))}
                />

                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                    disabled={!canEdit('configuracoes')}
                    onClick={() => setDrafts(p => ({ ...p, [tpl.key]: tpl.defaultValue }))}>
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </Button>
                  <Button size="sm" className="gap-1.5" disabled={!dirty || saving[tpl.key] || !canEdit('configuracoes')} onClick={() => handleSave(tpl.key)}>
                    <Save className="h-3.5 w-3.5" />{saving[tpl.key] ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Permissões por módulo (dentro do detalhe do usuário) ──────────────────────
function ModulePermissionRow({
  mod, perm, onChange, isAdmin,
}: {
  mod: typeof MODULES[0];
  perm: UserPermission | undefined;
  onChange: (field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => void;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const checks: { field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete'; label: string }[] = [
    { field: 'canView',   label: 'Visualizar' },
    { field: 'canCreate', label: 'Criar' },
    { field: 'canEdit',   label: 'Editar' },
    { field: 'canDelete', label: 'Excluir' },
  ];
  const active = perm ? Object.values({ a: perm.canView, b: perm.canCreate, c: perm.canEdit, d: perm.canDelete }).filter(Boolean).length : 0;

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className="flex-1">
          <p className="text-sm font-medium">{mod.label}</p>
          <p className="text-xs text-muted-foreground">{mod.description}</p>
        </div>
        <span className="text-xs text-muted-foreground mr-2">{active}/4 permissões</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 border-t bg-secondary/20 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {checks.map(c => (
            <label key={c.field} className={cn("flex items-center gap-2 select-none", isAdmin ? "cursor-pointer" : "cursor-default opacity-60")}>
              <Checkbox
                checked={perm?.[c.field] ?? false}
                disabled={!isAdmin}
                onCheckedChange={v => isAdmin && onChange(c.field, !!v)}
              />
              <span className="text-sm">{c.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detalhe do usuário ────────────────────────────────────────────────────────
function UserDetail({ user, onBack }: { user: AppUser; onBack: () => void }) {
  const { professionals, linkProfessionalToUser } = useClinic();
  const { userPermissions, updateUserPermission, toggleAppUserActive } = useAdmin();
  const { isAdmin } = usePermissionsCtx();
  const perms = userPermissions.filter(p => p.userId === user.id);
  const linkedProfessional = professionals.find(p => p.userId === user.id);
  const [linkingProf, setLinkingProf] = useState(false);

  const handleLinkProfessional = async (professionalId: string | null) => {
    setLinkingProf(true);
    try { await linkProfessionalToUser(professionalId, user.id); }
    finally { setLinkingProf(false); }
  };

  return (
    <div className="space-y-6">
      {/* Mobile: barra de navegação estilo nativo */}
      <button
        onClick={onBack}
        className="sm:hidden -mx-4 -mt-4 px-3 py-3 flex items-center gap-1.5 border-b border-border bg-card/80 backdrop-blur w-[calc(100%+2rem)] text-left mb-2"
      >
        <ChevronLeft className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium text-primary">Usuários</span>
      </button>
      {/* Desktop: botão sutil */}
      <Button variant="ghost" size="sm" className="hidden sm:flex gap-2 -ml-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Usuários
      </Button>

      {/* Card do usuário */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold break-words">{user.fullName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROFILE_COLORS[user.profile]}`}>
                  {PROFILE_LABELS[user.profile]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 break-all">
                <Mail className="h-3.5 w-3.5 shrink-0" />{user.email}
              </p>
              {user.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />{user.phone}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1.5">
              <span className="text-xs text-muted-foreground">{user.active ? 'Ativo' : 'Inativo'}</span>
              <Switch
                checked={user.active}
                disabled={!isAdmin}
                onCheckedChange={v => toggleAppUserActive(user.id, v)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissões */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Permissões por Módulo</h3>
        </div>
        <div className="space-y-2">
          {MODULES.map(mod => (
            <ModulePermissionRow
              key={mod.id}
              mod={mod}
              isAdmin={isAdmin}
              perm={perms.find(p => p.module === mod.id)}
              onChange={(field, value) => updateUserPermission(user.id, mod.id, field, value)}
            />
          ))}
        </div>
      </div>

      {/* Vínculo com Profissional */}
      {isAdmin && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Profissional Vinculado</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Quando vinculado, este usuário verá apenas seus próprios agendamentos e pacientes.
          </p>
          <Select
            value={linkedProfessional?.id ?? 'none'}
            onValueChange={(v) => handleLinkProfessional(v === 'none' ? null : v)}
            disabled={linkingProf}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Nenhum (acesso geral)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum (acesso geral)</SelectItem>
              {professionals
                .filter(p => !p.userId || p.userId === user.id)
                .map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
            </SelectContent>
          </Select>
          {linkedProfessional && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1.5 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Vinculado a <strong>{linkedProfessional.name}</strong> — acesso restrito aos seus pacientes
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Seção: Preferências ───────────────────────────────────────────────────────
function PreferenciasSection() {
  const { clinicSettings, updateClinicSetting } = useClinic();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const current = (clinicSettings['agenda_view_mode'] ?? 'calendario') as 'calendario' | 'lista';

  const handleChange = async (value: 'calendario' | 'lista') => {
    setSaving(true);
    try {
      await updateClinicSetting('agenda_view_mode', value);
      toast({ title: 'Preferência salva' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Preferências</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Ajuste o comportamento padrão das páginas.</p>
      </div>
      <Card>
        <CardContent className="pt-5 space-y-4">
          <div>
            <Label className="text-sm font-semibold">Visualização padrão da Agenda</Label>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">
              Escolha como a agenda é exibida ao acessar a página.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {([
                { value: 'calendario', icon: CalendarDays, label: 'Calendário', description: 'Visão de calendário com dias e horários' },
                { value: 'lista',      icon: List,         label: 'Lista',       description: 'Lista compacta de agendamentos' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  disabled={saving}
                  onClick={() => handleChange(opt.value)}
                  className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all text-left ${
                    current === opt.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40'
                  }`}
                >
                  <opt.icon className={`h-6 w-6 ${current === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.description}</p>
                  </div>
                  {current === opt.value && <Badge variant="default" className="text-xs">Ativo</Badge>}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Seção: Usuários ───────────────────────────────────────────────────────────
function UsuariosSection() {
  const { appUsers, inviteAppUser } = useAdmin();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isNewUserOpen, setIsNewUserOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', profile: '' as UserProfile | '' });

  if (selectedUser) {
    return <UserDetail user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.profile) return;
    setSubmitting(true);
    try {
      await inviteAppUser({ email: form.email, fullName: form.fullName, phone: form.phone || undefined, profile: form.profile });
      setIsNewUserOpen(false);
      setForm({ fullName: '', email: '', phone: '', profile: '' });
    } catch {
      // toast já foi exibido pelo context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usuários e Permissões</h2>
          <p className="text-sm text-muted-foreground mt-0.5 font-cocon">Gerencie quem acessa o sistema e o que pode fazer.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsNewUserOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Usuário
        </Button>
      </div>

      {/* Lista */}
      {appUsers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground text-sm">
            Nenhum usuário cadastrado ainda.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {appUsers.map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUser(u)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 transition-colors text-left"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">
                  {u.fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold truncate">{u.fullName}</p>
                  {!u.active && <Badge variant="outline" className="text-xs text-muted-foreground">Inativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${PROFILE_COLORS[u.profile]}`}>
                {PROFILE_LABELS[u.profile]}
              </span>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}

      {/* Dialog: Novo Usuário */}
      <Dialog open={isNewUserOpen} onOpenChange={setIsNewUserOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              O usuário receberá um e-mail para definir sua senha de acesso.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome completo *</Label>
              <Input value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} required />
            </div>
            <div>
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
            </div>
            <div>
              <Label>Telefone</Label>
              <PhoneInput value={form.phone} onChange={v => setForm(p => ({ ...p, phone: v }))} />
            </div>
            <div>
              <Label>Perfil *</Label>
              <Select value={form.profile} onValueChange={v => setForm(p => ({ ...p, profile: v as UserProfile }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(PROFILE_LABELS) as [UserProfile, string][]).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.profile && (
              <p className="text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                As permissões padrão do perfil <strong>{PROFILE_LABELS[form.profile]}</strong> serão aplicadas automaticamente. Você pode ajustá-las depois.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setIsNewUserOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={submitting || !form.profile}>
                {submitting ? 'Enviando...' : 'Enviar Convite'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Campos do sistema ─────────────────────────────────────────────────────────
const PATIENT_FIELDS = [
  { key: 'full_name',         label: 'Nome completo',      required: true },
  { key: 'phone',             label: 'Telefone',           required: false },
  { key: 'email',             label: 'E-mail',             required: false },
  { key: 'birth_date',        label: 'Data de nascimento', required: false },
  { key: 'cpf',               label: 'CPF',                required: false },
  { key: 'rg',                label: 'RG',                 required: false },
  { key: 'gender',            label: 'Sexo',               required: false },
  { key: 'marital_status',    label: 'Estado civil',       required: false },
  { key: 'notes',             label: 'Observações',        required: false },
  { key: 'legacy_patient_id', label: 'ID sistema antigo',  required: false },
];

// ── Constantes para importação de agendamentos ───────────────────────────────
const DENTIST_MAP: Record<string, string> = {
  '5358216251179008': '805d944f-e8f3-4861-8bcc-5f5eff73f5a8', // Renata Lyra
  '4797052198846464': '48365890-a8d8-4c64-9374-1cb37035a909', // Juliano Borelli
  '4937581838532608': 'a0a8bdf3-124c-44d9-89eb-724b641ef1d9', // Dione Melo
};
const DENTIST_NAMES: Record<string, string> = {
  '5358216251179008': 'Renata Lyra',
  '4797052198846464': 'Juliano Borelli',
  '4937581838532608': 'Dione Melo',
};
type ApptStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta' | 'sugerido';
type ApptRowStatus = 'ok' | 'no_patient' | 'no_dentist' | 'no_date' | 'deleted';
interface ApptRow {
  legacyPatientId: string; patientName: string;
  legacyDentistId: string; dentistName: string;
  date: string | null; time: string;
  status: ApptStatus; notes: string; createdAt: string | null;
  patientUuid?: string; professionalUuid?: string;
  rowStatus: ApptRowStatus;
}
function mapApptStatus(status: string, canceled: string): ApptStatus {
  if (/^x$/i.test(canceled?.trim() ?? '')) return 'cancelado';
  switch ((status ?? '').toUpperCase().trim()) {
    case 'MISSED':    return 'falta';
    case 'CHECKOUT':  return 'realizado';
    case 'CONFIRMED': return 'confirmado';
    default:          return 'agendado';
  }
}
function parseApptDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`;
  }
  const s = String(val).trim();
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) { const [d,m,y] = s.split('/'); return `${y}-${m}-${d}`; }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}
const APPT_STATUS_COLORS: Record<ApptStatus, string> = {
  agendado:   'bg-amber-50 text-amber-800 border-amber-200',
  confirmado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  realizado:  'bg-purple-50 text-purple-800 border-purple-200',
  cancelado:  'bg-red-50 text-red-800 border-red-200',
  falta:      'bg-orange-50 text-orange-800 border-orange-200',
  sugerido:   'bg-gray-50 text-gray-700 border-gray-200',
};
const APPT_STATUS_LABELS: Record<ApptStatus, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado',
  cancelado: 'Cancelado', falta: 'Falta', sugerido: 'Sugerido',
};

// ── Sub-seção: Importar Agendamentos ─────────────────────────────────────────
function ImportarAgendamentosSubsection() {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [parsedRows, setParsedRows] = useState<ApptRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState({ imported: 0, errors: 0, skipped: 0 });
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setFileName(file.name);
    let raw: Record<string, unknown>[];
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } catch {
      toast({ title: 'Erro ao ler o arquivo', variant: 'destructive' }); return;
    }
    if (!raw.length) { toast({ title: 'Arquivo vazio', variant: 'destructive' }); return; }

    // Busca todos os pacientes com paginação (Supabase limita 1000 por request)
    const patientMap: Record<string, string> = {};
    const PAGE = 1000;
    let from = 0;
    while (true) {
      const { data: page, error } = await supabase
        .from('patients')
        .select('id, legacy_patient_id')
        .range(from, from + PAGE - 1);
      if (error) { toast({ title: 'Erro ao carregar pacientes', description: error.message, variant: 'destructive' }); return; }
      (page ?? []).forEach(p => { const lid = (p as any).legacy_patient_id; if (lid) patientMap[String(lid).trim()] = p.id; });
      if (!page?.length || page.length < PAGE) break;
      from += PAGE;
    }

    const parsed: ApptRow[] = raw.map(row => {
      const legacyPatientId = String(row['PatientId'] ?? '').trim();
      const legacyDentistId = String(row['DentistId'] ?? '').trim();
      const canceled = String(row['Canceled'] ?? '').trim();
      const deleted  = String(row['Deleted']  ?? '').trim();
      const isDeleted = /^x$/i.test(deleted);
      const notesParts = [
        row['CategoryDescription'] ? `Categoria: ${row['CategoryDescription']}` : '',
        row['Prcedures']           ? `Procedimentos: ${row['Prcedures']}`       : '',
        row['Procedures']          ? `Procedimentos: ${row['Procedures']}`      : '',
        row['Notes']               ? `Obs: ${row['Notes']}`                     : '',
      ].filter(Boolean);
      const patientUuid     = patientMap[legacyPatientId] || undefined;
      const professionalUuid = DENTIST_MAP[legacyDentistId] || undefined;
      const date = parseApptDate(row['date'] ?? row['Date']);
      const rawCreated = String(row['InsertDate'] ?? row['CreateDate'] ?? '').trim();
      let rowStatus: ApptRowStatus = 'ok';
      if (isDeleted)            rowStatus = 'deleted';
      else if (!patientUuid)    rowStatus = 'no_patient';
      else if (!professionalUuid) rowStatus = 'no_dentist';
      else if (!date)           rowStatus = 'no_date';
      return {
        legacyPatientId, patientName: String(row['PatientName'] ?? '').trim(),
        legacyDentistId, dentistName: DENTIST_NAMES[legacyDentistId] ?? String(row['DentistName'] ?? '').trim(),
        date, time: String(row['fromTime'] ?? '00:00').trim(),
        status: mapApptStatus(String(row['Status'] ?? ''), canceled),
        notes: notesParts.join('\n'), createdAt: rawCreated || null,
        patientUuid, professionalUuid, rowStatus,
      };
    });
    setParsedRows(parsed);
    setStep('preview');
  };

  const startImport = async () => {
    const toImport = parsedRows.filter(r => r.rowStatus === 'ok');
    const skipped  = parsedRows.filter(r => r.rowStatus !== 'ok').length;
    setStep('importing'); setProgress(0);
    let imported = 0, errors = 0;
    const chunkSize = 200;
    for (let i = 0; i < toImport.length; i += chunkSize) {
      const chunk = toImport.slice(i, i + chunkSize);
      const records = chunk.map(r => {
        const parts = (r.time || '').trim().split(':');
        const hh = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
        const mm = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
        const timeStr = `${hh}:${mm}`;
        return {
          patient_id: r.patientUuid!, professional_id: r.professionalUuid!,
          date: `${r.date}T${timeStr}:00`,
          time: timeStr, duration: 1, status: r.status, origin: 'Outro' as const,
          notes: r.notes || null,
          created_at: r.createdAt || `${r.date}T00:00:00.000Z`,
        };
      });
      const { error } = await supabase.from('appointments').insert(records as any);
      if (error) { errors += chunk.length; console.error(error.message); }
      else imported += chunk.length;
      setProgress(Math.round(((i + chunk.length) / toImport.length) * 100));
      await new Promise(res => setTimeout(res, 300));
    }
    setResult({ imported, errors, skipped });
    setStep('done');
    if (errors === 0) toast({ title: 'Importação concluída!', description: `${imported} agendamentos importados.` });
    else toast({ title: 'Importação com erros', description: `${imported} importados, ${errors} falharam.`, variant: 'destructive' });
  };

  const reset = () => { setParsedRows([]); setStep('upload'); setFileName(''); setShowAll(false); setProgress(0); };

  const stats = {
    total: parsedRows.length, ok: parsedRows.filter(r => r.rowStatus === 'ok').length,
    deleted: parsedRows.filter(r => r.rowStatus === 'deleted').length,
    noPatient: parsedRows.filter(r => r.rowStatus === 'no_patient').length,
    noDentist: parsedRows.filter(r => r.rowStatus === 'no_dentist').length,
    noDate: parsedRows.filter(r => r.rowStatus === 'no_date').length,
  };
  const displayRows = showAll ? parsedRows : parsedRows.slice(0, 80);

  if (step === 'upload') return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) processFile(f); }}
      onClick={() => inputRef.current?.click()}
      className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
    >
      <input ref={inputRef} type="file" accept=".xlsx,.xls" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) { processFile(f); e.target.value = ''; } }} />
      <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
      <p className="font-medium">Clique ou arraste o arquivo aqui</p>
      <p className="text-sm text-muted-foreground mt-1">Suporta .xlsx e .xls</p>
    </div>
  );

  if (step === 'importing') return (
    <div className="flex flex-col items-center gap-6 py-12">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
      <div className="w-full max-w-xs space-y-2">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Importando…</span><span className="font-medium">{progress}%</span></div>
        <div className="h-2 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
  );

  if (step === 'done') return (
    <div className="flex flex-col items-center gap-5 py-10">
      <CheckCircle2 className="h-12 w-12 text-emerald-600" />
      <div className="text-center space-y-1">
        <p className="font-semibold text-base">Importação concluída!</p>
        <p className="text-sm text-muted-foreground">
          <strong>{result.imported}</strong> importados · <strong>{result.skipped}</strong> ignorados
          {result.errors > 0 && <> · <strong className="text-destructive">{result.errors}</strong> erros</>}
        </p>
      </div>
      <Button onClick={reset}><Upload className="h-4 w-4 mr-2" />Importar outro arquivo</Button>
    </div>
  );

  // step === 'preview'
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm">
        <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium truncate">{fileName}</span>
        <Button variant="ghost" size="sm" onClick={reset} className="ml-auto shrink-0">Trocar arquivo</Button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Total',          value: stats.total,     cls: 'bg-muted text-foreground border-border' },
          { label: 'Prontos',        value: stats.ok,        cls: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900' },
          { label: 'Excluídos',      value: stats.deleted,   cls: 'bg-muted text-muted-foreground border-border' },
          { label: 'S/ paciente',    value: stats.noPatient, cls: stats.noPatient > 0 ? 'bg-orange-50 text-orange-900 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900' : 'bg-muted text-muted-foreground border-border' },
          { label: 'S/ dentista',    value: stats.noDentist, cls: stats.noDentist > 0 ? 'bg-yellow-50 text-yellow-900 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-900' : 'bg-muted text-muted-foreground border-border' },
          { label: 'S/ data',        value: stats.noDate,    cls: stats.noDate > 0    ? 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900'       : 'bg-muted text-muted-foreground border-border' },
        ].map(c => (
          <div key={c.label} className={cn('rounded-lg border p-3', c.cls)}>
            <p className="text-xl font-bold">{c.value}</p>
            <p className="text-[11px] mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.noPatient > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-orange-50 text-orange-800 text-sm border border-orange-200">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span><strong>{stats.noPatient}</strong> agendamento(s) sem paciente mapeado pelo <code className="bg-orange-100 px-1 rounded text-xs">legacy_patient_id</code>.</span>
        </div>
      )}

      <div className="border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                {['Situação','Paciente','Dentista','Data','Hora','Status'].map(h => (
                  <th key={h} className="text-left px-3 py-2 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {displayRows.map((r, i) => (
                <tr key={i} className={cn('hover:bg-muted/20', r.rowStatus !== 'ok' && 'opacity-50')}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.rowStatus === 'ok'         && <span className="flex items-center gap-1 text-emerald-700"><CheckCircle2 className="h-3 w-3" /> OK</span>}
                    {r.rowStatus === 'deleted'    && <span className="text-muted-foreground">Excluído</span>}
                    {r.rowStatus === 'no_patient' && <span className="flex items-center gap-1 text-orange-700"><AlertCircle className="h-3 w-3" /> S/ paciente</span>}
                    {r.rowStatus === 'no_dentist' && <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> S/ dentista</span>}
                    {r.rowStatus === 'no_date'    && <span className="flex items-center gap-1 text-destructive"><XCircle className="h-3 w-3" /> S/ data</span>}
                  </td>
                  <td className="px-3 py-2 max-w-[140px] truncate">{r.patientName || r.legacyPatientId}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{r.dentistName || r.legacyDentistId}</td>
                  <td className="px-3 py-2 font-mono whitespace-nowrap">{r.date ?? '—'}</td>
                  <td className="px-3 py-2 font-mono">{r.time}</td>
                  <td className="px-3 py-2">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded-full border font-medium', APPT_STATUS_COLORS[r.status])}>
                      {APPT_STATUS_LABELS[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsedRows.length > 80 && (
          <div className="border-t p-2 text-center bg-muted/20">
            <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>
              <ChevronDown className={cn('h-4 w-4 mr-1', showAll && 'rotate-180')} />
              {showAll ? 'Mostrar menos' : `Ver todos (${parsedRows.length})`}
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={startImport} disabled={stats.ok === 0}>
          <Upload className="h-4 w-4 mr-2" />Importar {stats.ok} agendamento{stats.ok !== 1 ? 's' : ''}
        </Button>
        <Button variant="outline" onClick={reset}>Cancelar</Button>
      </div>
    </div>
  );
}

// ── Seção: Importar (Pacientes + Agendamentos) ────────────────────────────────
function ImportarSection() {
  const [tab, setTab] = useState<'pacientes' | 'agendamentos'>('pacientes');
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Importar</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Importe dados de outro sistema via arquivo Excel.</p>
      </div>
      <div className="flex gap-1 p-1 rounded-lg bg-muted w-fit">
        <button
          onClick={() => setTab('pacientes')}
          className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'pacientes' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
        >Pacientes</button>
        <button
          onClick={() => setTab('agendamentos')}
          className={cn('px-4 py-1.5 rounded-md text-sm font-medium transition-colors', tab === 'agendamentos' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground')}
        >Agendamentos</button>
      </div>
      {tab === 'agendamentos' ? <ImportarAgendamentosSubsection /> : <ImportarPacientesSubsection />}
    </div>
  );
}

// ── Sub-seção: Importar Pacientes ─────────────────────────────────────────────
function ImportarPacientesSubsection() {
  const { toast } = useToast();
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'done'>('upload');
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  type SkippedRow = { row: Record<string, string>; reason: string };
  const [result, setResult] = useState<{ imported: number; skipped: number; errors: string[]; skippedRows: SkippedRow[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { raw: false, defval: '' });
        if (json.length === 0) { toast({ title: 'Arquivo vazio', variant: 'destructive' }); return; }
        const hdrs = Object.keys(json[0]);
        setHeaders(hdrs);
        setRows(json);

        // Auto-mapping por similaridade
        const auto: Record<string, string> = {};
        const lowerHdrs = hdrs.map(h => h.toLowerCase());
        PATIENT_FIELDS.forEach(f => {
          const idx = lowerHdrs.findIndex(h =>
            h.includes('nome') && f.key === 'full_name' ||
            (h.includes('fone') || h.includes('celular') || h.includes('tel')) && f.key === 'phone' ||
            h.includes('email') && f.key === 'email' ||
            (h.includes('nasc') || h.includes('birth')) && f.key === 'birth_date' ||
            h.includes('cpf') && f.key === 'cpf' ||
            h === 'rg' && f.key === 'rg' ||
            (h.includes('sex') || h.includes('gên') || h.includes('gen')) && f.key === 'gender' ||
            (h.includes('civil') || h.includes('estado')) && f.key === 'marital_status' ||
            (h.includes('obs') || h.includes('note')) && f.key === 'notes' ||
            (h === 'patientid' || h.includes('patient_id') || h.includes('id_paciente')) && f.key === 'legacy_patient_id'
          );
          if (idx !== -1) auto[f.key] = hdrs[idx];
        });
        setMapping(auto);
        setStep('mapping');
      } catch {
        toast({ title: 'Erro ao ler o arquivo', description: 'Certifique-se que é um arquivo .xlsx ou .csv válido.', variant: 'destructive' });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const parseDate = (val: string): string | null => {
    if (!val) return null;
    // Tenta formatos comuns: DD/MM/YYYY, YYYY-MM-DD, MM/DD/YYYY
    const clean = val.trim();
    const dmy = clean.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
    if (dmy) {
      const [, d, m, y] = dmy;
      const year = y.length === 2 ? `20${y}` : y;
      return `${year}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    const ymd = clean.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/);
    if (ymd) return clean.replace(/[\/\.]/g, '-');
    return null;
  };

  const handleImport = async () => {
    setImporting(true);
    let imported = 0;
    const errors: string[] = [];
    const skippedRows: SkippedRow[] = [];
    const nameCol = mapping['full_name'];
    const phoneCol = mapping['phone'];
    const cpfCol = mapping['cpf'];

    for (const row of rows) {
      const name = nameCol ? row[nameCol]?.trim() : '';
      const rawPhone = phoneCol ? row[phoneCol]?.toString().replace(/\D/g, '') : '';
      const phone = rawPhone && !rawPhone.startsWith('55') && rawPhone.length >= 8
        ? '55' + rawPhone
        : rawPhone;
      const cpf = cpfCol ? row[cpfCol]?.toString().replace(/\D/g, '') : '';

      if (!name) {
        skippedRows.push({ row, reason: 'Nome vazio' });
        continue;
      }

      const record: Record<string, unknown> = {
        full_name: name,
        phone: phone || '',
        origin: 'Outro',
      };

      if (cpf) record.cpf = cpf;
      if (mapping['email'] && row[mapping['email']]) record.email = row[mapping['email']].trim();
      if (mapping['rg'] && row[mapping['rg']]) record.rg = row[mapping['rg']].toString().trim();
      if (mapping['birth_date'] && row[mapping['birth_date']]) {
        const d = parseDate(row[mapping['birth_date']].toString());
        if (d) record.birth_date = d;
      }
      if (mapping['gender'] && row[mapping['gender']]) {
        const g = row[mapping['gender']].toLowerCase();
        if (g.includes('fem') || g === 'f') record.gender = 'feminino';
        else if (g.includes('mas') || g === 'm') record.gender = 'masculino';
      }
      if (mapping['marital_status'] && row[mapping['marital_status']]) {
        const ms = row[mapping['marital_status']].toLowerCase();
        if (ms.includes('cas')) record.marital_status = 'casado';
        else if (ms.includes('solt')) record.marital_status = 'solteiro';
        else if (ms.includes('div')) record.marital_status = 'divorciado';
        else if (ms.includes('vi')) record.marital_status = 'viuvo';
      }
      if (mapping['notes'] && row[mapping['notes']]) record.notes = row[mapping['notes']].trim();
      if (mapping['legacy_patient_id'] && row[mapping['legacy_patient_id']]) record.legacy_patient_id = row[mapping['legacy_patient_id']].toString().trim();

      const { error } = await supabase.from('patients').insert(record as any);
      if (error) {
        skippedRows.push({ row, reason: `Erro: ${error.message}` });
        errors.push(`${name}: ${error.message}`);
      } else {
        imported++;
      }
    }

    setResult({ imported, skipped: skippedRows.length, errors, skippedRows });
    setImporting(false);
    setStep('done');
    if (imported > 0) toast({ title: `${imported} pacientes importados com sucesso` });
  };

  const exportSkipped = (skippedRows: SkippedRow[]) => {
    const data = skippedRows.map(s => ({ ...s.row, MOTIVO_IGNORADO: s.reason }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ignorados');
    XLSX.writeFile(wb, 'pacientes_ignorados.xlsx');
  };

  const reset = () => { setStep('upload'); setRows([]); setHeaders([]); setMapping({}); setResult(null); };

  return (
    <div className="space-y-6">
      {/* PASSO 1: Upload */}
      {step === 'upload' && (
        <div
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => inputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-secondary/30 transition-colors"
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
          <p className="font-medium">Clique ou arraste o arquivo aqui</p>
          <p className="text-sm text-muted-foreground mt-1">Suporta .xlsx, .xls e .csv</p>
        </div>
      )}

      {/* PASSO 2: Mapeamento de colunas */}
      {step === 'mapping' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              <strong>{rows.length}</strong> linhas encontradas. Mapeie as colunas do arquivo para os campos do sistema.
            </p>
            <Button variant="ghost" size="sm" onClick={reset}>Trocar arquivo</Button>
          </div>
          <Card>
            <CardContent className="pt-5 space-y-3">
              {PATIENT_FIELDS.map(f => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <div>
                    <p className="text-sm font-medium">{f.label}</p>
                    {f.required && <p className="text-xs text-destructive">obrigatório</p>}
                  </div>
                  <Select
                    value={mapping[f.key] ?? '__skip__'}
                    onValueChange={v => setMapping(p => ({ ...p, [f.key]: v === '__skip__' ? '' : v }))}
                  >
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">— Ignorar —</SelectItem>
                      {headers.map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={reset}>Cancelar</Button>
            <Button
              disabled={!mapping['full_name']}
              onClick={() => setStep('preview')}
            >
              Ver prévia →
            </Button>
          </div>
        </div>
      )}

      {/* PASSO 3: Prévia */}
      {step === 'preview' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Prévia dos primeiros registros. Duplicatas (mesmo telefone) serão ignoradas automaticamente.
          </p>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted">
                <tr>
                  {PATIENT_FIELDS.filter(f => mapping[f.key]).map(f => (
                    <th key={f.key} className="px-3 py-2 text-left font-medium">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.slice(0, 8).map((row, i) => (
                  <tr key={i} className="hover:bg-muted/40">
                    {PATIENT_FIELDS.filter(f => mapping[f.key]).map(f => (
                      <td key={f.key} className="px-3 py-1.5 max-w-[140px] truncate">
                        {row[mapping[f.key]] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 8 && (
            <p className="text-xs text-muted-foreground text-center">... e mais {rows.length - 8} registros</p>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setStep('mapping')}>← Voltar</Button>
            <Button onClick={handleImport} disabled={importing} className="gap-2">
              {importing
                ? <><Loader2 className="h-4 w-4 animate-spin" />Importando...</>
                : <><Upload className="h-4 w-4" />Importar {rows.length} pacientes</>
              }
            </Button>
          </div>
        </div>
      )}

      {/* PASSO 4: Resultado */}
      {step === 'done' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
                <p className="text-2xl font-bold">{result.imported}</p>
                <p className="text-xs text-muted-foreground">Importados</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
                <AlertCircle className="h-6 w-6 text-amber-500" />
                <p className="text-2xl font-bold">{result.skipped}</p>
                <p className="text-xs text-muted-foreground">Ignorados</p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardContent className="pt-4 pb-4 flex flex-col items-center gap-1">
                <XCircle className="h-6 w-6 text-destructive" />
                <p className="text-2xl font-bold">{result.errors.length}</p>
                <p className="text-xs text-muted-foreground">Erros</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela de ignorados */}
          {result.skippedRows.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Linhas ignoradas ({result.skippedRows.length})</p>
                <Button variant="outline" size="sm" className="gap-1.5"
                  onClick={() => exportSkipped(result.skippedRows)}>
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Baixar Excel
                </Button>
              </div>
              <div className="rounded-lg border overflow-hidden">
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="min-w-full text-xs">
                    <thead className="bg-muted sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium w-40">Motivo</th>
                        {headers.slice(0, 4).map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium max-w-[120px]">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {result.skippedRows.map((s, i) => (
                        <tr key={i} className={s.reason.startsWith('Erro') ? 'bg-destructive/5' : 'hover:bg-muted/40'}>
                          <td className="px-3 py-1.5 text-amber-600 dark:text-amber-400 font-medium whitespace-nowrap">
                            {s.reason}
                          </td>
                          {headers.slice(0, 4).map(h => (
                            <td key={h} className="px-3 py-1.5 max-w-[120px] truncate text-muted-foreground">
                              {s.row[h] ?? '—'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          <Button className="w-full" onClick={reset}>Importar outro arquivo</Button>
        </div>
      )}
    </div>
  );
}

// ── Seção: Feriados ───────────────────────────────────────────────────────────
const FERIADOS_NACIONAIS = [
  { date: '01-01', name: 'Confraternização Universal', recurring: true },
  { date: '04-21', name: 'Tiradentes', recurring: true },
  { date: '05-01', name: 'Dia do Trabalho', recurring: true },
  { date: '09-07', name: 'Independência do Brasil', recurring: true },
  { date: '10-12', name: 'Nossa Senhora Aparecida', recurring: true },
  { date: '11-02', name: 'Finados', recurring: true },
  { date: '11-15', name: 'Proclamação da República', recurring: true },
  { date: '11-20', name: 'Consciência Negra', recurring: true },
  { date: '12-25', name: 'Natal', recurring: true },
];

function FeriadosSection() {
  const { holidays, addHoliday, deleteHoliday } = useClinic();
  const { isAdmin } = usePermissionsCtx();
  const { toast } = useToast();
  const [form, setForm] = useState({ date: '', name: '', recurring: false });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.name.trim()) return;
    setSaving(true);
    try {
      await addHoliday(form.date, form.name.trim(), form.recurring);
      setForm({ date: '', name: '', recurring: false });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try { await deleteHoliday(id); }
    finally { setDeletingId(null); }
  };

  const handleAddNational = async () => {
    const currentYear = new Date().getFullYear();
    const toAdd = FERIADOS_NACIONAIS.filter(fn =>
      !holidays.some(h => h.recurring && h.date.substring(5) === fn.date)
    );
    if (toAdd.length === 0) {
      toast({ title: 'Feriados nacionais já cadastrados' });
      return;
    }
    setSaving(true);
    try {
      for (const fn of toAdd) {
        await addHoliday(`${currentYear}-${fn.date}`, fn.name, fn.recurring);
      }
    } finally {
      setSaving(false);
    }
  };

  const sorted = [...holidays].sort((a, b) => {
    const ma = a.recurring ? a.date.substring(5) : a.date.substring(5);
    const mb = b.recurring ? b.date.substring(5) : b.date.substring(5);
    return ma.localeCompare(mb);
  });

  const formatHolidayDate = (date: string, recurring: boolean) => {
    const parts = date.split('-');
    if (recurring) return `${parts[2]}/${parts[1]} (todo ano)`;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Feriados</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Dias cadastrados como feriado fecham a agenda e são sinalizados nas planilhas financeiras.
        </p>
      </div>

      {/* Formulário de adição */}
      {isAdmin && (
        <Card>
          <CardContent className="pt-5 space-y-4">
            <Label className="text-sm font-semibold">Adicionar Feriado</Label>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Data</Label>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1 block">Nome</Label>
                  <Input
                    placeholder="Ex: Carnaval"
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer select-none w-fit">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                  checked={form.recurring}
                  onChange={e => setForm(p => ({ ...p, recurring: e.target.checked }))}
                />
                <span className="text-sm">Repete todo ano (mesmo dia e mês)</span>
              </label>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={saving}
                  onClick={handleAddNational}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Pré-carregar feriados nacionais
                </Button>
                <Button type="submit" size="sm" className="gap-1.5" disabled={saving || !form.date || !form.name.trim()}>
                  <Plus className="h-3.5 w-3.5" />
                  {saving ? 'Salvando...' : 'Adicionar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lista de feriados */}
      {sorted.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground text-sm">
            Nenhum feriado cadastrado. Adicione acima ou use o botão de feriados nacionais.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-4 pb-2 divide-y">
            {sorted.map(h => (
              <div key={h.id} className="flex items-center gap-3 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <CalendarDays className="h-3 w-3" />
                    {formatHolidayDate(h.date, h.recurring)}
                    {h.recurring && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">Anual</span>
                    )}
                  </p>
                </div>
                {isAdmin && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                    disabled={deletingId === h.id}
                    onClick={() => handleDelete(h.id)}
                  >
                    {deletingId === h.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'aparencia'    as Section, icon: Palette,            label: 'Aparência',              description: 'Tema claro ou escuro' },
  { id: 'preferencias' as Section, icon: SlidersHorizontal, label: 'Preferências',           description: 'Visualização padrão da agenda' },
  { id: 'mensagens'    as Section, icon: MessageSquare,      label: 'Mensagens WhatsApp',     description: 'Templates de mensagens automáticas' },
  { id: 'feriados'     as Section, icon: CalendarDays,       label: 'Feriados',               description: 'Dias de folga que fecham a agenda e marcam o financeiro' },
  { id: 'importar'     as Section, icon: Upload,             label: 'Importar',               description: 'Importe pacientes ou agendamentos via Excel' },
  { id: 'usuarios'     as Section, icon: Users,              label: 'Usuários e Permissões',  description: 'Quem acessa e o que pode fazer' },
];

export default function Configuracoes() {
  const [section, setSection] = useState<Section>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {section === null ? (
          <motion.div key="menu" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl">Configurações</h1>
              <p className="text-muted-foreground mt-1">Personalize o sistema.</p>
            </div>
            <div className="space-y-2">
              {SECTIONS.map(s => (
                <button key={String(s.id)} onClick={() => setSection(s.id)}
                  className="w-full flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:bg-secondary/60 transition-colors text-left">
                  <div className="bg-primary/10 p-2.5 rounded-lg shrink-0"><s.icon className="h-5 w-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div key={String(section)} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} className="space-y-6">
            {section !== 'usuarios' && (
              <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground" onClick={() => setSection(null)}>
                <ArrowLeft className="h-4 w-4" /> Configurações
              </Button>
            )}
            {section === 'aparencia'    && <AparenciaSection />}
            {section === 'preferencias' && <PreferenciasSection />}
            {section === 'mensagens'    && <MensagensSection />}
            {section === 'feriados'     && <FeriadosSection />}
            {section === 'importar'     && <ImportarSection />}
            {section === 'usuarios'   && (
              <>
                <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground" onClick={() => setSection(null)}>
                  <ArrowLeft className="h-4 w-4" /> Configurações
                </Button>
                <UsuariosSection />
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
