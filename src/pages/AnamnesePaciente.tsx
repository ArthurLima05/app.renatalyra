import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import logoClinica from "@/assets/logo-clinica.jpg";

type Step = "code" | "form" | "sign" | "done" | "error" | "loading";

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
}

type FormAnswers = Record<string, { bool?: boolean | null; text?: string }>;

export default function AnamnesePaciente() {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState<Step>("loading");
  const [tokenRecord, setTokenRecord] = useState<TokenRecord | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [patientName, setPatientName] = useState("");
  const [codeInput, setCodeInput] = useState(["", "", "", ""]);
  const [codeError, setCodeError] = useState("");
  const [answers, setAnswers] = useState<FormAnswers>({});
  const [signedName, setSignedName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) { setStep("error"); setErrorMessage("Link inválido."); return; }
    (async () => {
      // Busca token
      const { data: tk, error: tkErr } = await (supabase as any)
        .from("anamnese_tokens")
        .select("*")
        .eq("token", token)
        .single();

      if (tkErr || !tk) { setStep("error"); setErrorMessage("Link não encontrado."); return; }
      if (tk.used_at) { setStep("error"); setErrorMessage("Este formulário já foi preenchido."); return; }
      if (new Date(tk.expires_at) < new Date()) { setStep("error"); setErrorMessage("Este link expirou."); return; }

      setTokenRecord(tk);

      // Busca nome do paciente
      const { data: pt } = await (supabase as any)
        .from("patients").select("full_name").eq("id", tk.patient_id).single();
      if (pt) setPatientName(pt.full_name);

      // Busca perguntas ativas
      const { data: qs } = await (supabase as any)
        .from("anamnese_questions").select("*").eq("active", true).order("sequence");
      setQuestions(qs || []);

      setStep("code");
    })();
  }, [token]);

  // Verificar código
  const handleCodeSubmit = () => {
    const entered = codeInput.join("");
    if (entered === tokenRecord?.code) {
      setCodeError("");
      setStep("form");
    } else {
      setCodeError("Código incorreto. Verifique e tente novamente.");
    }
  };

  // Submeter anamnese
  const handleSubmit = async () => {
    if (!signedName.trim()) return;
    setSubmitting(true);
    try {
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
        completed_at: new Date().toISOString(),
        patient_signed_name: signedName.trim(),
        signed_at: new Date().toISOString(),
      }).eq("id", tokenRecord!.response_id);
      await (supabase as any).from("anamnese_tokens").update({ used_at: new Date().toISOString() }).eq("id", tokenRecord!.id);

      setStep("done");
    } catch (e: any) {
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
          <div className="bg-muted rounded-lg p-4 text-xs text-muted-foreground text-left space-y-1">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-green-500" />
              Assinatura eletrônica registrada
            </p>
            <p>A assinatura valida a anamnese, garante conformidade legal, segurança dos dados e o consentimento informado.</p>
            <p>Assinatura eletrônica conforme MP 2.200-2/2001.</p>
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
          {["Verificação", "Formulário", "Assinatura"].map((label, i) => {
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
                O código de 4 dígitos foi fornecido pela clínica.
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
                    if (val && i < 3) document.getElementById(`code-${i + 1}`)?.focus();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !codeInput[i] && i > 0) {
                      document.getElementById(`code-${i - 1}`)?.focus();
                    }
                  }}
                  className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl bg-background focus:border-primary focus:outline-none transition-colors"
                />
              ))}
            </div>
            {codeError && <p className="text-sm text-destructive text-center">{codeError}</p>}
            <Button
              className="w-full"
              disabled={codeInput.join("").length < 4}
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
                      <Input
                        placeholder="Observações (opcional)"
                        className="text-sm"
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
              Continuar para Assinatura
            </Button>
          </div>
        )}

        {/* ── ETAPA 3: ASSINATURA ── */}
        {step === "sign" && (
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <h2 className="font-semibold">Assinar e Confirmar</h2>
              <p className="text-sm text-muted-foreground">
                Revise e assine digitalmente para validar a anamnese.
              </p>
            </div>

            {/* Aviso legal */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">Assinatura Eletrônica</p>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                A assinatura do paciente valida a anamnese, garante conformidade legal, segurança dos dados e o consentimento informado.
              </p>
              <p className="text-xs text-blue-800 dark:text-blue-300">
                A assinatura eletrônica segue as regras da{" "}
                <strong>MP 2.200-2/2001</strong>.
              </p>
            </div>

            {/* Campo de assinatura */}
            <div className="space-y-2">
              <Label>Assinatura — digite seu nome completo</Label>
              <div className="border-2 rounded-xl p-4 space-y-1 focus-within:border-primary transition-colors">
                <input
                  type="text"
                  placeholder="Seu nome completo..."
                  className="w-full bg-transparent text-xl italic font-medium placeholder:text-muted-foreground/50 focus:outline-none"
                  value={signedName}
                  onChange={(e) => setSignedName(e.target.value)}
                  style={{ fontFamily: "Georgia, serif" }}
                />
                {signedName && (
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString("pt-BR")} às {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Ao assinar, você confirma que as informações prestadas são verdadeiras.
              </p>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("form")} className="flex-1">
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!signedName.trim() || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                ) : (
                  "Confirmar e Enviar"
                )}
              </Button>
            </div>

            {errorMessage && <p className="text-sm text-destructive text-center">{errorMessage}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
