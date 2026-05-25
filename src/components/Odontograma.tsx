import { useState, useMemo } from "react";
// @ts-ignore
import { Odontogram as OdontogramChart } from "react-odontogram";
// @ts-ignore
import "react-odontogram/style.css";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Printer, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { OdontogramStatus, Dentition, OdontogramProcedure, Professional, Patient } from "@/types";
import logoUrl from "@/assets/logo-clinica.jpg";
import simboloUrl from "@/assets/SimboloDourado.svg";

interface ToothDetail {
  id: string;
  notations: { fdi: string; universal: string; palmer: string };
  type: string;
}

const PROC_FACES = ["V", "L", "P", "M", "D", "O", "I"] as const;
const FACE_LABELS: Record<string, string> = {
  V: "Vestibular", L: "Lingual", P: "Palatina",
  M: "Mesial", D: "Distal", O: "Oclusal", I: "Incisal",
};

const STATUS_LABEL: Record<OdontogramStatus, string> = {
  a_realizar: "A realizar",
  executado: "Executado",
  existente: "Existente",
};
const STATUS_FILL: Record<OdontogramStatus, { fill: string; outline: string }> = {
  a_realizar: { fill: "#bfdbfe", outline: "#3b82f6" },
  executado:  { fill: "#bbf7d0", outline: "#22c55e" },
  existente:  { fill: "#fde68a", outline: "#f59e0b" },
};
const STATUS_BADGE: Record<OdontogramStatus, "default" | "secondary" | "outline"> = {
  a_realizar: "outline",
  executado: "default",
  existente: "secondary",
};

// Dentes decíduos — usados no seletor do formulário
const DEC_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DEC_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

// Mapeamento FDI permanente (biblioteca) ↔ FDI decíduo
// A biblioteca usa quadrantes 1-4; decídua usa 5-8 (mesmo dígito de posição)
// ex: "11" → 51,  "25" → 65,  "41" → 81
const permToDecFDI = (permFdi: string): number => {
  const n = parseInt(permFdi, 10);
  return (Math.floor(n / 10) + 4) * 10 + (n % 10);
};
const decToPermId = (decFdi: number): string => {
  const q = Math.floor(decFdi / 10) - 4; // 5→1, 6→2, 7→3, 8→4
  const pos = decFdi % 10;
  return `teeth-${q}${pos}`;
};

function parseFacesForTooth(toothFaces: string[], tooth: string): string {
  const perTooth = toothFaces.find((f) => f.startsWith(`${tooth}:`));
  if (perTooth) {
    return perTooth.split(":")[1].split(",").map((f) => FACE_LABELS[f] || f).join(", ");
  }
  const legacy = toothFaces.filter((f) => !f.includes(":"));
  return legacy.length > 0 ? legacy.map((f) => FACE_LABELS[f] || f).join(", ") : "—";
}

function generatePrintHtml(params: {
  patient: Patient | undefined;
  procedures: OdontogramProcedure[];
  professionals: Professional[];
  filterStatus?: OdontogramStatus;
  logoSrc: string;
  simboloSrc: string;
}): string {
  const { patient, procedures, professionals, filterStatus, logoSrc, simboloSrc } = params;

  const filtered = filterStatus
    ? procedures.filter((p) => p.status === filterStatus)
    : [...procedures];
  filtered.sort((a, b) => a.executionDate.getTime() - b.executionDate.getTime());

  type PrintRow = { date: string; tooth: string; dentition: string; faces: string; procedure: string; status: string; statusKey: OdontogramStatus; professional: string; notes: string };
  const rows: PrintRow[] = [];

  for (const proc of filtered) {
    const pro = professionals.find((p) => p.id === proc.professionalId);
    const proName = pro?.name ?? "—";
    const dentStr = proc.dentition === "permanente" ? "Permanente" : "Decídua";
    const dateStr = format(proc.executionDate, "dd/MM/yyyy", { locale: ptBR });

    if (proc.toothNumbers.length === 0) {
      rows.push({ date: dateStr, tooth: "—", dentition: dentStr, faces: "—", procedure: proc.procedureDescription, status: STATUS_LABEL[proc.status], statusKey: proc.status, professional: proName, notes: proc.notes ?? "" });
    } else {
      for (const tooth of proc.toothNumbers) {
        rows.push({ date: dateStr, tooth, dentition: dentStr, faces: parseFacesForTooth(proc.toothFaces, tooth), procedure: proc.procedureDescription, status: STATUS_LABEL[proc.status], statusKey: proc.status, professional: proName, notes: proc.notes ?? "" });
      }
    }
  }

  const STATUS_ROW_BG: Record<OdontogramStatus, string> = {
    a_realizar: "#dbeafe",
    executado: "#dcfce7",
    existente: "#fef9c3",
  };
  const STATUS_ROW_BORDER: Record<OdontogramStatus, string> = {
    a_realizar: "#93c5fd",
    executado: "#86efac",
    existente: "#fde047",
  };

  const title = filterStatus === "a_realizar"
    ? "Plano de Tratamento — Procedimentos a Realizar"
    : "Prontuário Odontológico — Todos os Procedimentos";
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const patientName = patient?.fullName ?? "Paciente";

  const tableRows = rows.map((r) => `
    <tr class="data-row" data-status="${r.statusKey}">
      <td class="col-date">${r.date}</td>
      <td class="col-tooth">${r.tooth}</td>
      <td class="col-dent">${r.dentition}</td>
      <td class="col-faces">${r.faces}</td>
      <td class="col-proc">${r.procedure}</td>
      ${!filterStatus ? `<td class="col-status">${r.status}</td>` : ""}
      <td class="col-prof">${r.professional}</td>
      <td class="col-notes">${r.notes || "—"}</td>
    </tr>`).join("");

  const mobileCards = rows.map((r) => `
    <div class="card" data-status="${r.statusKey}">
      <div class="card-head">
        <div class="card-tooth">${r.tooth}</div>
        <div class="card-meta">
          <span class="card-date">${r.date}</span>
          ${!filterStatus ? `<span class="card-badge" data-status="${r.statusKey}">${r.status}</span>` : ""}
        </div>
      </div>
      <div class="card-proc">${r.procedure}</div>
      <div class="card-rows">
        <div class="card-field"><span class="field-label">Face(s)</span><span class="field-val">${r.faces}</span></div>
        <div class="card-field"><span class="field-label">Profissional</span><span class="field-val">${r.professional}</span></div>
        <div class="card-field"><span class="field-label">Dentição</span><span class="field-val">${r.dentition}</span></div>
        ${r.notes ? `<div class="card-field"><span class="field-label">Obs.</span><span class="field-val card-obs">${r.notes}</span></div>` : ""}
      </div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} – ${patientName}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1a1a1a;background:#fff}

    .page{position:relative;z-index:1;padding:24px 20px;min-height:100vh}

    /* Watermark */
    .watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:min(420px,80vw);height:min(420px,80vw);opacity:.045;pointer-events:none;z-index:0}
    .watermark img{width:100%;height:100%;object-fit:contain}

    /* Header */
    .header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #c8a84b;gap:12px;flex-wrap:wrap}
    .logo{height:52px;object-fit:contain;max-width:160px}
    .header-right{text-align:right}
    .header-label{font-size:8px;font-weight:600;letter-spacing:.1em;color:#9ca3af;text-transform:uppercase;margin-bottom:2px}
    .header-title{font-size:14px;font-weight:700;color:#1a1a1a}
    .gold-line{height:2px;background:linear-gradient(90deg,#c8a84b,#f0d060,#c8a84b);margin:0 0 16px;border-radius:1px}

    /* Meta */
    .meta{display:flex;flex-wrap:wrap;gap:16px 32px;align-items:flex-start;margin-bottom:18px;padding:12px 16px;background:#f9f7f1;border-radius:8px;border:1px solid #e8dfc8}
    .meta-block{min-width:0}
    .meta-label{font-size:8px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#9ca3af;margin-bottom:2px}
    .meta-patient{font-size:15px;font-weight:700;color:#1a1a1a}
    .meta-value{font-size:11px;color:#374151}
    .meta-sub{font-size:10px;color:#9ca3af;margin-top:1px}
    .meta-right{margin-left:auto;text-align:right}

    /* TABLE — shown on desktop and print */
    .tbl-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
    table{width:100%;border-collapse:collapse;font-size:11px}
    thead tr{background:#1a1a1a;color:#fff}
    th{padding:8px 9px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;white-space:nowrap}
    th.center{text-align:center}
    tr[data-status="a_realizar"] td{background:#dbeafe}
    tr[data-status="executado"]  td{background:#dcfce7}
    tr[data-status="existente"]  td{background:#fef9c3}
    .col-date{border-left:3px solid #93c5fd;white-space:nowrap}
    tr[data-status="executado"] .col-date{border-left-color:#86efac}
    tr[data-status="existente"] .col-date{border-left-color:#fde047}
    td{padding:6px 9px;border-bottom:1px solid #e5e7eb;vertical-align:top}
    .col-tooth{text-align:center;font-weight:700;font-size:13px}
    .col-dent{font-size:10px;color:#6b7280}
    .col-notes{font-style:italic;color:#6b7280;font-size:10px}

    /* Legenda */
    .legend{display:flex;flex-wrap:wrap;gap:14px;margin-top:12px;align-items:center}
    .legend-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#9ca3af}
    .legend-item{display:flex;align-items:center;gap:5px;font-size:10px}
    .legend-dot{width:11px;height:11px;border-radius:3px;flex-shrink:0}

    /* CARDS — shown only on mobile screens */
    .cards{display:none;flex-direction:column;gap:12px}
    .card{border-radius:8px;overflow:hidden;border:1px solid #e5e7eb}
    .card[data-status="a_realizar"]{border-left:4px solid #93c5fd;background:#dbeafe}
    .card[data-status="executado"] {border-left:4px solid #86efac;background:#dcfce7}
    .card[data-status="existente"] {border-left:4px solid #fde047;background:#fef9c3}
    .card-head{display:flex;align-items:center;gap:10px;padding:10px 12px 6px}
    .card-tooth{font-size:22px;font-weight:700;color:#1a1a1a;min-width:36px;line-height:1}
    .card-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;flex:1}
    .card-date{font-size:11px;color:#6b7280}
    .card-badge{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;padding:2px 7px;border-radius:99px;background:#1a1a1a;color:#fff}
    .card-proc{padding:0 12px 8px;font-size:13px;font-weight:600;color:#1a1a1a}
    .card-rows{padding:0 12px 10px;display:flex;flex-direction:column;gap:4px}
    .card-field{display:flex;gap:8px;align-items:baseline}
    .field-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#9ca3af;min-width:68px;flex-shrink:0}
    .field-val{font-size:11px;color:#374151}
    .card-obs{font-style:italic;color:#6b7280}

    /* Footer */
    .footer{margin-top:28px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;flex-wrap:wrap;gap:4px;color:#9ca3af;font-size:9px}

    /* Responsive breakpoint */
    @media(max-width:600px){
      .page{padding:16px 14px}
      .logo{height:40px}
      .tbl-wrap{display:none}
      .cards{display:flex}
      .meta-right{margin-left:0}
    }

    /* Print */
    @media print{
      @page{margin:12mm 10mm}
      body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .tbl-wrap{display:block!important;overflow:visible}
      .cards{display:none!important}
      .page{padding:0}
    }
  </style>
</head>
<body>
  <div class="watermark"><img src="${simboloSrc}" alt=""/></div>

  <div class="page">
    <div class="header">
      <img class="logo" src="${logoSrc}" alt="Logo" onerror="this.style.display='none'"/>
      <div class="header-right">
        <div class="header-label">Odontograma</div>
        <div class="header-title">${filterStatus === "a_realizar" ? "Plano de Tratamento" : "Todos os Procedimentos"}</div>
      </div>
    </div>
    <div class="gold-line"></div>

    <div class="meta">
      <div class="meta-block">
        <div class="meta-label">Paciente</div>
        <div class="meta-patient">${patientName}</div>
      </div>
      <div class="meta-block">
        <div class="meta-label">Tipo de relatório</div>
        <div class="meta-value">${filterStatus === "a_realizar" ? "Plano de tratamento" : "Histórico completo"}</div>
      </div>
      <div class="meta-block meta-right">
        <div class="meta-label">Emitido em</div>
        <div class="meta-value">${now}</div>
        <div class="meta-sub">${rows.length} procedimento(s)</div>
      </div>
    </div>

    ${rows.length === 0
      ? `<div style="text-align:center;padding:60px;color:#9ca3af;font-size:14px;">Nenhum procedimento encontrado.</div>`
      : `
    <!-- Tabela (desktop / impressão) -->
    <div class="tbl-wrap">
      <table>
        <thead>
          <tr>
            <th>Data</th>
            <th class="center">Dente</th>
            <th>Dentição</th>
            <th>Face(s)</th>
            <th>Procedimento</th>
            ${!filterStatus ? `<th>Status</th>` : ""}
            <th>Profissional</th>
            <th>Obs.</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      ${!filterStatus ? `
      <div class="legend">
        <span class="legend-label">Legenda:</span>
        <div class="legend-item"><div class="legend-dot" style="background:#dbeafe;border:1px solid #93c5fd"></div>A realizar</div>
        <div class="legend-item"><div class="legend-dot" style="background:#dcfce7;border:1px solid #86efac"></div>Executado</div>
        <div class="legend-item"><div class="legend-dot" style="background:#fef9c3;border:1px solid #fde047"></div>Existente</div>
      </div>` : ""}
    </div>

    <!-- Cards (mobile) -->
    <div class="cards">${mobileCards}</div>
    `}

    <div class="footer">
      <span>Documento gerado automaticamente pelo sistema TechClin</span>
      <span>${now}</span>
    </div>
  </div>
  <script>window.onload=()=>{window.print();}</script>
</body>
</html>`;
}

const emptyForm = () => ({
  executionDate: format(new Date(), "yyyy-MM-dd"),
  dentition: "permanente" as Dentition,
  toothNumbers: [] as string[],
  toothFaces: {} as Record<string, string[]>,
  activeFaceTooth: "",
  procedureDescription: "",
  status: "executado" as OdontogramStatus,
  professionalId: "",
  nextAppointmentDate: "",
  notes: "",
});

export function Odontograma({ patientId }: { patientId: string }) {
  const { professionals, addOdontogramProcedure, getOdontogramByPatientId, getPatientById } = useClinic();
  const patient = getPatientById(patientId);
  const procedures = getOdontogramByPatientId(patientId);

  const [dentitionView, setDentitionView] = useState<Dentition>("permanente");
  const [selectedToothNums, setSelectedToothNums] = useState<string[]>([]);
  const [chartKey, setChartKey] = useState(0);
  const [decChartKey, setDecChartKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [selectedDecTeeth, setSelectedDecTeeth] = useState<Set<number>>(new Set());

  // Condições para o gráfico permanente
  const teethConditions = useMemo(() => {
    const toothStatus = new Map<string, OdontogramStatus>();
    const sorted = [...procedures].sort(
      (a, b) => b.executionDate.getTime() - a.executionDate.getTime()
    );
    for (const proc of sorted) {
      for (const tn of proc.toothNumbers) {
        if (!toothStatus.has(tn)) toothStatus.set(tn, proc.status);
      }
    }

    const groups: Record<OdontogramStatus, string[]> = {
      a_realizar: [], executado: [], existente: [],
    };
    toothStatus.forEach((status, tn) => groups[status].push(`teeth-${tn}`));

    return (["a_realizar", "executado", "existente"] as OdontogramStatus[])
      .filter((s) => groups[s].length > 0)
      .map((s) => ({
        label: STATUS_LABEL[s],
        teeth: groups[s],
        fillColor: STATUS_FILL[s].fill,
        outlineColor: STATUS_FILL[s].outline,
      }));
  }, [procedures]);

  // Condições para o gráfico decíduo (remapeia FDI decíduo → ID interno da lib)
  const decTeethConditions = useMemo(() => {
    const toothStatus = new Map<string, OdontogramStatus>();
    const sorted = [...procedures].sort(
      (a, b) => b.executionDate.getTime() - a.executionDate.getTime()
    );
    for (const proc of sorted) {
      for (const tn of proc.toothNumbers) {
        const n = parseInt(tn, 10);
        const q = Math.floor(n / 10);
        if (q < 5 || q > 8) continue; // só decíduos
        const permId = decToPermId(n);
        if (!toothStatus.has(permId)) toothStatus.set(permId, proc.status);
      }
    }
    const groups: Record<OdontogramStatus, string[]> = {
      a_realizar: [], executado: [], existente: [],
    };
    toothStatus.forEach((status, id) => groups[status].push(id));
    return (["a_realizar", "executado", "existente"] as OdontogramStatus[])
      .filter((s) => groups[s].length > 0)
      .map((s) => ({
        label: STATUS_LABEL[s],
        teeth: groups[s],
        fillColor: STATUS_FILL[s].fill,
        outlineColor: STATUS_FILL[s].outline,
      }));
  }, [procedures]);

  const handleOdontogramChange = (selected: ToothDetail[]) => {
    setSelectedToothNums(selected.map((t) => t.notations.fdi));
  };

  const handleDecOdontogramChange = (selected: ToothDetail[]) => {
    setSelectedDecTeeth(new Set(selected.map((t) => permToDecFDI(t.notations.fdi))));
  };

  const clearSelection = () => {
    setChartKey((k) => k + 1);
    setDecChartKey((k) => k + 1);
    setSelectedToothNums([]);
    setSelectedDecTeeth(new Set());
  };

  const handlePrint = (filterStatus?: OdontogramStatus) => {
    const html = generatePrintHtml({ patient, procedures, professionals, filterStatus, logoSrc: `${window.location.origin}${logoUrl}`, simboloSrc: `${window.location.origin}${simboloUrl}` });
    const win = window.open("", "_blank", "width=960,height=720");
    if (win) { win.document.write(html); win.document.close(); }
  };

  const openDialog = () => {
    const nums =
      dentitionView === "permanente"
        ? selectedToothNums
        : Array.from(selectedDecTeeth).map(String);
    setForm({ ...emptyForm(), dentition: dentitionView, toothNumbers: nums, activeFaceTooth: nums[0] ?? "" });
    setDialogOpen(true);
  };

  const toggleFormFace = (face: string) => {
    const tooth = form.activeFaceTooth;
    if (!tooth) return;
    setForm((f) => {
      const current = f.toothFaces[tooth] ?? [];
      return {
        ...f,
        toothFaces: {
          ...f.toothFaces,
          [tooth]: current.includes(face)
            ? current.filter((x) => x !== face)
            : [...current, face],
        },
      };
    });
  };

  const toggleFormTooth = (num: string) => {
    setForm((f) => {
      const wasSelected = f.toothNumbers.includes(num);
      const newNums = wasSelected
        ? f.toothNumbers.filter((x) => x !== num)
        : [...f.toothNumbers, num];
      const newFaces = { ...f.toothFaces };
      if (wasSelected) delete newFaces[num];
      const newActive = !wasSelected
        ? num
        : f.activeFaceTooth === num
          ? newNums[0] ?? ""
          : f.activeFaceTooth;
      return { ...f, toothNumbers: newNums, toothFaces: newFaces, activeFaceTooth: newActive };
    });
  };

  const handleSave = async () => {
    if (!form.executionDate || !form.procedureDescription.trim() || !form.professionalId) return;
    setSaving(true);
    // Serializa faces por dente: { "11": ["V","M"], "21": ["L"] } → ["11:V,M", "21:L"]
    const serializedFaces = Object.entries(form.toothFaces)
      .filter(([, faces]) => faces.length > 0)
      .map(([tooth, faces]) => `${tooth}:${faces.join(",")}`);
    try {
      await addOdontogramProcedure({
        patientId,
        toothNumbers: form.toothNumbers,
        toothFaces: serializedFaces,
        dentition: form.dentition,
        procedureDescription: form.procedureDescription,
        status: form.status,
        professionalId: form.professionalId,
        executionDate: new Date(form.executionDate),
        nextAppointmentDate: form.nextAppointmentDate
          ? new Date(form.nextAppointmentDate)
          : undefined,
        notes: form.notes || undefined,
      });
      setDialogOpen(false);
      clearSelection();
    } finally {
      setSaving(false);
    }
  };

  const hasSelection =
    dentitionView === "permanente"
      ? selectedToothNums.length > 0
      : selectedDecTeeth.size > 0;

  // Todos os dentes visíveis para o seletor no form
  const allTeethInView =
    form.dentition === "permanente"
      ? Array.from({ length: 32 }, (_, i) => {
          // FDI order: 18..11, 21..28, 48..41, 31..38
          const perm = [
            18,17,16,15,14,13,12,11, 21,22,23,24,25,26,27,28,
            48,47,46,45,44,43,42,41, 31,32,33,34,35,36,37,38,
          ];
          return String(perm[i]);
        })
      : [...DEC_UPPER, ...DEC_LOWER].map(String);

  return (
    <div className="space-y-4 mt-4">
      {/* Inverte verticalmente os molares cujas coroas apontavam para fora */}
      <style>{`
        .teeth-18, .teeth-17, .teeth-16,
        .teeth-26, .teeth-27, .teeth-28,
        .teeth-48, .teeth-47, .teeth-46,
        .teeth-36, .teeth-37, .teeth-38 {
          transform-box: fill-box;
          transform-origin: center;
          transform: scale(1, -1);
        }
      `}</style>
      {/* Controles — coluna/centro no mobile, linha/espaçada no sm+ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between items-center gap-3">
        <div className="flex items-center border rounded-lg p-1 gap-1">
          {(["permanente", "decidua"] as Dentition[]).map((d) => (
            <Button
              key={d}
              variant={dentitionView === d ? "secondary" : "ghost"}
              size="sm"
              onClick={() => { setDentitionView(d); clearSelection(); }}
            >
              {d === "permanente" ? "Permanente" : "Decídua"}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap justify-center sm:justify-end">
          {hasSelection && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Limpar seleção
            </Button>
          )}
          {procedures.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Printer className="h-4 w-4" />
                  Imprimir
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handlePrint()}>
                  Todos os procedimentos
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handlePrint("a_realizar")}>
                  Apenas plano de tratamento
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button size="sm" className="gap-2" onClick={openDialog}>
            <Plus className="h-4 w-4" />
            Adicionar procedimento
          </Button>
        </div>
      </div>

      {/* ── Vista Permanente: usa a biblioteca ── */}
      {dentitionView === "permanente" && (
        <Card>
          <CardContent className="pt-3 pb-3 overflow-x-auto">
            <div className="min-w-[580px] sm:min-w-0 sm:max-w-[500px] mx-auto space-y-0.5">
              {/* Números superiores */}
              <div
                className="text-center text-[10px] font-mono text-muted-foreground"
                style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)" }}
              >
                {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>

              {/* SVG do odontograma */}
              <OdontogramChart
                key={chartKey}
                onChange={handleOdontogramChange}
                teethConditions={teethConditions}
                showLabels={teethConditions.length > 0}
                notation="FDI"
                layout="square"
                styles={{ width: "100%" }}
              />

              {/* Números inferiores */}
              <div
                className="text-center text-[10px] font-mono text-muted-foreground"
                style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)" }}
              >
                {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </div>
            </div>

            {selectedToothNums.length > 0 && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Selecionado(s): {selectedToothNums.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Vista Decídua: react-odontogram com maxTeeth=5 ── */}
      {dentitionView === "decidua" && (
        <Card>
          <CardContent className="pt-3 pb-3 overflow-x-auto">
            <div className="min-w-[580px] sm:min-w-0 sm:max-w-[500px] mx-auto space-y-0.5">
              {/*
                A biblioteca usa 8 posições fixas por quadrante no SVG.
                Com maxTeeth=5, os 3 dentes mais posteriores (16,17,18) ficam
                vazios — por isso usamos 16 colunas com espaços em branco nessas
                posições, igual ao gráfico permanente.
                Layout: [vazio×3, 55,54,53,52,51, 61,62,63,64,65, vazio×3]
              */}
              <div
                className="text-center text-[10px] font-mono text-muted-foreground"
                style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)" }}
              >
                {["", "", "", 55, 54, 53, 52, 51, 61, 62, 63, 64, 65, "", "", ""].map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </div>

              <OdontogramChart
                key={decChartKey}
                onChange={handleDecOdontogramChange}
                teethConditions={decTeethConditions}
                showLabels={false}
                notation="FDI"
                layout="square"
                maxTeeth={5}
                styles={{ width: "100%" }}
              />

              {/* Layout inferior: [vazio×3, 85,84,83,82,81, 71,72,73,74,75, vazio×3] */}
              <div
                className="text-center text-[10px] font-mono text-muted-foreground"
                style={{ display: "grid", gridTemplateColumns: "repeat(16, 1fr)" }}
              >
                {["", "", "", 85, 84, 83, 82, 81, 71, 72, 73, 74, 75, "", "", ""].map((n, i) => (
                  <span key={i}>{n}</span>
                ))}
              </div>
            </div>

            {selectedDecTeeth.size > 0 && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Selecionado(s): {Array.from(selectedDecTeeth).sort((a, b) => a - b).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog de procedimento ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-[520px] rounded-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>Adicionar Procedimento</DialogTitle>
            <DialogDescription>Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-1">
            {/* Data + dentição + profissional em grid compacto */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Data *</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.executionDate}
                  onChange={(e) => setForm({ ...form, executionDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dentição</Label>
                <Select value={form.dentition} onValueChange={(v) => setForm({ ...form, dentition: v as Dentition })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanente">Permanente</SelectItem>
                    <SelectItem value="decidua">Decídua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Procedimento */}
            <div className="space-y-1">
              <Label className="text-xs">Procedimento *</Label>
              <Input
                className="text-sm"
                placeholder="Ex: Extração, Restauração, Canal..."
                value={form.procedureDescription}
                onChange={(e) => setForm({ ...form, procedureDescription: e.target.value })}
              />
            </div>

            {/* Situação */}
            <div className="space-y-1">
              <Label className="text-xs">Situação</Label>
              <div className="flex flex-wrap gap-1.5">
                {(["a_realizar", "executado", "existente"] as OdontogramStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className={cn(
                      "text-xs px-3 py-1 rounded-full border transition-colors",
                      form.status === s
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Profissional + próxima consulta */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Profissional *</Label>
                <Select value={form.professionalId} onValueChange={(v) => setForm({ ...form, professionalId: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Próxima consulta</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.nextAppointmentDate}
                  onChange={(e) => setForm({ ...form, nextAppointmentDate: e.target.value })}
                />
              </div>
            </div>

            {/* Dentes */}
            <div className="space-y-1">
              <Label className="text-xs">Dentes</Label>
              <div className="flex flex-wrap gap-1 p-2 border rounded-lg min-h-[36px] overflow-hidden">
                {allTeethInView.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => toggleFormTooth(num)}
                    className={cn(
                      "text-xs px-1.5 py-0.5 rounded border transition-colors",
                      form.toothNumbers.includes(num)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Faces */}
            <div className="space-y-1">
              <Label className="text-xs">Faces</Label>
              {/* Quando há mais de um dente, mostra abas por dente */}
              {form.toothNumbers.length > 1 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {form.toothNumbers.map((num) => {
                    const faces = form.toothFaces[num] ?? [];
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, activeFaceTooth: num }))}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded border transition-colors",
                          form.activeFaceTooth === num
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:bg-muted",
                        )}
                      >
                        {num}
                        {faces.length > 0 && (
                          <span className={cn("ml-1 text-[10px]", form.activeFaceTooth === num ? "opacity-80" : "opacity-60")}>
                            {faces.join("")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
              {form.activeFaceTooth ? (
                <>
                  {form.toothNumbers.length > 1 && (
                    <p className="text-xs text-muted-foreground mb-1">
                      Faces do dente {form.activeFaceTooth}:
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {PROC_FACES.map((face) => (
                      <label key={face} className="flex items-center gap-1.5 cursor-pointer">
                        <Checkbox
                          checked={(form.toothFaces[form.activeFaceTooth] ?? []).includes(face)}
                          onCheckedChange={() => toggleFormFace(face)}
                        />
                        <span className="text-xs">{face} <span className="text-muted-foreground">({FACE_LABELS[face]})</span></span>
                      </label>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Selecione um dente para configurar as faces.</p>
              )}
            </div>

            {/* Obs */}
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea
                className="text-sm resize-none"
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                size="sm"
                disabled={!form.executionDate || !form.procedureDescription.trim() || !form.professionalId || saving}
                onClick={handleSave}
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Histórico ── */}
      {procedures.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Procedimentos registrados</p>
          {procedures.map((proc) => {
            const pro = professionals.find((p) => p.id === proc.professionalId);
            return (
              <Card key={proc.id} className="overflow-hidden">
                <div
                  className="h-1"
                  style={{ backgroundColor: STATUS_FILL[proc.status].fill }}
                />
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="text-sm font-medium leading-snug">{proc.procedureDescription}</p>
                    <Badge variant={STATUS_BADGE[proc.status]} className="text-xs flex-shrink-0">
                      {STATUS_LABEL[proc.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{format(proc.executionDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    {pro && <span>· {pro.name}</span>}
                    {proc.toothNumbers.length > 0 && (
                      <span>· {proc.toothNumbers.join(", ")}</span>
                    )}
                  </div>
                  {proc.notes && (
                    <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{proc.notes}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
