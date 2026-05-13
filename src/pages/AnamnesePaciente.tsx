import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, ShieldCheck, AlertCircle, Smartphone } from "lucide-react";
import logoClinica from "@/assets/logo-clinica.jpg";

type Step = "code" | "form" | "sign" | "done" | "error" | "loading" | "blocked";

interface Question {
  id: string;
  question: string;
  sequence: number;
  type: "descritivo" | "sim_nao";
}

interface TokenRecord {
  id: string;
  response_id: string;
  patient_id: string;
  code: string;
  expires_at: string;
  used_at: string | null;
  attempts: number;
  blocked_at: string | null;
}

const MAX_ATTEMPTS = 5;

type FormAnswers = Record<string, { bool?: boolean | null; text?: string }>;

const DECLARATIONS = [
  "As informações prestadas neste formulário são verdadeiras e completas.",
  "Li e compreendi todas as perguntas apresentadas.",
  "Autorizo o uso das minhas informações de saúde exclusivamente para fins de tratamento odontológico, em conformidade com a LGPD (Lei 13.709/2018).",
  "Estou ciente de que esta confirmação tem validade jurídica de assinatura eletrônica conforme a Lei 14.063/2020 e é identificada pelo meu número de telefone verificado via WhatsApp.",
];

export default function AnamnesePaciente() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [tokenRecord, setTokenRecord] = useState<TokenRecord | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [codeInput, setCodeInput] = useState(["", "", "", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [declarations, setDeclarations] = useState([false, false, false, false]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [confirmedAt] = useState(() => new Date());

  useEffect(() => {
    if (!token) { setStep("error"); setErrorMessage("Link inválido."); return; }
    (async () => {
      const { data: tk, error: tkErr } = await (supabase as any)
        .from("anamnese_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tkErr || !tk) { setStep("error"); setErrorMessage("Link não encontrado."); return; }
      if (tk.used_at) { setStep("error"); setErrorMessage("Este formulário já foi preenchido."); return; }
      if (new Date(tk.expires_at) < new Date()) { setStep("error"); setErrorMessage("Este link expirou."); return; }
      if (tk.blocked_at) { setStep("blocked"); return; }

      setTokenRecord(tk);

      const { data: pt } = await (supabase as any)
        .from("patients").select("full_name, phone").eq("id", tk.patient_id).single();
      if (pt) {
        setPatientName(pt.full_name);
        setPatientPhone(pt.phone ?? "");
      }

      const { data: qs } = await (supabase as any)
        .from("anamnese_questions").select("*").eq("active", true).order("sequence");
      setQuestions(qs || []);

      setStep("code");
    })();
  }, [token]);

  const handleCodeSubmit = async () => {
    if (!tokenRecord) return;
    const entered = codeInput.join("");

    if (entered === tokenRecord.code) {
      setCodeError("");
      setStep("form");
      return;
    }

    // Código errado — incrementa tentativas no banco
    const newAttempts = (tokenRecord.attempts ?? 0) + 1;
    const isBlocked = newAttempts >= MAX_ATTEMPTS;

    await (supabase as any)
      .from("anamnese_tokens")
      .update({
        attempts: newAttempts,
        ...(isBlocked ? { blocked_at: new Date().toISOString() } : {}),
      })
      .eq("id", tokenRecord.id);

    setTokenRecord((prev) => prev ? { ...prev, attempts: newAttempts } : prev);

    if (isBlocked) {
      setStep("blocked");
    } else {
      const restantes = MAX_ATTEMPTS - newAttempts;
      setCodeError(
        `Código incorreto. ${restantes} tentativa${restantes === 1 ? "" : "s"} restante${restantes === 1 ? "" : "s"}.`
      );
    }
  };

  const handleSubmit = async () => {
    if (!declarations.every(Boolean)) return;
    setSubmitting(true);
    try {
      // Captura IP público e user-agent
      let ipAddress = "";
      try {
        const res = await fetch("https://api.ipify.org?format=json");
        const json = await res.json();
        ipAddress = json.ip ?? "";
      } catch {
        // ignora falha no IP — dados restantes ainda são suficientes
      }
      const userAgent = navigator.userAgent;
      const now = new Date().toISOString();

      const rows = questions.map((q) => ({
        response_id: tokenRecord!.response_id,
        question_id: q.id,
        question_text: q.question,
        question_type: q.type,
        question_sequence: q.sequence,
        answer_bool: q.type === "sim_nao" ? (answers[q.id]?.bool ?? null) : null,
        answer_text: answers[q.id]?.text ?? null,
      }));

      await (supabase as any).from("anamnese_answers").insert(rows);
      await (supabase as any).from("anamnese_responses").update({
        status: "completed",
        completed_at: now,
        // Mantém campo legado com o nome (para compatibilidade)
        patient_signed_name: patientName,
        signed_at: now,
        // Novos metadados legais
        ip_address: ipAddress || null,
        user_agent: userAgent,
        verified_phone: patientPhone || null,
      }).eq("id", tokenRecord!.response_id);
      await (supabase as any).from("anamnese_tokens")
        .update({ used_at: now })
        .eq("id", tokenRecord!.id);

      setStep("done");
    } catch {
      setErrorMessage("Erro ao enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── LOADING
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── ERROR
  if (step === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
          <h1 className="text-xl font-semibold">Link inválido</h1>
          <p className="text-sm text-muted-foreground">{errorMessage}</p>
        </div>
      </div>
    );
  }

  // ── BLOCKED
  if (step === "blocked") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-xl font-semibold">Link bloqueado</h1>
          <p className="text-sm text-muted-foreground">
            Este link foi bloqueado após {MAX_ATTEMPTS} tentativas incorretas de código.
            Entre em contato com a clínica para receber um novo link.
          </p>
        </div>
      </div>
    );
  }

  // ── DONE
  if (step === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Anamnese concluída!</h1>
            <p className="text-muted-foreground">
              Obrigado, <strong>{patientName}</strong>. Suas respostas foram enviadas com sucesso.
            </p>
          </div>
          <div className="bg-muted rounded-lg p-4 text-xs text-muted-foreground text-left space-y-2">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              Declaração eletrônica registrada
            </p>
            <p>Identidade verificada por WhatsApp · {confirmedAt.toLocaleDateString("pt-BR")} às {confirmedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
            <p className="text-[10px] leading-relaxed">
              Validade jurídica conforme Lei 14.063/2020 (assinatura eletrônica) e LGPD (Lei 13.709/2018). O registro inclui telefone verificado, endereço IP e identificação do dispositivo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={logoClinica} alt="Clínica" className="h-14 object-contain" />
          <div>
            <h1 className="text-xl font-bold">Ficha de Anamnese</h1>
            {patientName && <p className="text-sm text-muted-foreground">Olá, <strong>{patientName}</strong>!</p>}
          </div>
        </div>

        {/* Progresso */}
        <div className="flex justify-center gap-0">
          {["Verificação", "Formulário", "Confirmação"].map((label, i) => {
            const stepIndex = step === "code" ? 0 : step === "form" ? 1 : 2;
            return (
              <div key={label} className="flex items-center">
                <div className={cn(
                  "text-xs px-3 py-1 rounded-full font-medium",
                  i < stepIndex ? "bg-primary text-primary-foreground" :
                  i === stepIndex ? "bg-primary/20 text-primary border border-primary" :
                  "bg-muted text-muted-foreground",
                )}>
                  {label}
                </div>
                {i < 2 && <div className={cn("h-px w-5 mx-1", i < stepIndex ? "bg-primary" : "bg-border")} />}
              </div>
            );
          })}
        </div>

        {/* ── ETAPA 1: CÓDIGO ── */}
        {step === "code" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-semibold">Digite o código de verificação</h2>
              <p className="text-sm text-muted-foreground">
                O código de 4 dígitos foi fornecido pela clínica via WhatsApp.
              </p>
            </div>
            <div className="flex justify-center gap-3">
              {codeInput.map((digit, i) => (
                <input
                  key={i}
                  id={`code-${i}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/, "");
                    const next = [...codeInput];
                    next[i] = val;
                    setCodeInput(next);
                    setCodeError("");
                    if (val && i < 5) document.getElementById(`code-${i + 1}`)?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !codeInput[i] && i > 0) {
                      document.getElementById(`code-${i - 1}`)?.focus();
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    if (!pasted) return;
                    const next = ["", "", "", "", "", ""];
                    for (let j = 0; j < pasted.length; j++) next[j] = pasted[j];
                    setCodeInput(next);
                    setCodeError("");
                    // Foca no próximo campo vazio ou no último
                    const focusIdx = Math.min(pasted.length, 5);
                    document.getElementById(`code-${focusIdx}`)?.focus();
                  }}
                  className="w-11 h-12 text-center text-xl font-bold border-2 rounded-xl bg-background focus:border-primary focus:outline-none transition-colors"
                />
              ))}
            </div>
            {codeError && <p className="text-sm text-destructive text-center">{codeError}</p>}
            <Button
              className="w-full"
              disabled={codeInput.join("").length < 6}
              onClick={handleCodeSubmit}
            >
              Confirmar código
            </Button>
          </div>
        )}

        {/* ── ETAPA 2: FORMULÁRIO ── */}
        {step === "form" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-semibold">Preencha o formulário</h2>
              <p className="text-sm text-muted-foreground">Responda com honestidade. Suas informações são confidenciais.</p>
            </div>

            <div className="space-y-5">
              {questions.map((q) => (
                <div key={q.id} className="space-y-2 pb-4 border-b last:border-0">
                  <Label className="text-sm font-medium leading-snug">
                    <span className="text-muted-foreground mr-1.5">{q.sequence}.</span>
                    {q.question}
                  </Label>

                  {q.type === "sim_nao" && (
                    <div className="space-y-2">
                      <div className="flex gap-3">
                        {([true, false] as const).map((val) => (
                          <button
                            key={String(val)}
                            type="button"
                            onClick={() => setAnswers((prev) => ({
                              ...prev,
                              [q.id]: { ...prev[q.id], bool: answers[q.id]?.bool === val ? null : val },
                            }))}
                            className={cn(
                              "flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors",
                              answers[q.id]?.bool === val
                                ? val
                                  ? "bg-green-100 border-green-500 text-green-800"
                                  : "bg-red-100 border-red-500 text-red-800"
                                : "border-border hover:bg-muted",
                            )}
                          >
                            {val ? "Sim" : "Não"}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Observações (opcional)"
                        className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                        value={answers[q.id]?.text ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))}
                      />
                    </div>
                  )}

                  {q.type === "descritivo" && (
                    <Textarea
                      className="text-sm resize-none"
                      rows={2}
                      placeholder="Sua resposta..."
                      value={answers[q.id]?.text ?? ""}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: { ...prev[q.id], text: e.target.value } }))}
                    />
                  )}
                </div>
              ))}
            </div>

            <Button className="w-full" onClick={() => setStep("sign")}>
              Continuar para Confirmação
            </Button>
          </div>
        )}

        {/* ── ETAPA 3: DECLARAÇÃO E CONFIRMAÇÃO ── */}
        {step === "sign" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-semibold">Confirmar e Enviar</h2>
              <p className="text-sm text-muted-foreground">
                Leia e marque cada declaração para concluir.
              </p>
            </div>

            {/* Identidade verificada */}
            <div className="bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-green-900 dark:text-green-200">
                  Identidade verificada por WhatsApp
                </p>
              </div>
              <div className="text-xs text-green-800 dark:text-green-300 space-y-0.5">
                <p><strong>{patientName}</strong></p>
                {patientPhone && <p>Telefone: {patientPhone}</p>}
                <p>
                  {confirmedAt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}{" "}
                  às {confirmedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>

            {/* Checkboxes de declaração */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Declaro que:</p>
              {DECLARATIONS.map((text, i) => (
                <label
                  key={i}
                  className={cn(
                    "flex items-start gap-3 cursor-pointer rounded-xl border p-3 transition-colors",
                    declarations[i]
                      ? "border-primary/40 bg-primary/5"
                      : "border-border hover:bg-muted/50",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={declarations[i]}
                    onChange={(e) => {
                      const next = [...declarations];
                      next[i] = e.target.checked;
                      setDeclarations(next);
                    }}
                    className="mt-0.5 h-4 w-4 flex-shrink-0 accent-primary"
                  />
                  <span className="text-sm leading-snug text-muted-foreground">
                    {text}
                  </span>
                </label>
              ))}
            </div>

            {/* Nota legal */}
            <div className="rounded-lg bg-muted px-4 py-3 text-[11px] text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Registro de conformidade</p>
              <p>
                Esta confirmação registra: identidade verificada por código WhatsApp,
                endereço IP do dispositivo, identificação do navegador e data/hora.
                Esses dados constituem assinatura eletrônica simples nos termos da{" "}
                <strong>Lei 14.063/2020</strong> e têm validade probatória conforme
                o <strong>art. 10 da MP 2.200-2/2001</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!declarations.every(Boolean) || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                ) : (
                  "Confirmar e Enviar"
                )}
              </Button>
            </div>

            {errorMessage && (
              <p className="text-sm text-destructive text-center">{errorMessage}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
