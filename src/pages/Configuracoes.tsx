import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Save, RotateCcw, MessageSquare, Palette, Info } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MessageTemplate {
  key: string;
  label: string;
  description: string;
  variables: string[];
  defaultValue: string;
}

const MESSAGE_TEMPLATES: MessageTemplate[] = [
  {
    key: 'msg_return_alert',
    label: 'Alerta de Retorno',
    description: 'Enviada automaticamente quando o prazo de retorno do paciente vence.',
    variables: ['{{nome_paciente}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 😊 Aqui é a clínica Dra. Renata Lyra. Percebemos que faz um tempo desde sua última consulta. Que tal agendar um retorno? Estamos à disposição para cuidar de você! 📅',
  },
  {
    key: 'msg_appointment_confirmation',
    label: 'Confirmação de Consulta',
    description: 'Enviada para o paciente confirmar ou cancelar o agendamento.',
    variables: ['{{nome_paciente}}', '{{data}}', '{{hora}}'],
    defaultValue: 'Olá, {{nome_paciente}}! Lembramos que você tem consulta marcada para *{{data}}* às *{{hora}}*. Confirme sua presença respondendo *SIM* ou cancele respondendo *NÃO*. 😊',
  },
  {
    key: 'msg_appointment_cancellation',
    label: 'Cancelamento de Consulta',
    description: 'Enviada ao paciente quando uma consulta é cancelada.',
    variables: ['{{nome_paciente}}', '{{data}}'],
    defaultValue: 'Olá, {{nome_paciente}}! Infelizmente sua consulta do dia *{{data}}* foi cancelada. Entre em contato para reagendar. 📞',
  },
  {
    key: 'msg_feedback_request',
    label: 'Solicitação de Feedback',
    description: 'Enviada após a realização da consulta pedindo avaliação no Google.',
    variables: ['{{nome_paciente}}', '{{link}}'],
    defaultValue: 'Olá, {{nome_paciente}}! 🌟 Esperamos que sua consulta tenha sido excelente. Sua opinião é muito importante para nós! Deixe sua avaliação: {{link}}',
  },
];

export default function Configuracoes() {
  const { clinicSettings, updateClinicSetting } = useClinic();
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const tpl of MESSAGE_TEMPLATES) {
      initial[tpl.key] = clinicSettings[tpl.key] ?? tpl.defaultValue;
    }
    setDrafts(initial);
  }, [clinicSettings]);

  const handleSave = async (key: string) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await updateClinicSetting(key, drafts[key]);
      toast({ title: 'Mensagem salva' });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleReset = (tpl: MessageTemplate) => {
    setDrafts(prev => ({ ...prev, [tpl.key]: tpl.defaultValue }));
  };

  const isDirty = (key: string, defaultValue: string) => {
    const saved = clinicSettings[key] ?? defaultValue;
    return drafts[key] !== undefined && drafts[key] !== saved;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8 max-w-3xl mx-auto"
    >
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Personalize o sistema e as mensagens enviadas aos pacientes.</p>
      </div>

      {/* ── Aparência ─────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4" />
            Aparência
          </CardTitle>
          <CardDescription>Ajuste o tema visual do sistema.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tema</p>
              <p className="text-xs text-muted-foreground">Alterne entre o modo claro e escuro.</p>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>

      {/* ── Mensagens WhatsApp ────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Mensagens WhatsApp
          </CardTitle>
          <CardDescription>
            Edite os textos enviados automaticamente pelo sistema via n8n. Use as variáveis listadas — elas serão substituídas pelos dados reais na hora do envio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {MESSAGE_TEMPLATES.map((tpl, i) => (
            <div key={tpl.key}>
              {i > 0 && <Separator className="mb-8" />}
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-semibold">{tpl.label}</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tpl.variables.map(v => (
                    <Badge key={v} variant="secondary" className="font-mono text-xs">
                      {v}
                    </Badge>
                  ))}
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3" />
                    variáveis disponíveis
                  </span>
                </div>

                <Textarea
                  rows={4}
                  value={drafts[tpl.key] ?? tpl.defaultValue}
                  onChange={(e) => setDrafts(prev => ({ ...prev, [tpl.key]: e.target.value }))}
                  className="text-sm font-mono resize-none"
                />

                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground"
                    onClick={() => handleReset(tpl)}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restaurar padrão
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5"
                    disabled={!isDirty(tpl.key, tpl.defaultValue) || saving[tpl.key]}
                    onClick={() => handleSave(tpl.key)}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {saving[tpl.key] ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
}
