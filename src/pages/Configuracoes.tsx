import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
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
  CheckCircle2, XCircle, AlertCircle, Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, UserProfile, AppModule, UserPermission } from '@/types';
import { usePermissionsCtx } from '@/contexts/PermissionsContext';
import { cn } from '@/lib/utils';

type Section = null | 'aparencia' | 'mensagens' | 'usuarios' | 'preferencias' | 'importar';
type UserView = null | AppUser;

// ── Constantes ────────────────────────────────────────────────────────────────

const PROFILE_LABELS: Record<UserProfile, string> = {
  administrador: 'Administrador',
  auxiliar_tecnico: 'Auxiliar Técnico',
  profissional: 'Profissional',
  financeiro: 'Financeiro',
  gestor_relacionamento: 'Gestor de Relacionamento',
  recepcionista: 'Recepcionista',
};

const PROFILE_COLORS: Record<UserProfile, string> = {
  administrador: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  auxiliar_tecnico: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  profissional: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  financeiro: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  gestor_relacionamento: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  recepcionista: 'bg-gray-500 text-white dark:bg-gray-600 dark:text-white',
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

const MESSAGE_TEMPLATES = [
  {
    key: 'msg_return_alert',
    label: 'Alerta de Retorno',
    description: 'Enviada automaticamente quando o prazo de retorno do paciente vence.',
    variables: ['{{nome_paciente}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 😊 Aqui é a clínica Dra. Renata Lyra. Percebemos que faz um tempo desde sua última consulta. Que tal agendar um retorno? Estamos à disposição! 📅',
  },
  {
    key: 'msg_appointment_confirmation',
    label: 'Confirmação de Consulta',
    description: 'Enviada para o paciente confirmar ou cancelar o agendamento.',
    variables: ['{{nome_paciente}}', '{{data}}', '{{hora}}'],
    defaultValue: 'Olá, {{nome_paciente}}! Você tem consulta para *{{data}}* às *{{hora}}*. Confirme respondendo *SIM* ou cancele respondendo *NÃO*. 😊',
  },
  {
    key: 'msg_appointment_cancellation',
    label: 'Cancelamento de Consulta',
    description: 'Enviada ao paciente quando uma consulta é cancelada.',
    variables: ['{{nome_paciente}}', '{{data}}'],
    defaultValue: 'Olá, {{nome_paciente}}! Sua consulta do dia *{{data}}* foi cancelada. Entre em contato para reagendar. 📞',
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

// ── Seção: Mensagens ──────────────────────────────────────────────────────────
function MensagensSection() {
  const { clinicSettings, updateClinicSetting } = useClinic();
  const { canEdit } = usePermissionsCtx();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const init: Record<string, string> = {};
    for (const t of MESSAGE_TEMPLATES) init[t.key] = clinicSettings[t.key] ?? t.defaultValue;
    setDrafts(init);
  }, [clinicSettings]);

  const handleSave = async (key: string) => {
    setSaving(p => ({ ...p, [key]: true }));
    try { await updateClinicSetting(key, drafts[key]); toast({ title: 'Mensagem salva' }); }
    finally { setSaving(p => ({ ...p, [key]: false })); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Mensagens WhatsApp</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Edite os textos enviados automaticamente. As variáveis são substituídas pelos dados reais.
        </p>
      </div>
      <div className="space-y-4">
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
  const { userPermissions, updateUserPermission, toggleAppUserActive, professionals, linkProfessionalToUser } = useClinic();
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
  const { appUsers, inviteAppUser } = useClinic();
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

// ── Seção: Importar Pacientes ─────────────────────────────────────────────────
function ImportarSection() {
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
      <div>
        <h2 className="text-lg font-semibold">Importar Pacientes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Importe pacientes de outro sistema via arquivo <strong>.xlsx</strong> ou <strong>.csv</strong>.
        </p>
      </div>

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

// ── Página principal ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'aparencia'    as Section, icon: Palette,            label: 'Aparência',              description: 'Tema claro ou escuro' },
  { id: 'preferencias' as Section, icon: SlidersHorizontal, label: 'Preferências',           description: 'Visualização padrão da agenda' },
  { id: 'mensagens'    as Section, icon: MessageSquare,      label: 'Mensagens WhatsApp',     description: 'Templates de mensagens automáticas' },
  { id: 'importar'     as Section, icon: Upload,             label: 'Importar Pacientes',     description: 'Importe de outro sistema via Excel ou CSV' },
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
