import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Users, Search, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Input } from "@/components/ui/input";
import brasilFlag from "../../imagens-copa/brasil.png";
import marrocosFlag from "../../imagens-copa/marrocos.png";

interface Palpite {
  id: string;
  nome: string;
  cpf: string;
  placar_brasil: number;
  placar_marrocos: number;
  created_at: string;
}

function maskCPF(cpf: string) {
  if (cpf.length !== 11) return cpf;
  return `${cpf.slice(0, 3)}.***.***-${cpf.slice(9)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMostPopularScore(palpites: Palpite[]) {
  if (!palpites.length) return "—";
  const counts: Record<string, number> = {};
  palpites.forEach((p) => {
    const key = `${p.placar_brasil}x${p.placar_marrocos}`;
    counts[key] = (counts[key] ?? 0) + 1;
  });
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return `${top[0]} (${top[1]}x)`;
}

type SortKey = "nome" | "placar_brasil" | "created_at";
type SortDir = "asc" | "desc";

export default function PalpitesCopa() {
  const { isAdmin, loading: roleLoading } = useUserRole();

  const [palpites, setPalpites] = useState<Palpite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  async function fetchPalpites() {
    setLoading(true);
    const { data } = await supabase
      .from("palpites_copa")
      .select("*")
      .order("created_at", { ascending: false });
    setPalpites((data as Palpite[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    if (isAdmin) fetchPalpites();
  }, [isAdmin]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  }

  const filtered = palpites
    .filter((p) =>
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf.includes(search.replace(/\D/g, ""))
    )
    .sort((a, b) => {
      let va: string | number = a[sortKey];
      let vb: string | number = b[sortKey];
      if (sortKey === "placar_brasil") { va = a.placar_brasil; vb = b.placar_brasil; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const hoje = palpites.filter((p) => {
    const d = new Date(p.created_at);
    const n = new Date();
    return d.getDate() === n.getDate() && d.getMonth() === n.getMonth();
  }).length;

  if (roleLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3 text-center px-4">
      <Trophy className="w-10 h-10 text-muted-foreground/30" />
      <p className="font-semibold text-foreground">Acesso restrito</p>
      <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
    </div>
  );

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ChevronUp className="w-3 h-3 opacity-20" />;
    return sortDir === "asc"
      ? <ChevronUp className="w-3 h-3 text-primary" />
      : <ChevronDown className="w-3 h-3 text-primary" />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Banner header */}
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, hsl(150 55% 10%) 0%, hsl(150 45% 16%) 50%, hsl(40 40% 14%) 100%)",
        }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(40 45% 68%), transparent)" }} />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, hsl(150 60% 40%), transparent)" }} />

        <div className="relative z-10 px-6 py-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
              <Trophy className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-primary/50 mb-0.5">Temporada Copa</p>
              <h1 className="font-cocon text-2xl sm:text-3xl text-primary tracking-wide"
                style={{ textShadow: "0 2px 16px hsl(40 45% 68% / 0.35)" }}>
                Palpites — Brasil × Marrocos
              </h1>
              <p className="text-xs text-white/30 mt-0.5">Copa do Mundo 2026 · 13/06 · 19h00</p>
            </div>
          </div>

          {/* Flags */}
          <div className="flex items-center gap-3 sm:mr-4">
            <img src={brasilFlag} alt="Brasil" className="w-10 h-10 object-contain rounded-lg opacity-90 shadow-lg" />
            <span className="text-lg font-bold text-white/20">×</span>
            <img src={marrocosFlag} alt="Marrocos" className="w-10 h-10 object-contain rounded-lg opacity-90 shadow-lg" />
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            {
              label: "Total de palpites",
              value: palpites.length,
              icon: Users,
              color: "hsl(40 45% 68%)",
            },
            {
              label: "Mais palpitado",
              value: getMostPopularScore(palpites),
              icon: Trophy,
              color: "hsl(150 50% 40%)",
            },
            {
              label: "Palpites hoje",
              value: hoje,
              icon: Trophy,
              color: "hsl(215 60% 60%)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border bg-card p-4 flex items-center gap-4"
              style={{ boxShadow: "var(--card-shadow)" }}
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: `${stat.color}18` }}
              >
                <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</p>
                <p className="text-xl font-bold text-foreground font-cocon">{loading ? "…" : stat.value}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Search + refresh */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou CPF…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <button
            onClick={fetchPalpites}
            className="w-9 h-9 rounded-lg border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Atualizar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border bg-card overflow-hidden"
          style={{ boxShadow: "var(--card-shadow)" }}
        >
          {/* Table header decoration */}
          <div
            className="h-[3px]"
            style={{ background: "linear-gradient(90deg, hsl(150 50% 35%), hsl(40 45% 68%), hsl(150 50% 35%))" }}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <button className="flex items-center gap-1" onClick={() => toggleSort("nome")}>
                      Nome <SortIcon col="nome" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    CPF
                  </th>
                  <th className="text-center px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <button className="flex items-center gap-1 mx-auto" onClick={() => toggleSort("placar_brasil")}>
                      Palpite <SortIcon col="placar_brasil" />
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                    <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort("created_at")}>
                      Enviado em <SortIcon col="created_at" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-12 text-muted-foreground text-sm">
                      {search ? "Nenhum resultado encontrado." : "Nenhum palpite registrado ainda."}
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-medium text-foreground">{p.nome}</td>
                    <td className="px-4 py-3.5 text-muted-foreground font-mono text-xs">
                      {maskCPF(p.cpf)}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-center gap-2">
                        <img src={brasilFlag} alt="BR" className="w-5 h-5 object-contain rounded" />
                        <span
                          className="text-base font-bold text-foreground tabular-nums"
                          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                          {p.placar_brasil}
                        </span>
                        <span className="text-muted-foreground/50 text-xs">×</span>
                        <span
                          className="text-base font-bold text-foreground tabular-nums"
                          style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                        >
                          {p.placar_marrocos}
                        </span>
                        <img src={marrocosFlag} alt="MA" className="w-5 h-5 object-contain rounded" />
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right text-muted-foreground text-xs">
                      {formatDate(p.created_at)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {!loading && filtered.length > 0 && (
            <div className="px-4 py-2.5 border-t bg-muted/20 text-xs text-muted-foreground text-right">
              {filtered.length} {filtered.length === 1 ? "participante" : "participantes"}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
