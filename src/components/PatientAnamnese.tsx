import { useState } from "react";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus, Trash2, Settings, ClipboardList,
  ChevronDown, ChevronUp, Send, Copy, Check,
  Eye, Clock, CheckCircle2, CircleDot, MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { AnamneseQuestionType, AnamneseResponse } from "@/types";

// ── Progresso da anamnese ────────────────────────────────────────────────────
const STEPS = [
  { key: "solicited", label: "Solicitada", icon: Send },
  { key: "waiting",   label: "Aguardando", icon: Clock },
  { key: "completed", label: "Concluída",  icon: CheckCircle2 },
] as const;

function AnamneseProgress({ status }: { status: "sent" | "completed" }) {
  const activeIndex = status === "completed" ? 2 : 1;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex flex-col sm:flex-row sm:items-center">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium",
              done   ? "bg-primary text-primary-foreground" :
              active ? "bg-primary/20 text-primary border border-primary" :
              "bg-muted text-muted-foreground",
            )}>
              <Icon className="h-3.5 w-3.5" />
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                "w-px h-3 ml-[18px] sm:w-6 sm:h-px sm:ml-0 sm:mx-1",
                done ? "bg-primary" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Gerenciador de perguntas ─────────────────────────────────────────────────
function QuestionsManager({ onClose }: { onClose: () => void }) {
  const { anamneseQuestions, addAnamneseQuestion, updateAnamneseQuestion, deleteAnamneseQuestion } = useClinic();
  const [newQ, setNewQ] = useState({ question: "", type: "sim_nao" as AnamneseQuestionType });
  const [saving, setSaving] = useState(false);

  const active = [...anamneseQuestions].filter((q) => q.active).sort((a, b) => a.sequence - b.sequence);
  const nextSeq = active.length ? Math.max(...active.map((q) => q.sequence)) + 1 : 1;

  const handleAdd = async () => {
    if (!newQ.question.trim()) return;
    setSaving(true);
    try {
      await addAnamneseQuestion(newQ.question.trim(), newQ.type, nextSeq);
      setNewQ({ question: "", type: "sim_nao" });
    } finally { setSaving(false); }
  };

  // Troca o sequence de duas perguntas vizinhas (swap real, paralelo)
  const moveQuestion = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= active.length) return;
    const a = active[index];
    const b = active[targetIndex];
    // Dispara os dois updates em paralelo sem await — o estado local
    // já é atualizado instantaneamente dentro de updateAnamneseQuestion
    Promise.all([
      updateAnamneseQuestion(a.id, { sequence: b.sequence }),
      updateAnamneseQuestion(b.id, { sequence: a.sequence }),
    ]);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[600px] rounded-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Perguntas da Anamnese</DialogTitle>
          <DialogDescription>Configure as perguntas que serão enviadas ao paciente.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            {active.map((q, idx) => (
              <div key={q.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <div className="flex flex-col gap-1 flex-shrink-0 items-center">
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === 0}
                    onClick={() => moveQuestion(idx, -1)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-mono text-muted-foreground">{idx + 1}</span>
                  <button
                    className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    disabled={idx === active.length - 1}
                    onClick={() => moveQuestion(idx, 1)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{q.question}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {q.type === "sim_nao" ? "Sim / Não" : "Descritivo"}
                  </Badge>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive flex-shrink-0">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
                      <AlertDialogDescription>Formulários já preenchidos não serão afetados.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deleteAnamneseQuestion(q.id)}
                      >Excluir</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
            {active.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pergunta ativa.</p>
            )}
          </div>
          <div className="border-t pt-4 space-y-3">
            <p className="text-sm font-medium">Nova pergunta</p>
            <Textarea
              placeholder="Digite a pergunta..."
              rows={2}
              className="text-sm resize-none"
              value={newQ.question}
              onChange={(e) => setNewQ({ ...newQ, question: e.target.value })}
            />
            <div className="flex gap-2">
              <Select value={newQ.type} onValueChange={(v) => setNewQ({ ...newQ, type: v as AnamneseQuestionType })}>
                <SelectTrigger className="h-8 text-sm flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim_nao">Sim / Não</SelectItem>
                  <SelectItem value="descritivo">Descritivo</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" className="gap-1.5" disabled={!newQ.question.trim() || saving} onClick={handleAdd}>
                <Plus className="h-3.5 w-3.5" />
                {saving ? "Adicionando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Visualização de anamnese concluída ───────────────────────────────────────
function AnamneseViewer({ response, onClose }: { response: AnamneseResponse; onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-[600px] rounded-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Anamnese Preenchida</DialogTitle>
          <DialogDescription>
            Concluída em {response.completedAt
              ? format(response.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : "—"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {[...response.answers]
            .sort((a, b) => a.questionSequence - b.questionSequence)
            .map((ans) => (
              <div key={ans.id} className="space-y-1">
                <p className="text-xs text-muted-foreground">{ans.questionSequence}.</p>
                <p className="text-sm font-medium">{ans.questionText}</p>
                {ans.questionType === "sim_nao" ? (
                  <div className="flex items-start gap-3">
                    <span className={cn(
                      "text-xs font-bold px-2.5 py-0.5 rounded-full",
                      ans.answerBool === true  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" :
                      ans.answerBool === false ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" :
                      "bg-muted text-muted-foreground",
                    )}>
                      {ans.answerBool === true ? "SIM" : ans.answerBool === false ? "NÃO" : "—"}
                    </span>
                    {ans.answerText && <p className="text-sm text-muted-foreground">{ans.answerText}</p>}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{ans.answerText || <span className="italic">Não respondido</span>}</p>
                )}
              </div>
            ))}

          {/* Registro de conformidade legal */}
          {response.status === "completed" && (
            <div className="border-t pt-4 space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Registro de Conformidade</p>
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <svg className="h-3.5 w-3.5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <p className="text-xs font-semibold text-green-800 dark:text-green-200">Declaração eletrônica confirmada</p>
                </div>
                {response.signedName && (
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Paciente: <strong>{response.signedName}</strong>
                  </p>
                )}
                {response.verifiedPhone && (
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Telefone verificado (WhatsApp): <strong>{response.verifiedPhone}</strong>
                  </p>
                )}
                {response.signedAt && (
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Confirmado em: {format(response.signedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
                {response.ipAddress && (
                  <p className="text-xs text-green-700 dark:text-green-300">
                    IP do dispositivo: <span className="font-mono">{response.ipAddress}</span>
                  </p>
                )}
                {response.userAgent && (
                  <p className="text-xs text-green-700 dark:text-green-300 truncate" title={response.userAgent}>
                    Dispositivo: {response.userAgent.substring(0, 60)}{response.userAgent.length > 60 ? "…" : ""}
                  </p>
                )}
                <p className="text-[10px] text-green-600 dark:text-green-400 pt-0.5">
                  Lei 14.063/2020 (assinatura eletrônica) · MP 2.200-2/2001 · LGPD (Lei 13.709/2018)
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export function PatientAnamnese({ patientId, patientName }: { patientId: string; patientName: string }) {
  const { anamneseQuestions, requestAnamneseForPatient, sendAnamneseViaWhatsapp, getAnamneseByPatientId } = useClinic();
  const responses = getAnamneseByPatientId(patientId);

  const [showManager, setShowManager] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [pendingRequest, setPendingRequest] = useState<{ link: string; code: string } | null>(null);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState<string | null>(null); // responseId sendo enviado
  const [viewingResponse, setViewingResponse] = useState<AnamneseResponse | null>(null);

  const activeQuestions = anamneseQuestions.filter((q) => q.active);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      const result = await requestAnamneseForPatient(patientId);
      setPendingRequest(result);
    } finally {
      setRequesting(false);
    }
  };

  const copy = (text: string, type: "link" | "code") => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          {activeQuestions.length} pergunta{activeQuestions.length !== 1 ? "s" : ""} no formulário
        </p>
        <div className="flex justify-center sm:justify-end">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => setShowManager(true)}>
            <Settings className="h-4 w-4" />
            Gerenciar Perguntas
          </Button>
        </div>
      </div>

      {/* Nenhuma anamnese ainda */}
      {responses.length === 0 && !pendingRequest && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-14 gap-4">
            <ClipboardList className="h-12 w-12 text-muted-foreground" />
            <div className="text-center space-y-1">
              <p className="font-medium">Nenhuma anamnese solicitada</p>
              <p className="text-sm text-muted-foreground">
                Solicite o preenchimento e envie o link ao paciente.
              </p>
            </div>
            <Button className="gap-2" onClick={handleRequest} disabled={requesting || activeQuestions.length === 0}>
              <Send className="h-4 w-4" />
              {requesting ? "Gerando link..." : "Solicitar Preenchimento"}
            </Button>
            {activeQuestions.length === 0 && (
              <p className="text-xs text-destructive">Adicione perguntas antes de solicitar.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Link gerado agora (ainda não recarregou) */}
      {pendingRequest && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-primary" />
              Solicitação enviada
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Compartilhe o link e o código com o paciente via WhatsApp ou outro canal.
            </p>
            <div className="space-y-2">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Link de acesso</p>
                <div className="flex gap-2">
                  <Input readOnly value={pendingRequest.link} className="text-xs font-mono h-8" />
                  <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0"
                    onClick={() => copy(pendingRequest.link, "link")}>
                    {copied === "link" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "link" ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Código de verificação</p>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2 flex-wrap">
                    {pendingRequest.code.split("").map((d, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg border-2 border-primary bg-primary/10 flex items-center justify-center text-lg font-bold">
                        {d}
                      </div>
                    ))}
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 w-full sm:w-auto"
                    onClick={() => copy(pendingRequest.code, "code")}>
                    {copied === "code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied === "code" ? "Copiado!" : "Copiar código"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Botão de envio WhatsApp */}
            <div className="border-t pt-4 mt-1">
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
                disabled={sendingWhatsapp === "pending"}
                onClick={async () => {
                  setSendingWhatsapp("pending");
                  try {
                    const r = responses[0]; // response mais recente criada
                    if (r?.token) {
                      await sendAnamneseViaWhatsapp(patientId, r.id, r.token, r.code ?? "");
                    }
                  } finally {
                    setSendingWhatsapp(null);
                  }
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {sendingWhatsapp === "pending" ? "Enviando..." : "Enviar para o WhatsApp"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de anamneses existentes */}
      {responses.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  Solicitada em {format(r.createdAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                {r.completedAt && (
                  <p className="text-xs text-muted-foreground">
                    Concluída em {format(r.completedAt, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
              {r.status === "completed" ? (
                <Button size="sm" variant="outline" className="gap-2"
                  onClick={() => setViewingResponse(r)}>
                  <Eye className="h-4 w-4" />
                  Ver Anamnese
                </Button>
              ) : (
                <Button size="sm" variant="ghost" className="gap-2 text-muted-foreground"
                  onClick={() => r.token && setPendingRequest({ link: `${window.location.origin}/anamnese/${r.token}`, code: r.code ?? "" })}>
                  <Copy className="h-4 w-4" />
                  Ver link
                </Button>
              )}
            </div>
            <AnamneseProgress status={r.status} />
            {r.status === "sent" && r.token && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Link expira em 7 dias · Código: <strong>{r.code}</strong>
                </p>
                <Button
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  disabled={sendingWhatsapp === r.id}
                  onClick={async () => {
                    setSendingWhatsapp(r.id);
                    try {
                      await sendAnamneseViaWhatsapp(patientId, r.id, r.token!, r.code ?? "");
                    } finally {
                      setSendingWhatsapp(null);
                    }
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                  {sendingWhatsapp === r.id ? "Enviando..." : "Enviar para o WhatsApp"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ))}

      {/* Botão de nova solicitação quando já existe pelo menos uma */}
      {responses.length > 0 && !pendingRequest && (
        <Button variant="outline" size="sm" className="gap-2 w-full"
          onClick={handleRequest} disabled={requesting}>
          <Plus className="h-4 w-4" />
          {requesting ? "Gerando link..." : "Nova Solicitação"}
        </Button>
      )}

      {showManager && <QuestionsManager onClose={() => setShowManager(false)} />}
      {viewingResponse && <AnamneseViewer response={viewingResponse} onClose={() => setViewingResponse(null)} />}
    </div>
  );
}
