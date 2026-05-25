import { useState, useRef } from "react";
import { useClinic } from "@/contexts/ClinicContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { ImagePlus, Trash2, ArrowLeftRight, X } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { PhotoCategory } from "@/types";

const CATEGORY_LABEL: Record<PhotoCategory, string> = {
  antes: "Antes",
  durante: "Em Andamento",
  depois: "Depois",
  outro: "Outro",
};
const CATEGORY_BADGE: Record<PhotoCategory, string> = {
  antes: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  durante: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  depois: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  outro: "bg-muted text-muted-foreground",
};

const FILTERS: { label: string; value: PhotoCategory | "todas" }[] = [
  { label: "Todas", value: "todas" },
  { label: "Antes", value: "antes" },
  { label: "Em Andamento", value: "durante" },
  { label: "Depois", value: "depois" },
  { label: "Outro", value: "outro" },
];

export function PatientPhotos({ patientId }: { patientId: string }) {
  const { addPatientPhoto, deletePatientPhoto, getPhotosByPatientId } = useClinic();
  const photos = getPhotosByPatientId(patientId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState<PhotoCategory | "todas">("todas");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareAntes, setCompareAntes] = useState<string | null>(null);
  const [compareDepois, setCompareDepois] = useState<string | null>(null);

  // Upload state
  const [pending, setPending] = useState<{ file: File; preview: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState<PhotoCategory>("outro");
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("Arquivo muito grande. Máximo 10 MB.");
      return;
    }
    setPending({ file, preview: URL.createObjectURL(file) });
    setUploadDialogOpen(true);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (!pending) return;
    setUploading(true);
    try {
      await addPatientPhoto(patientId, pending.file, caption, category);
      setUploadDialogOpen(false);
      URL.revokeObjectURL(pending.preview);
      setPending(null);
      setCaption("");
      setCategory("outro");
    } finally {
      setUploading(false);
    }
  };

  const handleCancelUpload = () => {
    if (pending) URL.revokeObjectURL(pending.preview);
    setPending(null);
    setCaption("");
    setCategory("outro");
    setUploadDialogOpen(false);
  };

  const filtered = filter === "todas" ? photos : photos.filter((p) => p.category === filter);
  const antesPhotos = photos.filter((p) => p.category === "antes");
  const depoisPhotos = photos.filter((p) => p.category === "depois");
  const canCompare = antesPhotos.length > 0 && depoisPhotos.length > 0;

  return (
    <div className="space-y-4 mt-4">
      {/* Barra de controles */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Filtros */}
        <div className="flex items-center justify-center sm:justify-start border rounded-lg p-1 gap-0.5 flex-wrap">
          {FILTERS.map((f) => (
            <Button
              key={f.value}
              variant={filter === f.value ? "secondary" : "ghost"}
              size="sm"
              className="text-sm h-9 px-4"
              onClick={() => setFilter(f.value)}
            >
              {f.label}
              {f.value !== "todas" && (
                <span className="ml-1 text-xs opacity-60">
                  ({photos.filter((p) => p.category === f.value).length})
                </span>
              )}
            </Button>
          ))}
        </div>

        <div className="flex gap-2 justify-center sm:justify-start flex-wrap">
          {canCompare && (
            <Button
              variant={compareMode ? "secondary" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                setCompareMode(!compareMode);
                setCompareAntes(antesPhotos[0]?.url ?? null);
                setCompareDepois(depoisPhotos[0]?.url ?? null);
              }}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Comparar
            </Button>
          )}
          <Button size="sm" className="gap-2" onClick={() => fileInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            Adicionar foto
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>
      </div>

      {/* ── Modo comparação ── */}
      {compareMode && (
        <Card>
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Comparação Antes / Depois</p>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCompareMode(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* Antes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_BADGE.antes)}>Antes</span>
                  <select
                    className="text-xs border rounded px-1 py-0.5 bg-background"
                    value={compareAntes ?? ""}
                    onChange={(e) => setCompareAntes(e.target.value)}
                  >
                    {antesPhotos.map((p) => (
                      <option key={p.id} value={p.url}>
                        {format(p.createdAt, "dd/MM/yy", { locale: ptBR })}
                        {p.caption ? ` — ${p.caption}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {compareAntes && (
                  <img src={compareAntes} alt="Antes" className="w-full rounded-lg object-cover aspect-square" />
                )}
              </div>
              {/* Depois */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", CATEGORY_BADGE.depois)}>Depois</span>
                  <select
                    className="text-xs border rounded px-1 py-0.5 bg-background"
                    value={compareDepois ?? ""}
                    onChange={(e) => setCompareDepois(e.target.value)}
                  >
                    {depoisPhotos.map((p) => (
                      <option key={p.id} value={p.url}>
                        {format(p.createdAt, "dd/MM/yy", { locale: ptBR })}
                        {p.caption ? ` — ${p.caption}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                {compareDepois && (
                  <img src={compareDepois} alt="Depois" className="w-full rounded-lg object-cover aspect-square" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Galeria ── */}
      {filtered.length === 0 ? (
        <div
          className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-3 py-16 cursor-pointer hover:bg-secondary/30 transition-colors"
          onClick={() => fileInputRef.current?.click()}
        >
          <ImagePlus className="h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            {filter === "todas" ? "Nenhuma foto. Clique para adicionar." : `Nenhuma foto na categoria "${CATEGORY_LABEL[filter as PhotoCategory]}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((photo) => (
            <div key={photo.id} className="group relative rounded-xl overflow-hidden bg-muted aspect-square cursor-pointer"
              onClick={() => setLightboxUrl(photo.url)}>
              <img
                src={photo.url}
                alt={photo.caption ?? "Foto do paciente"}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
              {/* Badge categoria */}
              <span className={cn(
                "absolute top-2 left-2 text-xs px-2 py-0.5 rounded-full font-medium",
                CATEGORY_BADGE[photo.category],
              )}>
                {CATEGORY_LABEL[photo.category]}
              </span>
              {/* Botão deletar */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir foto?</AlertDialogTitle>
                      <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() => deletePatientPhoto(photo.id, photo.url)}
                      >
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              {/* Caption */}
              {photo.caption && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-2 py-1">
                  <p className="text-xs text-white truncate">{photo.caption}</p>
                </div>
              )}
            </div>
          ))}
          {/* Card de adicionar */}
          <div
            className="rounded-xl border-2 border-dashed flex items-center justify-center aspect-square cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <ImagePlus className="h-8 w-8 text-muted-foreground" />
          </div>
        </div>
      )}

      {/* ── Dialog de upload ── */}
      <Dialog open={uploadDialogOpen} onOpenChange={(o) => !o && handleCancelUpload()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Adicionar Foto</DialogTitle>
            <DialogDescription>Categorize a foto e adicione uma legenda opcional.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pending && (
              <img
                src={pending.preview}
                alt="Preview"
                className="w-full rounded-lg object-cover max-h-52"
              />
            )}
            {/* Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria</Label>
              <div className="flex gap-2">
                {(["antes", "durante", "depois", "outro"] as PhotoCategory[]).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={cn(
                      "flex-1 text-sm py-1.5 rounded-lg border-2 font-medium transition-colors",
                      category === c
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:bg-muted",
                    )}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            {/* Legenda */}
            <div className="space-y-1.5">
              <Label className="text-xs">Legenda (opcional)</Label>
              <Input
                className="text-sm"
                placeholder="Ex: Antes da extração, 6 meses depois..."
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={handleCancelUpload}>Cancelar</Button>
              <Button size="sm" disabled={uploading} onClick={handleUpload}>
                {uploading ? "Enviando..." : "Salvar foto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:text-white hover:bg-white/20"
            onClick={() => setLightboxUrl(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={lightboxUrl}
            alt="Foto ampliada"
            className="max-w-full max-h-full rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
