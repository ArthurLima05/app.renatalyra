import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, CheckCircle2, Lock, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import brasilFlag from "../../imagens-copa/brasil.png";
import marrocosFlag from "../../imagens-copa/marrocos.png";
import renataBrasil from "../../imagens-copa/renata-brasil.jpg";

// Prazo: Sábado 13/06/2026 às 18:59 BRT (UTC-3) = 21:59 UTC
const DEADLINE = new Date("2026-06-13T21:59:00Z");

function formatCPF(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCPF(cpf: string) {
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i);
  let r = (s * 10) % 11;
  if (r >= 10) r = 0;
  if (r !== +d[9]) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i);
  r = (s * 10) % 11;
  if (r >= 10) r = 0;
  return r === +d[10];
}

function useCountdown(target: Date) {
  const [diff, setDiff] = useState(target.getTime() - Date.now());
  useEffect(() => {
    const id = setInterval(() => setDiff(target.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const total = Math.max(0, diff);
  const days = Math.floor(total / 86_400_000);
  const hours = Math.floor((total % 86_400_000) / 3_600_000);
  const minutes = Math.floor((total % 3_600_000) / 60_000);
  const seconds = Math.floor((total % 60_000) / 1_000);
  return { days, hours, minutes, seconds, expired: diff <= 0 };
}

function CountUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center shadow-inner">
        <span
          className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums"
          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
        >
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1.5">{label}</span>
    </div>
  );
}

function ScoreSelector({
  value,
  onChange,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(value + 1)}
        className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
      >
        <Plus className="w-4 h-4 text-foreground" />
      </button>
      <span
        className="text-6xl sm:text-7xl font-bold text-foreground tabular-nums leading-none w-16 text-center select-none"
        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
      >
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="w-10 h-10 rounded-full bg-primary/20 hover:bg-primary/40 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
      >
        <Minus className="w-4 h-4 text-foreground" />
      </button>
    </div>
  );
}

export default function PalpiteCopa() {
  const { days, hours, minutes, seconds, expired } = useCountdown(DEADLINE);

  // Impede navegação para fora desta página (protege URLs do sistema)
  useEffect(() => {
    window.history.replaceState(null, document.title, "/palpite-copa");
    const block = () => window.history.pushState(null, document.title, "/palpite-copa");
    window.addEventListener("popstate", block);
    return () => window.removeEventListener("popstate", block);
  }, []);

  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [scoreBrasil, setScoreBrasil] = useState(0);
  const [scoreMarrocos, setScoreMarrocos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!nome.trim() || nome.trim().length < 3) {
      setError("Por favor, informe seu nome completo.");
      return;
    }
    if (!isValidCPF(cpf)) {
      setError("CPF inválido. Verifique e tente novamente.");
      return;
    }

    setLoading(true);
    const { error: dbError } = await supabase.from("palpites_copa").insert({
      nome: nome.trim(),
      cpf: cpf.replace(/\D/g, ""),
      placar_brasil: scoreBrasil,
      placar_marrocos: scoreMarrocos,
    });
    setLoading(false);

    if (dbError) {
      if (dbError.code === "23505") {
        setError("Este CPF já registrou um palpite. Apenas um palpite por pessoa!");
      } else {
        setError("Ocorreu um erro ao registrar seu palpite. Tente novamente.");
      }
      return;
    }
    setSubmitted(true);
  }

  const isFormDisabled = expired || loading;

  return (
    <div
      className="relative min-h-screen w-full flex flex-col overflow-hidden"
      style={{
        background:
          "linear-gradient(170deg, hsl(150 60% 8%) 0%, hsl(150 50% 14%) 35%, hsl(40 30% 12%) 70%, hsl(40 25% 8%) 100%)",
      }}
    >
      {/* Background photo */}
      <img
        src={renataBrasil}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
        style={{ opacity: 0.09, objectPosition: "50% 0%" }}
      />

      {/* All content above background */}
      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="w-full flex justify-center pt-8 pb-2 px-4">
          <div className="flex flex-col items-center gap-1">
            <span className="text-xs uppercase tracking-[0.2em] text-primary/60 font-medium">
              Clínica Dra. Renata Lyra
            </span>
            <h1
              className="text-3xl sm:text-4xl font-cocon tracking-wide text-primary"
              style={{ textShadow: "0 2px 20px hsl(40 45% 68% / 0.4)" }}
            >
              Palpite da Copa
            </h1>
            <p className="text-xs text-primary/50 tracking-widest uppercase mt-0.5">
              Copa do Mundo 2026
            </p>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 gap-6 max-w-lg mx-auto w-full">
          {/* Countdown */}
          {!expired && !submitted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center gap-3 w-full"
            >
              <div className="flex items-center gap-1.5 text-primary/70">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs uppercase tracking-widest">Palpites abertos</span>
              </div>
              <div className="flex items-center gap-3">
                <CountUnit value={days} label="dias" />
                <span className="text-2xl font-bold text-primary/50 mb-4">:</span>
                <CountUnit value={hours} label="horas" />
                <span className="text-2xl font-bold text-primary/50 mb-4">:</span>
                <CountUnit value={minutes} label="min" />
                <span className="text-2xl font-bold text-primary/50 mb-4">:</span>
                <CountUnit value={seconds} label="seg" />
              </div>
              <p className="text-xs text-muted-foreground/60 text-center">
                Prazo até sábado, 13/06 às 18h59 — Jogo começa às 19h00
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="wait">
            {/* Sucesso */}
            {submitted && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <div
                  className="rounded-2xl border border-primary/20 p-8 flex flex-col items-center gap-5 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}
                >
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center ring-4 ring-green-400/20">
                    <CheckCircle2 className="w-10 h-10 text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-cocon text-2xl text-primary mb-1">Palpite registrado!</h2>
                    <p className="text-muted-foreground/80 text-sm">
                      Boa sorte, <span className="text-primary font-semibold">{nome.split(" ")[0]}</span>!
                    </p>
                  </div>
                  <div className="flex items-center gap-6 py-4 px-8 rounded-xl bg-primary/10 border border-primary/20">
                    <div className="flex flex-col items-center gap-2">
                      <img src={brasilFlag} alt="Brasil" className="w-10 h-10 object-contain rounded" />
                      <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{scoreBrasil}</span>
                      <span className="text-xs text-muted-foreground/60">Brasil</span>
                    </div>
                    <span className="text-xl font-bold text-primary/40">×</span>
                    <div className="flex flex-col items-center gap-2">
                      <img src={marrocosFlag} alt="Marrocos" className="w-10 h-10 object-contain rounded" />
                      <span className="text-3xl font-bold text-white" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{scoreMarrocos}</span>
                      <span className="text-xs text-muted-foreground/60">Marrocos</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-primary/70">
                    <Trophy className="w-4 h-4 shrink-0" />
                    <p className="text-sm font-medium">
                      Uma recompensa especial aguarda o grande vencedor do palpite.
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground/50">
                    O resultado será divulgado após o jogo.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Prazo encerrado */}
            {expired && !submitted && (
              <motion.div
                key="expired"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <div
                  className="rounded-2xl border border-primary/20 p-8 flex flex-col items-center gap-5 text-center"
                  style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}
                >
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center ring-4 ring-primary/10">
                    <Lock className="w-10 h-10 text-primary/60" />
                  </div>
                  <div>
                    <h2 className="font-cocon text-2xl text-primary mb-2">Palpites encerrados</h2>
                    <p className="text-muted-foreground/80 text-sm leading-relaxed">
                      O prazo para enviar palpites encerrou.
                      <br />
                      O jogo já começou — torça pelo Brasil!
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-primary/70">
                    <Trophy className="w-4 h-4" />
                    <p className="text-sm">O vencedor será anunciado após o apito final.</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Formulário */}
            {!submitted && !expired && (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                {/* Prize teaser */}
                <div className="flex items-center justify-center gap-2 mb-5">
                  <Trophy className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-sm text-primary/80 text-center font-medium tracking-wide">
                    Uma recompensa especial aguarda o grande vencedor do palpite.
                  </p>
                  <Trophy className="w-4 h-4 text-primary shrink-0" />
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="rounded-2xl border border-white/10 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(16px)" }}
                >
                  {/* Match header */}
                  <div className="bg-primary/10 border-b border-white/10 py-3 px-5 flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest text-primary/60">Brasil × Marrocos</span>
                    <span className="text-xs text-muted-foreground/50">13/06/2026 — 19h00</span>
                  </div>

                  <div className="p-6 sm:p-8">
                    {/* Score selector */}
                    <div className="flex items-center justify-center gap-4 sm:gap-8 mb-8">
                      {/* Brasil */}
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={brasilFlag}
                          alt="Brasil"
                          className="w-14 h-14 object-contain rounded-lg shadow-md"
                        />
                        <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Brasil</span>
                        <ScoreSelector
                          value={scoreBrasil}
                          onChange={setScoreBrasil}
                          disabled={isFormDisabled}
                        />
                      </div>

                      {/* Separator */}
                      <span className="text-3xl font-bold text-primary/30 mb-2">×</span>

                      {/* Marrocos */}
                      <div className="flex flex-col items-center gap-3">
                        <img
                          src={marrocosFlag}
                          alt="Marrocos"
                          className="w-14 h-14 object-contain rounded-lg shadow-md"
                        />
                        <span className="text-xs font-semibold uppercase tracking-widest text-white/60">Marrocos</span>
                        <ScoreSelector
                          value={scoreMarrocos}
                          onChange={setScoreMarrocos}
                          disabled={isFormDisabled}
                        />
                      </div>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-white/10 mb-6" />

                    {/* Personal info */}
                    <div className="flex flex-col gap-4">
                      <div className="flex flex-col gap-1.5">
                        <Label
                          htmlFor="nome"
                          className="text-xs uppercase tracking-widest text-white/50"
                        >
                          Nome completo
                        </Label>
                        <Input
                          id="nome"
                          placeholder="Seu nome completo"
                          value={nome}
                          onChange={(e) => setNome(e.target.value)}
                          disabled={isFormDisabled}
                          className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <Label
                          htmlFor="cpf"
                          className="text-xs uppercase tracking-widest text-white/50"
                        >
                          CPF
                        </Label>
                        <Input
                          id="cpf"
                          placeholder="000.000.000-00"
                          value={cpf}
                          onChange={(e) => setCpf(formatCPF(e.target.value))}
                          disabled={isFormDisabled}
                          inputMode="numeric"
                          className="bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-primary/50 focus-visible:border-primary/50"
                        />
                        <p className="text-[11px] text-white/30">Apenas um palpite por CPF.</p>
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.p
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="mt-4 text-sm text-red-400 text-center bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2"
                        >
                          {error}
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <Button
                      type="submit"
                      disabled={isFormDisabled}
                      className="w-full mt-6 h-12 text-sm font-semibold uppercase tracking-widest bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50"
                      style={{ boxShadow: "0 4px 20px -4px hsl(40 45% 68% / 0.5)" }}
                    >
                      {loading ? "Registrando palpite…" : "Enviar palpite"}
                    </Button>
                  </div>
                </form>

                {/* Footer hint */}
                <p className="text-center text-xs text-white/25 mt-4 leading-relaxed">
                  Palpites aceitos até sábado, 13/06 às 18h59
                  <br />
                  Clínica Dra. Renata Lyra — Copa do Mundo 2026
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <div className="w-full flex justify-center pb-6">
          <div className="h-px w-24 bg-white/10" />
        </div>
      </div>
    </div>
  );
}
