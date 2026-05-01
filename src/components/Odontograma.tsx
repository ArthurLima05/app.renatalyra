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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { OdontogramStatus, Dentition } from "@/types";

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

// Dentes decíduos para a vista simplificada
const DEC_UPPER = [55, 54, 53, 52, 51, 61, 62, 63, 64, 65];
const DEC_LOWER = [85, 84, 83, 82, 81, 71, 72, 73, 74, 75];

const emptyForm = () => ({
  executionDate: format(new Date(), "yyyy-MM-dd"),
  dentition: "permanente" as Dentition,
  toothNumbers: [] as string[],
  toothFaces: [] as string[],
  procedureDescription: "",
  status: "executado" as OdontogramStatus,
  professionalId: "",
  nextAppointmentDate: "",
  notes: "",
});

export function Odontograma({ patientId }: { patientId: string }) {
  const { professionals, addOdontogramProcedure, getOdontogramByPatientId } = useClinic();
  const procedures = getOdontogramByPatientId(patientId);

  const [dentitionView, setDentitionView] = useState<Dentition>("permanente");
  const [selectedToothNums, setSelectedToothNums] = useState<string[]>([]);
  // Resetar a seleção da lib trocando o key
  const [chartKey, setChartKey] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);

  // Deciduous selection (simple toggle)
  const [selectedDecTeeth, setSelectedDecTeeth] = useState<Set<number>>(new Set());

  // Constrói teethConditions para colorir os dentes com procedimentos existentes
  const teethConditions = useMemo(() => {
    // Pega o status mais recente de cada dente
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

  const handleOdontogramChange = (selected: ToothDetail[]) => {
    setSelectedToothNums(selected.map((t) => t.notations.fdi));
  };

  const clearSelection = () => {
    setChartKey((k) => k + 1);
    setSelectedToothNums([]);
    setSelectedDecTeeth(new Set());
  };

  const openDialog = () => {
    const nums =
      dentitionView === "permanente"
        ? selectedToothNums
        : Array.from(selectedDecTeeth).map(String);
    setForm({ ...emptyForm(), dentition: dentitionView, toothNumbers: nums });
    setDialogOpen(true);
  };

  const toggleFormFace = (face: string) => {
    setForm((f) => ({
      ...f,
      toothFaces: f.toothFaces.includes(face)
        ? f.toothFaces.filter((x) => x !== face)
        : [...f.toothFaces, face],
    }));
  };

  const toggleFormTooth = (num: string) => {
    setForm((f) => ({
      ...f,
      toothNumbers: f.toothNumbers.includes(num)
        ? f.toothNumbers.filter((x) => x !== num)
        : [...f.toothNumbers, num],
    }));
  };

  const handleSave = async () => {
    if (!form.executionDate || !form.procedureDescription.trim() || !form.professionalId) return;
    setSaving(true);
    try {
      await addOdontogramProcedure({
        patientId,
        toothNumbers: form.toothNumbers,
        toothFaces: form.toothFaces,
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
      {/* Controles */}
      <div className="flex items-center justify-between flex-wrap gap-2">
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
        <div className="flex gap-2">
          {hasSelection && (
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Limpar seleção
            </Button>
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
          <CardContent className="pt-3 pb-3">
            <div className="max-w-[540px] mx-auto space-y-0.5">
              {/* Números superiores */}
              <div
                className="text-center text-[9px] font-mono text-muted-foreground"
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
                styles={{ maxWidth: "100%" }}
              />

              {/* Números inferiores */}
              <div
                className="text-center text-[9px] font-mono text-muted-foreground"
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

      {/* ── Vista Decídua: grade simples ── */}
      {dentitionView === "decidua" && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-4">
            {[
              { label: "Superior", teeth: DEC_UPPER },
              { label: "Inferior", teeth: DEC_LOWER },
            ].map(({ label, teeth }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs text-muted-foreground text-center">{label}</p>
                <div className="flex gap-1 justify-center flex-wrap">
                  {teeth.map((num) => {
                    const sel = selectedDecTeeth.has(num);
                    const procStatus = (() => {
                      for (const proc of [...procedures].sort(
                        (a, b) => b.executionDate.getTime() - a.executionDate.getTime()
                      )) {
                        if (proc.toothNumbers.includes(String(num))) return proc.status;
                      }
                      return null;
                    })();
                    return (
                      <button
                        key={num}
                        onClick={() =>
                          setSelectedDecTeeth((prev) => {
                            const next = new Set(prev);
                            next.has(num) ? next.delete(num) : next.add(num);
                            return next;
                          })
                        }
                        style={
                          procStatus && !sel
                            ? { backgroundColor: STATUS_FILL[procStatus].fill, borderColor: STATUS_FILL[procStatus].outline }
                            : undefined
                        }
                        className={cn(
                          "w-9 h-9 rounded text-xs font-medium border-2 transition-colors",
                          sel
                            ? "bg-primary text-primary-foreground border-primary"
                            : procStatus
                            ? "border-current"
                            : "bg-card border-border hover:bg-muted",
                        )}
                      >
                        {num}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {selectedDecTeeth.size > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                Selecionado(s): {Array.from(selectedDecTeeth).join(", ")}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Dialog de procedimento ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Procedimento</DialogTitle>
            <DialogDescription>Campos com * são obrigatórios.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Data + dentição */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data executado *</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={form.executionDate}
                  onChange={(e) => setForm({ ...form, executionDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Dentição</Label>
                <Select
                  value={form.dentition}
                  onValueChange={(v) => setForm({ ...form, dentition: v as Dentition })}
                >
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanente">Permanente</SelectItem>
                    <SelectItem value="decidua">Decídua</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dentes */}
            <div className="space-y-1">
              <Label className="text-xs">Dentes</Label>
              <div className="flex flex-wrap gap-1 p-2 border rounded-lg min-h-[36px]">
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
              <div className="flex flex-wrap gap-3">
                {PROC_FACES.map((face) => (
                  <label key={face} className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox
                      checked={form.toothFaces.includes(face)}
                      onCheckedChange={() => toggleFormFace(face)}
                    />
                    <span className="text-xs">
                      {face}{" "}
                      <span className="text-muted-foreground">({FACE_LABELS[face]})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Procedimento */}
            <div className="space-y-1">
              <Label className="text-xs">Procedimento realizado *</Label>
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
              <div className="flex gap-2">
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

            {/* Profissional */}
            <div className="space-y-1">
              <Label className="text-xs">Profissional *</Label>
              <Select
                value={form.professionalId}
                onValueChange={(v) => setForm({ ...form, professionalId: v })}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {professionals.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Próxima consulta */}
            <div className="space-y-1">
              <Label className="text-xs">Data da próxima consulta</Label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={form.nextAppointmentDate}
                onChange={(e) => setForm({ ...form, nextAppointmentDate: e.target.value })}
              />
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
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={
                  !form.executionDate ||
                  !form.procedureDescription.trim() ||
                  !form.professionalId ||
                  saving
                }
                onClick={handleSave}
              >
                {saving ? "Salvando..." : "Salvar Procedimento"}
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
                <CardContent className="p-3 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{proc.procedureDescription}</p>
                    <Badge variant={STATUS_BADGE[proc.status]} className="text-xs flex-shrink-0">
                      {STATUS_LABEL[proc.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{format(proc.executionDate, "dd/MM/yyyy", { locale: ptBR })}</span>
                    {pro && <span>{pro.name}</span>}
                    {proc.toothNumbers.length > 0 && (
                      <span>Dentes: {proc.toothNumbers.join(", ")}</span>
                    )}
                    {proc.toothFaces.length > 0 && (
                      <span>Faces: {proc.toothFaces.join(", ")}</span>
                    )}
                    <span className="capitalize">{proc.dentition}</span>
                  </div>
                  {proc.notes && (
                    <p className="text-xs text-muted-foreground italic">{proc.notes}</p>
                  )}
                  {proc.nextAppointmentDate && (
                    <p className="text-xs text-muted-foreground">
                      Próxima consulta:{" "}
                      {format(proc.nextAppointmentDate, "dd/MM/yyyy", { locale: ptBR })}
                    </p>
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
