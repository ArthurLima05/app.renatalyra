import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { Patient, Session } from '@/types';
import LightLogoRaw from '@/assets/LightLogo.svg?raw';
import SimboloDouradoRaw from '@/assets/SimboloDourado.svg?raw';

// ─── Conversão número → extenso (pt-BR) ───────────────────────────────────────

const UNITS = [
  '', 'um', 'dois', 'três', 'quatro', 'cinco',
  'seis', 'sete', 'oito', 'nove', 'dez', 'onze',
  'doze', 'treze', 'quatorze', 'quinze', 'dezesseis',
  'dezessete', 'dezoito', 'dezenove',
];
const TENS = ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'];
const HUNDREDS = ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  return TENS[t] + (u ? ' e ' + UNITS[u] : '');
}

function below1000(n: number): string {
  if (n === 0) return '';
  if (n < 100) return below100(n);
  if (n === 100) return 'cem';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return HUNDREDS[h] + (rest ? ' e ' + below100(rest) : '');
}

function intToWords(n: number): string {
  if (n === 0) return 'zero';
  if (n < 1_000) return below1000(n);

  if (n < 1_000_000) {
    const k = Math.floor(n / 1_000);
    const rest = n % 1_000;
    const kWord = k === 1 ? 'mil' : below1000(k) + ' mil';
    if (!rest) return kWord;
    return kWord + (rest < 100 ? ' e ' : ' ') + below1000(rest);
  }

  if (n < 1_000_000_000) {
    const m = Math.floor(n / 1_000_000);
    const rest = n % 1_000_000;
    const mWord = m === 1 ? 'um milhão' : below1000(m) + ' milhões';
    if (!rest) return mWord;
    return mWord + (rest < 100 ? ' e ' : ' ') + intToWords(rest);
  }

  return n.toString();
}

function numberToExtensoBRL(amount: number): string {
  if (!isFinite(amount) || amount < 0) return '';
  const intPart = Math.floor(amount);
  const centPart = Math.round((amount - intPart) * 100);

  const intWord = intPart > 0 ? intToWords(intPart) : '';
  const realSuffix = intPart === 1 ? 'real' : 'reais';
  const centWord = centPart > 0 ? intToWords(centPart) : '';
  const centSuffix = centPart === 1 ? 'centavo' : 'centavos';

  if (intPart === 0 && centPart === 0) return 'zero reais';
  if (intPart === 0) return centWord + ' ' + centSuffix;
  if (centPart === 0) return intWord + ' ' + realSuffix;
  return intWord + ' ' + realSuffix + ' e ' + centWord + ' ' + centSuffix;
}

// Parseia string de valor no formato BR ("20.000,00") ou US ("20000.00")
function parseAmountStr(s: string): number {
  const t = s.trim();
  if (t.includes(',')) {
    // BR: pontos = separadores de milhar, vírgula = decimal
    return parseFloat(t.replace(/\./g, '').replace(',', '.')) || 0;
  }
  if (t.includes('.')) {
    const parts = t.split('.');
    const last = parts[parts.length - 1];
    // Se tem só um ponto e ≤2 dígitos depois → decimal US
    if (parts.length === 2 && last.length <= 2) return parseFloat(t) || 0;
    // Caso contrário pontos são separadores de milhar
    return parseFloat(t.replace(/\./g, '')) || 0;
  }
  return parseFloat(t) || 0;
}

const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// ─── Clínica ───────────────────────────────────────────────────────────────────

const CLINIC = {
  doctorName: 'Renata Cecilia Lyra',
  doctorCpf: '047.849.774-14',
  cro: 'CRO PE 7985',
  city: 'Recife',
  address: 'Rua Dr. Raul Lafayette 191, sala 202, Empresarial Universal Center, Boa Viagem',
  phone1: '(81) 3326-6446',
  phone2: '(81) 9 8624-3197',
  email: 'drarenatalyra@gmail.com',
  instagram: '@renatalyra',
};

const cleanSvg = (raw: string) =>
  raw
    .replace(/^<\?xml[^?]*\?>\s*/i, '')
    .replace(/<!DOCTYPE[^>]*>\s*/gi, '')
    .trim();

// Pré-computado uma vez ao carregar o módulo (encodeURIComponent em ~280KB é lento se feito por clique)
const LOGO_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg(LightLogoRaw))}`;
const SYMBOL_URL = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(cleanSvg(SimboloDouradoRaw))}`;

// ─── HTML para impressão ───────────────────────────────────────────────────────

const buildPrintHtml = (
  patientName: string,
  patientCpf: string,
  dateFormatted: string,
  amount: string,
  amountText: string,
  service: string,
  year?: number,
) => {
  const logoUrl = LOGO_URL;
  const symbolUrl = SYMBOL_URL;
  const cpfClause = patientCpf.trim()
    ? ` do CPF n&ordm; <strong>${patientCpf}</strong>`
    : '';
  const yearClause = year
    ? `, equivalente ao exerc&iacute;cio de <strong>${year}</strong>,`
    : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Recibo – ${patientName}</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; font-family: 'Garamond', 'Georgia', 'Times New Roman', serif; }
    .page {
      width: 210mm; height: 297mm;
      padding: 20mm 28mm 18mm 28mm;
      position: relative; overflow: hidden;
    }
    .header { display: flex; justify-content: center; align-items: center; }
    .logo-wrap { width: 240px; }
    .logo-wrap img { width: 100%; height: auto; display: block; border: 0; }
    .watermark {
      position: absolute; top: 50%; left: 50%;
      transform: translate(-50%, -48%);
      width: 220mm; height: 220mm;
      opacity: 0.16; pointer-events: none; z-index: 0;
    }
    .watermark img { width: 100%; height: 100%; display: block; border: 0; }
    .content { position: relative; z-index: 1; margin-top: 18mm; }
    .title {
      text-align: center; font-size: 22pt; font-weight: bold;
      letter-spacing: 2px; margin-bottom: 12mm;
      font-family: Arial, sans-serif;
    }
    .body-text { font-size: 14pt; line-height: 1.9; text-align: justify; color: #111; }
    .signature-area { margin-top: 36mm; text-align: center; }
    .signature-line {
      display: inline-block; width: 260px;
      border-top: 1px solid #333; padding-top: 6px;
      font-size: 12pt; color: #333; font-family: Arial, sans-serif;
    }
    .date-city { text-align: right; margin-top: 10mm; font-size: 12pt; font-weight: bold; color: #111; }
    .footer {
      position: absolute; bottom: 13mm; left: 28mm; right: 28mm;
      border-top: 0.5px solid #ccc; padding-top: 3mm;
      text-align: center; font-size: 9pt; color: #777;
      font-family: Arial, sans-serif; line-height: 1.5;
    }
  </style>
</head>
<body>
<div class="page">
  <div class="header"><div class="logo-wrap"><img src="${logoUrl}" alt="Renata Lyra"/></div></div>
  <div class="watermark"><img src="${symbolUrl}" alt=""/></div>
  <div class="content">
    <div class="title">R E C I B O</div>
    <div class="body-text">
      Eu, <strong>${CLINIC.doctorName}</strong>, portador(a) do CPF n&ordm;&nbsp;<strong>${CLINIC.doctorCpf}</strong>,
      venho por meio desta declarar que recebi nesta data <strong>${dateFormatted}</strong>${yearClause}
      a quantia de <strong>R$&nbsp;${amount}&nbsp;&ndash;&nbsp;${amountText}</strong>
      de <strong>${patientName}</strong>${cpfClause}.
      Declaro ainda que o valor recebido se refere aos servi&ccedil;os de
      <strong>${service}</strong>.
    </div>
    <div class="signature-area">
      <span class="signature-line">${CLINIC.doctorName}&nbsp;&ndash;&nbsp;${CLINIC.cro}</span>
    </div>
    <div class="date-city">${CLINIC.city},&nbsp;${dateFormatted}</div>
  </div>
  <div class="footer">
    ${CLINIC.address}&nbsp;|&nbsp;
    Fone: ${CLINIC.phone1}&nbsp;&bull;&nbsp;${CLINIC.phone2}&nbsp;|&nbsp;
    ${CLINIC.email}&nbsp;|&nbsp;${CLINIC.instagram}
  </div>
</div>
<script>window.onload = function(){ window.print(); }</script>
</body>
</html>`;
};

// ─── Componente ────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  patient: Patient;
  session?: Session | null;
  allSessions?: Session[];
  defaultMode?: 'sessao' | 'anual';
}

export const ReciboModal = ({ open, onClose, patient, session, allSessions, defaultMode }: Props) => {
  const hasAnual = !!allSessions && allSessions.length > 0;
  const [mode, setMode] = useState<'sessao' | 'anual'>(defaultMode ?? (session ? 'sessao' : 'anual'));

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    if (!allSessions) return [currentYear];
    const years = [...new Set(allSessions.map((s) => new Date(s.date).getFullYear()))].sort((a, b) => b - a);
    return years.length > 0 ? years : [currentYear];
  }, [allSessions, currentYear]);

  const [selectedYear, setSelectedYear] = useState(availableYears[0]);

  const annualTotal = useMemo(() => {
    if (!allSessions) return 0;
    return allSessions
      .filter((s) => new Date(s.date).getFullYear() === selectedYear && s.paymentStatus === 'pago')
      .reduce((sum, s) => sum + s.amount, 0);
  }, [allSessions, selectedYear]);

  const annualAmountFormatted = annualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // ── Dados do formulário ──────────────────────────────────────────────────
  const initData = () => {
    if (mode === 'anual') {
      return {
        date: format(new Date(), 'yyyy-MM-dd'),
        amount: annualAmountFormatted,
        amountText: capitalize(numberToExtensoBRL(annualTotal)),
        patientName: patient.fullName,
        patientCpf: patient.cpf ?? '',
        service: `Tratamento Odontológico – Exercício ${selectedYear}`,
      };
    }
    const s = session!;
    const amt = s.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return {
      date: format(s.date, 'yyyy-MM-dd'),
      amount: amt,
      amountText: capitalize(numberToExtensoBRL(s.amount)),
      patientName: patient.fullName,
      patientCpf: patient.cpf ?? '',
      service: s.procedure?.trim() || 'Tratamento Odontológico',
    };
  };

  const [data, setData] = useState(initData);

  // Reinicia dados ao trocar modo ou ano
  useEffect(() => { setData(initData()); }, [mode, selectedYear]);

  // Recalcula extenso quando valor muda
  useEffect(() => {
    const parsed = parseAmountStr(data.amount);
    if (parsed > 0) setData((prev) => ({ ...prev, amountText: capitalize(numberToExtensoBRL(parsed)) }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.amount]);

  const set = (field: string, value: string) => setData((prev) => ({ ...prev, [field]: value }));

  const handlePrint = () => {
    const dateFormatted = data.date
      ? format(new Date(data.date + 'T12:00:00'), 'dd/MM/yyyy')
      : format(new Date(), 'dd/MM/yyyy');

    const html = buildPrintHtml(data.patientName, data.patientCpf, dateFormatted, data.amount, data.amountText, data.service, mode === 'anual' ? selectedYear : undefined);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    onClose();
  };

  const canPrint = data.amount.trim() && data.amountText.trim() && data.patientName.trim();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>Gerar Recibo</DialogTitle>
          <DialogDescription>
            Revise os dados e clique em imprimir. O valor por extenso é gerado automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Toggle de modo — só aparece quando há sessões disponíveis */}
          {hasAnual && session && (
            <div className="grid grid-cols-2 border rounded-lg p-1 gap-1">
              <Button size="sm" variant={mode === 'sessao' ? 'secondary' : 'ghost'} className="w-full" onClick={() => setMode('sessao')}>
                Por Sessão
              </Button>
              <Button size="sm" variant={mode === 'anual' ? 'secondary' : 'ghost'} className="w-full" onClick={() => setMode('anual')}>
                Anual
              </Button>
            </div>
          )}

          {/* Seletor de ano (modo anual) */}
          {mode === 'anual' && (
            <div className="space-y-1.5">
              <Label>Ano de referência</Label>
              <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {availableYears.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Total de sessões pagas em {selectedYear}: <strong>R$ {annualAmountFormatted}</strong>
              </p>
            </div>
          )}

          {/* Campos editáveis */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="recibo-date">{mode === 'anual' ? 'Data do recibo' : 'Data'}</Label>
              <Input id="recibo-date" type="date" value={data.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recibo-amount">Valor (R$)</Label>
              <Input id="recibo-amount" value={data.amount} onChange={(e) => set('amount', e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="recibo-extenso">Valor por extenso</Label>
              <span className="text-xs text-muted-foreground">automático — editável</span>
            </div>
            <Input id="recibo-extenso" value={data.amountText} onChange={(e) => set('amountText', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recibo-patient">Nome do paciente</Label>
            <Input id="recibo-patient" value={data.patientName} onChange={(e) => set('patientName', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recibo-cpf">CPF do paciente</Label>
            <Input id="recibo-cpf" placeholder="Opcional" value={data.patientCpf} onChange={(e) => set('patientCpf', e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recibo-service">Procedimento</Label>
            <Input id="recibo-service" value={data.service} onChange={(e) => set('service', e.target.value)} />
          </div>

          <Button onClick={handlePrint} disabled={!canPrint} className="w-full mt-2">
            <Printer className="h-4 w-4 mr-2" />
            Visualizar e Imprimir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
