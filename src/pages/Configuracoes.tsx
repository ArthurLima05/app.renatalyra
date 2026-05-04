import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
  Save, RotateCcw, MessageSquare, Palette, ChevronRight, ArrowLeft, Info,
  Sun, Moon, Users, Plus, ChevronDown, ChevronUp, Mail, Phone, Shield,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { AppUser, UserProfile, AppModule, UserPermission } from '@/types';

type Section = null | 'aparencia' | 'mensagens' | 'usuarios';
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
  recepcionista: 'bg-gray-100 text-gray-800 dark:bg-gray-700/40 dark:text-gray-300',
};

const MODULES: { id: AppModule; label: string; description: string }[] = [
  { id: 'agenda',        label: 'Agenda',         description: 'Agendamentos e calendário' },
  { id: 'dashboard',     label: 'Dashboard',      description: 'Métricas e relatórios' },
  { id: 'pacientes',     label: 'Pacientes',      description: 'Cadastro e prontuários' },
  { id: 'financeiro',    label: 'Financeiro',     description: 'Transações e parcelas' },
  { id: 'profissionais', label: 'Profissionais',  description: 'Gestão de profissionais' },
  { id: 'notificacoes',  label: 'Notificações',   description: 'Central de notificações' },
  { id: 'configuracoes', label: 'Configurações',  description: 'Configurações do sistema' },
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

// ── Seção: Mensagens ──────────────────────────────────────────────────────────
function MensagensSection() {
  const { clinicSettings, updateClinicSetting } = useClinic();
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
                <div className="flex flex-wrap gap-1.5 items-center">
                  {tpl.variables.map(v => <Badge key={v} variant="secondary" className="font-mono text-xs">{v}</Badge>)}
                  <span className="text-xs text-muted-foreground flex items-center gap-1"><Info className="h-3 w-3" /> variáveis</span>
                </div>
                <Textarea rows={3} value={drafts[tpl.key] ?? tpl.defaultValue}
                  onChange={e => setDrafts(p => ({ ...p, [tpl.key]: e.target.value }))}
                  className="text-sm font-mono resize-none" />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground"
                    onClick={() => setDrafts(p => ({ ...p, [tpl.key]: tpl.defaultValue }))}>
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </Button>
                  <Button size="sm" className="gap-1.5" disabled={!dirty || saving[tpl.key]} onClick={() => handleSave(tpl.key)}>
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
  mod, perm, onChange,
}: {
  mod: typeof MODULES[0];
  perm: UserPermission | undefined;
  onChange: (field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => void;
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
            <label key={c.field} className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                checked={perm?.[c.field] ?? false}
                onCheckedChange={v => onChange(c.field, !!v)}
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
  const { userPermissions, updateUserPermission, toggleAppUserActive } = useClinic();
  const perms = userPermissions.filter(p => p.userId === user.id);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground" onClick={onBack}>
        <ArrowLeft className="h-4 w-4" /> Usuários
      </Button>

      {/* Card do usuário */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{user.fullName}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PROFILE_COLORS[user.profile]}`}>
                  {PROFILE_LABELS[user.profile]}
                </span>
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" />{user.email}
              </p>
              {user.phone && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" />{user.phone}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <span className="text-xs text-muted-foreground">{user.active ? 'Ativo' : 'Inativo'}</span>
              <Switch
                checked={user.active}
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
              perm={perms.find(p => p.module === mod.id)}
              onChange={(field, value) => updateUserPermission(user.id, mod.id, field, value)}
            />
          ))}
        </div>
      </div>
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
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie quem acessa o sistema e o que pode fazer.</p>
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
              <Input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(00) 00000-0000" />
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

// ── Página principal ──────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'aparencia' as Section,  icon: Palette,       label: 'Aparência',                description: 'Tema claro ou escuro' },
  { id: 'mensagens' as Section,  icon: MessageSquare, label: 'Mensagens WhatsApp',        description: 'Templates de mensagens automáticas' },
  { id: 'usuarios'  as Section,  icon: Users,         label: 'Usuários e Permissões',     description: 'Quem acessa e o que pode fazer' },
];

export default function Configuracoes() {
  const [section, setSection] = useState<Section>(null);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl mx-auto space-y-6">
      <AnimatePresence mode="wait">
        {section === null ? (
          <motion.div key="menu" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
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
            {section === 'aparencia'  && <AparenciaSection />}
            {section === 'mensagens'  && <MensagensSection />}
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
