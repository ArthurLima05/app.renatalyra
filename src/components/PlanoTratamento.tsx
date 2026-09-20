import { useState } from "react";
import { useProntuario } from "@/contexts/ProntuarioContext";
import { useClinic } from "@/contexts/ClinicContext";
import { usePermissionsCtx } from "@/contexts/PermissionsContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, Pencil, Printer, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TreatmentPlan, TreatmentPlanItem, TreatmentPlanStatus } from "@/types";
import { generatePlanoTratamentoHtml } from "@/utils/printPlanoTratamento";
import logoUrl from "@/assets/LightLogo.svg";

const fmtBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const STATUS_LABEL: Record<TreatmentPlanStatus, string> = {
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

const STATUS_VARIANT: Record<TreatmentPlanStatus, "default" | "secondary" | "destructive"> = {
  em_andamento: "default",
  concluido: "secondary",
  cancelado: "destructive",
};

type ItemDraft = Omit<TreatmentPlanItem, "id" | "planId" | "createdAt">;

const emptyItem = (sequence: number): ItemDraft => ({
  description: "",
  teeth: "",
  quantity: 1,
  unitValue: 0,
  sequence,
});

export function PlanoTratamento({ patientId, patientName }: { patientId: string; patientName: string }) {
  const {
    getTreatmentPlansByPatientId,
    addTreatmentPlan,
    updateTreatmentPlan,
    deleteTreatmentPlan,
  } = useProntuario();
  const { professionals, getPatientById } = useClinic();
  const { canCreate, canEdit, canDelete } = usePermissionsCtx();

  const plans = getTreatmentPlansByPatientId(patientId);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<TreatmentPlan | null>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<TreatmentPlanStatus>("em_andamento");
  const [professionalId, setProfessionalId] = useState<string>("");
  const [advanceValue, setAdvanceValue] = useState("0");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([emptyItem(0)]);
  const [saving, setSaving] = useState(false);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openCreateDialog = () => {
    setEditingPlan(null);
    setTitle("");
    setStatus("em_andamento");
    setProfessionalId("");
    setAdvanceValue("0");
    setNotes("");
    setItems([emptyItem(0)]);
    setDialogOpen(true);
  };

  const openEditDialog = (plan: TreatmentPlan) => {
    setEditingPlan(plan);
    setTitle(plan.title);
    setStatus(plan.status);
    setProfessionalId(plan.professionalId ?? "");
    setAdvanceValue(String(plan.advanceValue));
    setNotes(plan.notes ?? "");
    setItems(
      [...plan.items]
        .sort((a, b) => a.sequence - b.sequence)
        .map((it) => ({
          description: it.description,
          teeth: it.teeth ?? "",
          quantity: it.quantity,
          unitValue: it.unitValue,
          sequence: it.sequence,
        }))
    );
    setDialogOpen(true);
  };

  const addItemRow = () => setItems((prev) => [...prev, emptyItem(prev.length)]);
  const removeItemRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const countTeeth = (teeth: string) =>
    teeth.split(/[,/e]/i).map((t) => t.trim()).filter((t) => /^\d+$/.test(t)).length;

  const updateItemRow = (index: number, patch: Partial<ItemDraft>) =>
    setItems((prev) => prev.map((it, i) => {
      if (i !== index) return it;
      const next = { ...it, ...patch };
      // Se o campo Dente(s) mudou, ajusta a quantidade automaticamente pelo nº de dentes informados
      // (continua editável manualmente depois — útil para itens como "Contenção 3x3", que tem 1 preço só apesar de afetar vários dentes)
      if (patch.teeth !== undefined) {
        const teethCount = countTeeth(patch.teeth ?? "");
        if (teethCount > 0) next.quantity = teethCount;
      }
      return next;
    }));

  const total = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitValue) || 0), 0);

  const handleSave = async () => {
    if (!title.trim()) return;
    const validItems = items
      .filter((it) => it.description.trim())
      .map((it, i) => ({ ...it, sequence: i, quantity: Number(it.quantity) || 0, unitValue: Number(it.unitValue) || 0 }));

    setSaving(true);
    try {
      if (editingPlan) {
        await updateTreatmentPlan(editingPlan.id, {
          title: title.trim(),
          status,
          advanceValue: Number(advanceValue) || 0,
          notes: notes.trim() || undefined,
          professionalId: professionalId || undefined,
        }, validItems);
      } else {
        await addTreatmentPlan({
          patientId,
          title: title.trim(),
          status,
          advanceValue: Number(advanceValue) || 0,
          notes: notes.trim() || undefined,
          professionalId: professionalId || undefined,
        }, validItems);
      }
      setDialogOpen(false);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = (plan: TreatmentPlan) => {
    const patient = getPatientById(patientId);
    if (!patient) return;
    const professionalName = professionals.find((p) => p.id === plan.professionalId)?.name;
    const html = generatePlanoTratamentoHtml({
      patient,
      plan,
      professionalName,
      logoSrc: `${window.location.origin}${logoUrl}`,
    });
    const win = window.open("", "_blank", "width=960,height=720");
    if (win) { win.document.write(html); win.document.close(); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-semibold">Planos de Tratamento</h3>
        <Button size="sm" className="gap-2" onClick={openCreateDialog} disabled={!canCreate("pacientes")}>
          <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </div>

      {plans.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <ClipboardList className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum plano de tratamento cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {plans.map((plan) => {
            const planTotal = plan.items.reduce((sum, it) => sum + it.quantity * it.unitValue, 0);
            const saldo = planTotal - plan.advanceValue;
            const isOpen = expanded.has(plan.id);
            const professionalName = professionals.find((p) => p.id === plan.professionalId)?.name;

            return (
              <Card key={plan.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <button
                      className="flex items-start gap-2 text-left flex-1 min-w-0"
                      onClick={() => toggleExpanded(plan.id)}
                    >
                      {isOpen ? <ChevronUp className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium truncate">{plan.title}</p>
                          <Badge variant={STATUS_VARIANT[plan.status]}>{STATUS_LABEL[plan.status]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {format(plan.createdAt, "dd/MM/yyyy", { locale: ptBR })}
                          {professionalName ? ` · ${professionalName}` : ""}
                          {` · ${plan.items.length} item(ns)`}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handlePrint(plan)}>
                        <Printer className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8"
                        onClick={() => openEditDialog(plan)}
                        disabled={!canEdit("pacientes")}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" disabled={!canDelete("pacientes")}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir plano de tratamento</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir <strong>{plan.title}</strong>? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTreatmentPlan(plan.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-border overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border text-xs text-muted-foreground">
                              <th className="text-left font-medium p-2">Descrição</th>
                              <th className="text-center font-medium p-2">Qtd.</th>
                              <th className="text-right font-medium p-2">Valor Unit.</th>
                              <th className="text-right font-medium p-2">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...plan.items].sort((a, b) => a.sequence - b.sequence).map((it) => (
                              <tr key={it.id} className="border-b border-border last:border-0">
                                <td className="p-2">
                                  {it.description}
                                  {it.teeth && <span className="text-muted-foreground text-xs"> (dente {it.teeth})</span>}
                                </td>
                                <td className="p-2 text-center">{it.quantity}</td>
                                <td className="p-2 text-right">{fmtBRL(it.unitValue)}</td>
                                <td className="p-2 text-right">{fmtBRL(it.quantity * it.unitValue)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-sm">
                        <div className="flex gap-4"><span className="text-muted-foreground">Total</span><span className="font-semibold">{fmtBRL(planTotal)}</span></div>
                        <div className="flex gap-4"><span className="text-muted-foreground">Entrada / À vista</span><span>{fmtBRL(plan.advanceValue)}</span></div>
                        <div className="flex gap-4"><span className="text-muted-foreground">Saldo</span><span className="font-semibold">{fmtBRL(saldo)}</span></div>
                      </div>

                      {plan.notes && (
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap border-t border-border pt-2">{plan.notes}</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Editar Plano de Tratamento" : "Novo Plano de Tratamento"}</DialogTitle>
            <DialogDescription>Paciente: {patientName}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Título do Plano</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Reabilitação com porcelana" />
              </div>
              <div className="space-y-1.5">
                <Label>Profissional</Label>
                <Select value={professionalId} onValueChange={setProfessionalId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as TreatmentPlanStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="em_andamento">Em andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Itens do Plano</Label>
                <Button variant="outline" size="sm" className="gap-1" onClick={addItemRow}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar item
                </Button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="rounded-lg border border-border p-3 relative">
                    <Button
                      variant="ghost" size="icon"
                      className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItemRow(index)}
                      disabled={items.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <div className="flex flex-wrap gap-3 pr-8">
                      <div className="flex-1 min-w-[180px] space-y-1">
                        <Label className="text-xs text-muted-foreground">Descrição do procedimento</Label>
                        <Input
                          placeholder="Ex: Coroa provisória"
                          value={item.description}
                          onChange={(e) => updateItemRow(index, { description: e.target.value })}
                        />
                      </div>
                      <div className="w-24 space-y-1">
                        <Label className="text-xs text-muted-foreground">Dente(s)</Label>
                        <Input
                          placeholder="Ex: 11, 21"
                          value={item.teeth}
                          onChange={(e) => updateItemRow(index, { teeth: e.target.value })}
                        />
                      </div>
                      <div className="w-20 space-y-1">
                        <Label className="text-xs text-muted-foreground">Qtd.</Label>
                        <Input
                          type="number"
                          min={0}
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItemRow(index, { quantity: Number(e.target.value) })}
                        />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-xs text-muted-foreground">Valor unitário (R$)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          placeholder="0,00"
                          value={item.unitValue}
                          onChange={(e) => updateItemRow(index, { unitValue: Number(e.target.value) })}
                        />
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-right">
                      Subtotal: {fmtBRL((Number(item.quantity) || 0) * (Number(item.unitValue) || 0))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Entrada / À vista</Label>
                <Input type="number" min={0} step="0.01" value={advanceValue} onChange={(e) => setAdvanceValue(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Total do Plano</Label>
                <Input value={fmtBRL(total)} disabled className="font-semibold" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Ex: reabilitação prevista para após 6 meses" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()}>
              {editingPlan ? "Salvar Alterações" : "Criar Plano"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
