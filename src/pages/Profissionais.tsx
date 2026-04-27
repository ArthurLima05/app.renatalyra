import { motion } from "framer-motion";
import { useState, useMemo } from "react";
import { useClinic } from "@/contexts/ClinicContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Mail, Phone, CalendarDays, ChevronDown, ChevronUp, Stethoscope, Pencil } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppointmentStatus, Professional } from "@/types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { dentistStyle } from "@/lib/dentist-colors";

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  realizado: "Realizado",
  cancelado: "Cancelado",
  falta: "Falta",
  sugerido: "Sugerido",
};

const STATUS_VARIANTS: Record<AppointmentStatus, "default" | "secondary" | "destructive" | "outline"> = {
  agendado: "outline",
  confirmado: "default",
  realizado: "secondary",
  cancelado: "destructive",
  falta: "destructive",
  sugerido: "outline",
};

type FormData = { name: string; specialty: string; email: string; phone: string };
const emptyForm = (): FormData => ({ name: "", specialty: "", email: "", phone: "" });

export default function Profissionais() {
  const { professionals, appointments, addProfessional, updateProfessional, updateAppointmentProfessional } = useClinic();

  const [dialogMode, setDialogMode] = useState<"none" | "add" | "edit">("none");
  const [editingPro, setEditingPro] = useState<Professional | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const upcomingByPro = useMemo(() => {
    const map: Record<string, typeof appointments> = {};
    for (const pro of professionals) map[pro.id] = [];
    for (const app of appointments) {
      const appDay = new Date(new Date(app.date).setHours(0, 0, 0, 0));
      if (appDay >= today && app.status !== "cancelado") {
        if (map[app.professionalId]) map[app.professionalId].push(app);
      }
    }
    for (const id in map) {
      map[id].sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return da !== db ? da - db : a.time.localeCompare(b.time);
      });
    }
    return map;
  }, [professionals, appointments]);

  const openAdd = () => {
    setFormData(emptyForm());
    setEditingPro(null);
    setDialogMode("add");
  };

  const openEdit = (pro: Professional) => {
    setFormData({ name: pro.name, specialty: pro.specialty ?? "", email: pro.email ?? "", phone: pro.phone ?? "" });
    setEditingPro(pro);
    setDialogMode("edit");
  };

  const closeDialog = () => {
    setDialogMode("none");
    setEditingPro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dialogMode === "add") {
      await addProfessional(formData);
    } else if (dialogMode === "edit" && editingPro) {
      await updateProfessional(editingPro.id, formData);
    }
    closeDialog();
  };

  const isOpen = dialogMode !== "none";

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Profissionais</h1>
          <p className="text-sm text-muted-foreground">Equipe da clínica</p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="h-4 w-4" />
          Adicionar Profissional
        </Button>
      </motion.div>

      {/* Dialog compartilhado para criar/editar */}
      <Dialog open={isOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{dialogMode === "edit" ? "Editar Profissional" : "Novo Profissional"}</DialogTitle>
            <DialogDescription>
              {dialogMode === "edit"
                ? "Altere os dados do profissional."
                : "Cadastre um novo membro da equipe. Apenas o nome é obrigatório."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label>Especialidade</Label>
              <Input
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="Ex: Odontologia"
              />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@clinica.com"
              />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={closeDialog}>Cancelar</Button>
              <Button type="submit">{dialogMode === "edit" ? "Salvar" : "Cadastrar"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {professionals.map((pro, index) => {
          const proApps = upcomingByPro[pro.id] ?? [];
          const isExpanded = expandedId === pro.id;
          const style = dentistStyle(pro.name);

          return (
            <motion.div
              key={pro.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.08 }}
            >
              <Card className="overflow-hidden">
                <div className="h-1.5 w-full" style={{ backgroundColor: style.backgroundColor }} />

                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full p-2 flex-shrink-0" style={style}>
                        <Stethoscope className="h-4 w-4" />
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">{pro.name}</CardTitle>
                        {pro.specialty && (
                          <p className="text-xs text-muted-foreground">{pro.specialty}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={style}>
                        {proApps.length} próximos
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(pro)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {(pro.email || pro.phone) && (
                    <div className="space-y-1">
                      {pro.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate">{pro.email}</span>
                        </div>
                      )}
                      {pro.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3.5 w-3.5 flex-shrink-0" />
                          <span>{pro.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full gap-2 justify-between text-xs"
                    onClick={() => setExpandedId(isExpanded ? null : pro.id)}
                  >
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {isExpanded ? "Ocultar agendamentos" : "Ver agendamentos"}
                    </span>
                    {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </Button>

                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-2 border-t pt-3"
                    >
                      {proApps.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-3">
                          Sem agendamentos futuros.
                        </p>
                      ) : (
                        proApps.slice(0, 10).map((app) => (
                          <div key={app.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{app.patientName}</p>
                              <p className="text-xs text-muted-foreground">
                                {format(new Date(app.date), "dd/MM", { locale: ptBR })} às {app.time}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <Badge variant={STATUS_VARIANTS[app.status]} className="text-xs px-1.5 py-0">
                                {STATUS_LABELS[app.status]}
                              </Badge>
                              <Select
                                value={app.professionalId}
                                onValueChange={(v) => updateAppointmentProfessional(app.id, v)}
                              >
                                <SelectTrigger className="h-6 w-6 p-0 border-0 bg-transparent opacity-50 hover:opacity-100 [&>svg]:hidden">
                                  <Stethoscope className="h-3.5 w-3.5" />
                                </SelectTrigger>
                                <SelectContent>
                                  {professionals.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                      <span className="flex items-center gap-2">
                                        <span
                                          className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                                          style={{ backgroundColor: dentistStyle(p.name).backgroundColor }}
                                        />
                                        {p.name}
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))
                      )}
                      {proApps.length > 10 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{proApps.length - 10} mais agendamentos
                        </p>
                      )}
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
