import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, CheckCircle2, XCircle, AlertCircle, FileSpreadsheet, Trash2, Loader2, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';

// ─── Mapeamento dentistas legado → UUID atual ──────────────────────────────
const DENTIST_MAP: Record<string, string> = {
  '5358216251179008': '805d944f-e8f3-4861-8bcc-5f5eff73f5a8', // Renata Lyra
  '4797052198846464': '48365890-a8d8-4c64-9374-1cb37035a909', // Juliano Borelli
  '4937581838532608': 'a0a8bdf3-124c-44d9-89eb-724b641ef1d9', // Dione Melo
};

const DENTIST_NAMES: Record<string, string> = {
  '5358216251179008': 'Renata Lyra',
  '4797052198846464': 'Juliano Borelli',
  '4937581838532608': 'Dione Melo',
};

// ─── Tipos ──────────────────────────────────────────────────────────────────
type AppStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta' | 'sugerido';
type RowStatus = 'ok' | 'no_patient' | 'no_dentist' | 'no_date' | 'deleted';

interface ParsedRow {
  legacyId: string;
  legacyPatientId: string;
  patientName: string;
  legacyDentistId: string;
  dentistName: string;
  date: string | null;
  time: string;
  status: AppStatus;
  notes: string;
  createdAt: string | null;
  patientUuid?: string;
  professionalUuid?: string;
  rowStatus: RowStatus;
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function mapStatus(status: string, canceled: string): AppStatus {
  if (/^x$/i.test(canceled?.trim() ?? '')) return 'cancelado';
  switch ((status ?? '').toUpperCase().trim()) {
    case 'MISSED':    return 'falta';
    case 'CHECKOUT':  return 'realizado';
    case 'CONFIRMED': return 'confirmado';
    default:          return 'agendado';
  }
}

function parseDate(val: unknown): string | null {
  if (!val) return null;
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (!d) return null;
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
  }
  const s = String(val).trim();
  if (s.includes('T')) return s.split('T')[0];
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    return `${y}-${m}-${d}`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

function buildIsoDateTime(date: string, time: string): string {
  const t = time?.trim() || '00:00';
  return `${date}T${t.length === 5 ? t : t.substring(0, 5)}:00`;
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────
const STATUS_LABELS: Record<AppStatus, string> = {
  agendado: 'Agendado', confirmado: 'Confirmado', realizado: 'Realizado',
  cancelado: 'Cancelado', falta: 'Falta', sugerido: 'Sugerido',
};

const STATUS_COLORS: Record<AppStatus, string> = {
  agendado:   'bg-amber-50 text-amber-800 border-amber-200',
  confirmado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  realizado:  'bg-purple-50 text-purple-800 border-purple-200',
  cancelado:  'bg-red-50 text-red-800 border-red-200',
  falta:      'bg-orange-50 text-orange-800 border-orange-200',
  sugerido:   'bg-gray-50 text-gray-700 border-gray-200',
};

function StatCard({ label, value, variant = 'gray' }: { label: string; value: number; variant?: 'gray' | 'green' | 'orange' | 'red' }) {
  const colors = {
    gray:   'bg-muted border-border text-foreground',
    green:  'bg-emerald-50 border-emerald-200 text-emerald-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    red:    'bg-red-50 border-red-200 text-red-900',
  };
  return (
    <div className={cn('rounded-xl border p-4', colors[variant])}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs mt-1 leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

function RowStatusBadge({ status }: { status: RowStatus }) {
  const map: Record<RowStatus, { icon: React.ReactNode; label: string; className: string }> = {
    ok:           { icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: 'OK',                       className: 'text-emerald-700' },
    deleted:      { icon: <Trash2       className="h-3.5 w-3.5" />, label: 'Excluído (skip)',           className: 'text-muted-foreground' },
    no_patient:   { icon: <AlertCircle  className="h-3.5 w-3.5" />, label: 'Paciente não encontrado',  className: 'text-orange-700' },
    no_dentist:   { icon: <XCircle      className="h-3.5 w-3.5" />, label: 'Dentista não mapeado',     className: 'text-red-700' },
    no_date:      { icon: <XCircle      className="h-3.5 w-3.5" />, label: 'Sem data',                 className: 'text-red-700' },
  };
  const { icon, label, className } = map[status];
  return (
    <span className={cn('flex items-center gap-1 text-xs whitespace-nowrap', className)}>
      {icon} {label}
    </span>
  );
}

// ─── Página principal ────────────────────────────────────────────────────────
export default function ImportacaoAgendamentos() {
  const { isAdmin, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [isDragging, setIsDragging]     = useState(false);
  const [fileName, setFileName]         = useState('');
  const [parsedRows, setParsedRows]     = useState<ParsedRow[]>([]);
  const [step, setStep]                 = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults]   = useState({ imported: 0, errors: 0, skipped: 0 });
  const [showAll, setShowAll]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Processa arquivo Excel ─────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);

    let raw: Record<string, unknown>[];
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      raw = XLSX.utils.sheet_to_json(ws, { defval: '' });
    } catch {
      toast({ title: 'Erro ao ler o arquivo', description: 'Certifique-se que é um .xlsx válido.', variant: 'destructive' });
      return;
    }

    if (!raw.length) {
      toast({ title: 'Arquivo vazio', variant: 'destructive' });
      return;
    }

    // Carrega todos os pacientes com legacy_patient_id
    const { data: patients, error } = await supabase
      .from('patients')
      .select('id, legacy_patient_id');

    if (error) {
      toast({ title: 'Erro ao carregar pacientes', description: error.message, variant: 'destructive' });
      return;
    }

    const patientMap: Record<string, string> = {};
    (patients ?? []).forEach(p => {
      const lid = (p as any).legacy_patient_id;
      if (lid) patientMap[String(lid).trim()] = p.id;
    });

    const parsed: ParsedRow[] = raw.map(row => {
      const legacyPatientId = String(row['PatientId'] ?? '').trim();
      const legacyDentistId = String(row['DentistId'] ?? '').trim();
      const canceled        = String(row['Canceled']  ?? '').trim();
      const deleted         = String(row['Deleted']   ?? '').trim();
      const isDeleted       = /^x$/i.test(deleted);

      const notesParts = [
        row['CategoryDescription'] ? `Categoria: ${row['CategoryDescription']}` : '',
        row['Prcedures']           ? `Procedimentos: ${row['Prcedures']}`       : '',
        row['Procedures']          ? `Procedimentos: ${row['Procedures']}`      : '',
        row['Notes']               ? `Obs: ${row['Notes']}`                     : '',
      ].filter(Boolean);

      const patientUuid     = patientMap[legacyPatientId] || undefined;
      const professionalUuid = DENTIST_MAP[legacyDentistId] || undefined;
      const date            = parseDate(row['date'] ?? row['Date']);
      const rawCreated      = String(row['InsertDate'] ?? row['CreateDate'] ?? '').trim();
      const createdAt       = rawCreated || null;

      let rowStatus: RowStatus = 'ok';
      if (isDeleted)          rowStatus = 'deleted';
      else if (!patientUuid)  rowStatus = 'no_patient';
      else if (!professionalUuid) rowStatus = 'no_dentist';
      else if (!date)         rowStatus = 'no_date';

      return {
        legacyId:       String(row['id'] ?? '').trim(),
        legacyPatientId,
        patientName:    String(row['PatientName'] ?? '').trim(),
        legacyDentistId,
        dentistName:    DENTIST_NAMES[legacyDentistId] ?? String(row['DentistName'] ?? '').trim(),
        date,
        time:           String(row['fromTime'] ?? '00:00').trim(),
        status:         mapStatus(String(row['Status'] ?? ''), canceled),
        notes:          notesParts.join('\n'),
        createdAt,
        patientUuid,
        professionalUuid,
        rowStatus,
      };
    });

    setParsedRows(parsed);
    setStep('preview');
  }, [toast]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await processFile(file);
  }, [processFile]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await processFile(file);
    e.target.value = '';
  }, [processFile]);

  // ── Importa agendamentos ───────────────────────────────────────────────────
  const startImport = async () => {
    const toImport = parsedRows.filter(r => r.rowStatus === 'ok');
    const skipped  = parsedRows.filter(r => r.rowStatus !== 'ok').length;

    if (!toImport.length) return;

    setStep('importing');
    setImportProgress(0);

    let imported = 0;
    let errors   = 0;
    const chunkSize = 50;

    for (let i = 0; i < toImport.length; i += chunkSize) {
      const chunk = toImport.slice(i, i + chunkSize);

      const records = chunk.map(r => ({
        patient_id:      r.patientUuid!,
        professional_id: r.professionalUuid!,
        date:            buildIsoDateTime(r.date!, r.time),
        time:            r.time,
        duration:        1,
        status:          r.status,
        origin:          'Outro' as const,
        notes:           r.notes || null,
        ...(r.createdAt ? { created_at: r.createdAt } : {}),
      }));

      const { error } = await supabase.from('appointments').insert(records as any);
      if (error) {
        errors += chunk.length;
        console.error('Erro no chunk de importação:', error.message);
      } else {
        imported += chunk.length;
      }

      setImportProgress(Math.round(((i + chunk.length) / toImport.length) * 100));
    }

    setImportResults({ imported, errors, skipped });
    setStep('done');

    if (errors === 0) {
      toast({ title: 'Importação concluída!', description: `${imported} agendamentos importados com sucesso.` });
    } else {
      toast({ title: 'Importação com erros', description: `${imported} importados, ${errors} falharam.`, variant: 'destructive' });
    }
  };

  const reset = () => {
    setParsedRows([]);
    setStep('upload');
    setFileName('');
    setShowAll(false);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (roleLoading) return null;

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <XCircle className="h-12 w-12 text-muted-foreground/40" />
        <p className="font-semibold">Acesso restrito</p>
        <p className="text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</p>
      </div>
    );
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = {
    total:     parsedRows.length,
    ok:        parsedRows.filter(r => r.rowStatus === 'ok').length,
    deleted:   parsedRows.filter(r => r.rowStatus === 'deleted').length,
    noPatient: parsedRows.filter(r => r.rowStatus === 'no_patient').length,
    noDentist: parsedRows.filter(r => r.rowStatus === 'no_dentist').length,
    noDate:    parsedRows.filter(r => r.rowStatus === 'no_date').length,
  };

  const displayRows = showAll ? parsedRows : parsedRows.slice(0, 100);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-semibold">Importação de Agendamentos</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Importe agendamentos do sistema legado via arquivo Excel (.xlsx / .xls).
          Os agendamentos serão vinculados aos pacientes pelo <code className="text-xs bg-muted px-1 py-0.5 rounded">legacy_patient_id</code>.
        </p>
      </div>

      {/* ── Step: Upload ── */}
      {step === 'upload' && (
        <div
          className={cn(
            'border-2 border-dashed rounded-2xl p-14 flex flex-col items-center gap-4 cursor-pointer transition-colors select-none',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/40 hover:bg-muted/30',
          )}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <FileSpreadsheet className="h-14 w-14 text-muted-foreground/40" />
          <div className="text-center">
            <p className="font-semibold text-base">Arraste o arquivo Excel aqui</p>
            <p className="text-sm text-muted-foreground mt-1">ou clique para selecionar — .xlsx, .xls</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {/* ── Step: Preview ── */}
      {step === 'preview' && (
        <div className="space-y-5">
          {/* Arquivo selecionado */}
          <div className="flex items-center gap-3 text-sm">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="font-medium truncate">{fileName}</span>
            <Button variant="ghost" size="sm" onClick={reset} className="shrink-0">
              <RefreshCw className="h-3.5 w-3.5 mr-1" /> Trocar arquivo
            </Button>
          </div>

          {/* Cards de estatísticas */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Total de linhas"         value={stats.total}     variant="gray"   />
            <StatCard label="Prontos para importar"   value={stats.ok}        variant="green"  />
            <StatCard label="Excluídos (ignorados)"   value={stats.deleted}   variant="gray"   />
            <StatCard label="Paciente não encontrado" value={stats.noPatient} variant="orange" />
            <StatCard label="Dentista não mapeado"    value={stats.noDentist} variant="red"    />
          </div>

          {/* Alertas */}
          {stats.noPatient > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-50 text-orange-800 text-sm border border-orange-200">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{stats.noPatient}</strong> agendamento{stats.noPatient > 1 ? 's' : ''} não
                {stats.noPatient > 1 ? ' serão importados' : ' será importado'} pois o paciente não foi
                encontrado pelo <code className="bg-orange-100 px-1 rounded text-xs">legacy_patient_id</code>.
              </span>
            </div>
          )}
          {stats.noDentist > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200">
              <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                <strong>{stats.noDentist}</strong> agendamento{stats.noDentist > 1 ? 's' : ''} com
                DentistId não mapeado.
              </span>
            </div>
          )}

          {/* Tabela de preview */}
          <div className="border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b">
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Situação</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Paciente</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Dentista</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Data</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Hora</th>
                    <th className="text-left px-3 py-2.5 font-medium text-muted-foreground text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {displayRows.map((r, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'hover:bg-muted/20 transition-colors',
                        r.rowStatus !== 'ok' && 'opacity-50',
                      )}
                    >
                      <td className="px-3 py-2"><RowStatusBadge status={r.rowStatus} /></td>
                      <td className="px-3 py-2 max-w-[180px] truncate">{r.patientName || r.legacyPatientId}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.dentistName || r.legacyDentistId}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.date ?? '—'}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-mono text-xs">{r.time}</td>
                      <td className="px-3 py-2">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_COLORS[r.status])}>
                          {STATUS_LABELS[r.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {parsedRows.length > 100 && (
              <div className="border-t p-3 text-center bg-muted/20">
                <Button variant="ghost" size="sm" onClick={() => setShowAll(v => !v)}>
                  <ChevronDown className={cn('h-4 w-4 mr-1.5 transition-transform', showAll && 'rotate-180')} />
                  {showAll ? 'Mostrar menos' : `Mostrar todos os ${parsedRows.length} registros`}
                </Button>
              </div>
            )}
          </div>

          {/* Ações */}
          <div className="flex items-center gap-3 pt-1">
            <Button onClick={startImport} disabled={stats.ok === 0} size="lg">
              <Upload className="h-4 w-4 mr-2" />
              Importar {stats.ok} agendamento{stats.ok !== 1 ? 's' : ''}
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* ── Step: Importing ── */}
      {step === 'importing' && (
        <div className="flex flex-col items-center gap-8 py-20">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="w-full max-w-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Importando agendamentos…</span>
              <span className="font-medium">{importProgress}%</span>
            </div>
            <Progress value={importProgress} className="h-2" />
          </div>
        </div>
      )}

      {/* ── Step: Done ── */}
      {step === 'done' && (
        <div className="flex flex-col items-center gap-6 py-20">
          <CheckCircle2 className="h-14 w-14 text-emerald-600" />
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Importação concluída!</h2>
            <div className="flex items-center justify-center gap-4 text-sm">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
                <strong>{importResults.imported}</strong> importados
              </span>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">
                <strong>{importResults.skipped}</strong> ignorados
              </span>
              {importResults.errors > 0 && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1.5 text-red-600">
                    <XCircle className="h-4 w-4" />
                    <strong>{importResults.errors}</strong> erros
                  </span>
                </>
              )}
            </div>
          </div>
          <Button size="lg" onClick={reset}>
            <Upload className="h-4 w-4 mr-2" />
            Importar outro arquivo
          </Button>
        </div>
      )}
    </div>
  );
}
