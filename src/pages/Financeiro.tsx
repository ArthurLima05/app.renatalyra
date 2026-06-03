import { motion } from 'framer-motion';
import { useState, useEffect, Fragment } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Download, CheckCircle2, ChevronLeft, ChevronRight, Target, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useUserRole } from '@/hooks/useUserRole';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { TransactionType } from '@/types';
import { usePermissionsCtx } from '@/contexts/PermissionsContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, addMonths, eachMonthOfInterval, eachDayOfInterval, getDay, isSameDay, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

type DatePeriod = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado';

export default function Financeiro() {
  const { transactions, addTransaction, deleteTransaction, deleteSession, installments, updateInstallment, sessions, getPatientById, professionals, isHoliday, clinicSettings, updateClinicSetting } = useClinic();
  const { canView, canCreate } = usePermissionsCtx();
  const { role, isSecretaria, loading: roleLoading } = useUserRole();
  const [isOpen, setIsOpen] = useState(false);
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('mes');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [dateOption, setDateOption] = useState<'hoje' | 'personalizado'>('hoje');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [showAllInstallments, setShowAllInstallments] = useState(false);
  const [transactionData, setTransactionData] = useState({
    type: 'entrada' as TransactionType,
    description: '',
    amount: '',
    category: '',
    comprovanteUrl: '',
    paymentMethod: '' as import('@/types').PaymentMethod | '',
    installmentCount: '',
    professionalId: '',
  });
  const [relatorioMes, setRelatorioMes] = useState(startOfMonth(new Date()));
  const [showFullRelatorio, setShowFullRelatorio] = useState(false);
  const [showCaixaDiaria, setShowCaixaDiaria] = useState(false);
  const [deletingTransaction, setDeletingTransaction] = useState<{ id: string; sessionId?: string; description: string } | null>(null);
  const [metaDiaria, setMetaDiaria] = useState<number>(8500);
  const [metaDiariaInput, setMetaDiariaInput] = useState<string>('8500');

  // Sincroniza metaDiaria com o valor do banco quando clinicSettings carregar
  useEffect(() => {
    const saved = clinicSettings['meta_diaria'];
    if (saved) {
      const num = parseFloat(saved);
      if (!isNaN(num)) {
        setMetaDiaria(num);
        setMetaDiariaInput(saved);
      }
    }
  }, [clinicSettings]);

  const handleMetaDiariaChange = (value: string) => {
    setMetaDiariaInput(value);
  };

  const handleSaveMetaDiaria = () => {
    const num = parseFloat(metaDiariaInput.replace(',', '.'));
    if (!isNaN(num) && num >= 0) {
      setMetaDiaria(num);
      updateClinicSetting('meta_diaria', String(num));
    }
  };

  const relatorioData = (() => {
    const days = eachDayOfInterval({ start: startOfMonth(relatorioMes), end: endOfMonth(relatorioMes) });
    const today = startOfDay(new Date());
    return days.map(day => {
      const dow = getDay(day);
      const isWeekend = dow === 0 || dow === 6;
      const weekendLabel = dow === 6 ? 'sábado' : 'domingo';
      const holiday = isHoliday(day);
      const isHolidayDay = !!holiday;
      const skipDay = isWeekend || isHolidayDay;
      const isFutureDay = isAfter(startOfDay(day), today);
      const isToday = isSameDay(day, today);
      const realizado = skipDay ? null : transactions
        .filter(t => isSameDay(new Date(t.date), day))
        .reduce((acc, t) => acc + (t.type === 'entrada' ? t.amount : -t.amount), 0);
      const meta = skipDay ? null : metaDiaria;
      const diferenca = realizado !== null && meta !== null ? realizado - meta : null;
      const percentual = realizado !== null && meta !== null && meta > 0 ? (realizado / meta) * 100 : (realizado !== null ? 0 : null);
      return { day, isWeekend, weekendLabel, holiday, isHolidayDay, realizado, meta, diferenca, percentual, isFutureDay, isToday };
    });
  })();

  const relatorioTotalMeta = relatorioData.filter(d => !d.isWeekend && !d.isHolidayDay).reduce((a, d) => a + (d.meta ?? 0), 0);
  const relatorioTotalRealizado = relatorioData.filter(d => !d.isWeekend && !d.isHolidayDay).reduce((a, d) => a + (d.realizado ?? 0), 0);
  const relatorioTotalDiferenca = relatorioTotalRealizado - relatorioTotalMeta;

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fmtDiff = (v: number) => `${v >= 0 ? '+' : ''}${fmtBRL(v)}`;

  const pmLabel = (method?: string, count?: number): string => {
    if (!method) return '—';
    const base: Record<string, string> = {
      pix: 'PIX', dinheiro: 'Espécie', cartao_debito: 'Débito',
      cartao_credito: 'Crédito', boleto: 'Boleto', cheque: 'Cheque',
    };
    const label = base[method] ?? method;
    if (method === 'cartao_credito') return 'Crédito';
    return label;
  };

  const caixaData = (() => {
    const monthStart = startOfMonth(relatorioMes);
    const monthEnd = endOfMonth(relatorioMes);
    const items = transactions
      .filter(t => { const d = new Date(t.date); return d >= monthStart && d <= monthEnd; })
      .map(t => {
        const session = t.sessionId ? sessions.find(s => s.id === t.sessionId) : null;
        const patient = t.patientId ? getPatientById(t.patientId) : session?.patientId ? getPatientById(session.patientId) : null;
        return {
          id: t.id,
          type: t.type,
          date: new Date(t.date),
          dayKey: format(new Date(t.date), 'dd/MM'),
          clientName: patient?.fullName ?? 'Sistema',
          service: session?.procedure ?? t.description,
          amount: t.amount,
          paymentMethod: t.paymentMethod ?? (session as any)?.paymentMethod,
          installmentCount: t.installmentCount ?? (session as any)?.installmentCount,
          sessionId: t.sessionId,
          patientId: t.patientId ?? session?.patientId,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const byDay: Record<string, typeof items> = {};
    for (const item of items) {
      if (!byDay[item.dayKey]) byDay[item.dayKey] = [];
      byDay[item.dayKey].push(item);
    }
    return byDay;
  })();

  const exportCaixaDiaria = () => {
    const wb = XLSX.utils.book_new();
    const mesLabel = format(relatorioMes, 'MMMM yyyy', { locale: ptBR }).toUpperCase();
    const wsData: any[][] = [
      [`CAIXA - ${mesLabel}`], [],
      ['DATA', 'CLIENTE', 'SERVIÇO', 'VALOR', 'FORMA PGT.', 'PARCELAS', 'VALOR LÍQUIDO'],
    ];

    const allDays = eachDayOfInterval({ start: startOfMonth(relatorioMes), end: endOfMonth(relatorioMes) });

    for (const day of allDays) {
      const dayKey = format(day, 'dd/MM');
      const items = caixaData[dayKey] ?? [];
      const holiday = isHoliday(day);

      if (items.length === 0 && !holiday) continue;

      if (holiday) {
        wsData.push([dayKey, `FERIADO: ${holiday.name}`, '', '', '', '', '']);
        if (items.length === 0) { wsData.push([]); continue; }
      }

      for (const item of items) {
        wsData.push([dayKey, item.clientName, item.service,
          item.type === 'saida' ? -item.amount : item.amount,
          pmLabel(item.paymentMethod, item.installmentCount),
          item.installmentCount && item.installmentCount > 1 ? item.installmentCount : '', '']);
      }
      const liquido = items.reduce((a, i) => a + (i.type === 'entrada' ? i.amount : -i.amount), 0);
      wsData.push(['TOTAL DO DIA', '', '', liquido, '', '', '']);
      wsData.push([]);
    }

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 8 }, { wch: 26 }, { wch: 32 }, { wch: 14 }, { wch: 18 }, { wch: 10 }, { wch: 14 }];
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    XLSX.utils.book_append_sheet(wb, ws, mesLabel.substring(0, 31));
    XLSX.writeFile(wb, `Caixa_${format(relatorioMes, 'MM-yyyy')}.xlsx`);
  };

  const getDateRange = (): { start: Date; end: Date } => {
    const now = new Date();
    
    switch (datePeriod) {
      case 'hoje':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'semana':
        return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case 'mes':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'ano':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'personalizado':
        return {
          start: customStartDate ? startOfDay(customStartDate) : startOfYear(now),
          end: customEndDate ? endOfDay(customEndDate) : endOfDay(now),
        };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const dateRange = getDateRange();

  const filteredByDateTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= dateRange.start && transactionDate <= dateRange.end;
  });

  const totalEntradas = filteredByDateTransactions
    .filter(t => t.type === 'entrada')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSaidas = filteredByDateTransactions
    .filter(t => t.type === 'saida')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

  // Agrupar por categoria
  const categoriesData = filteredByDateTransactions.reduce((acc, t) => {
    if (!acc[t.category]) {
      acc[t.category] = { entrada: 0, saida: 0 };
    }
    if (t.type === 'entrada') {
      acc[t.category].entrada += t.amount;
    } else {
      acc[t.category].saida += t.amount;
    }
    return acc;
  }, {} as Record<string, { entrada: number; saida: number }>);

  const categoryChartData = Object.entries(categoriesData).map(([name, data]) => ({
    name,
    Entradas: data.entrada,
    Saídas: data.saida,
  }));

  // Dados para gráfico de evolução (últimos 6 meses)
  const evolutionData = (() => {
    const now = new Date();
    const last6Months = eachMonthOfInterval({
      start: subMonths(now, 5),
      end: now
    });

    return last6Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= monthStart && transactionDate <= monthEnd;
      });

      const entrada = monthTransactions
        .filter(t => t.type === 'entrada')
        .reduce((acc, t) => acc + t.amount, 0);
      
      const saida = monthTransactions
        .filter(t => t.type === 'saida')
        .reduce((acc, t) => acc + t.amount, 0);

      return {
        mes: format(month, 'MMM', { locale: ptBR }),
        entrada,
        saida
      };
    });
  })();

  const chartData = [
    { name: 'Entradas', value: totalEntradas },
    { name: 'Saídas', value: totalSaidas },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedDate = dateOption === 'hoje' ? new Date() : (customDate || new Date());
    
    addTransaction({
      ...transactionData,
      amount: parseFloat(transactionData.amount),
      date: selectedDate,
      comprovanteUrl: transactionData.comprovanteUrl.trim() || undefined,
      paymentMethod: transactionData.paymentMethod || undefined,
      installmentCount: transactionData.installmentCount ? parseInt(transactionData.installmentCount) : undefined,
      professionalId: transactionData.professionalId || undefined,
    });

    setIsOpen(false);
    setDateOption('hoje');
    setCustomDate(undefined);
    setTransactionData({
      type: 'entrada',
      description: '',
      amount: '',
      category: '',
      comprovanteUrl: '',
      paymentMethod: '',
      installmentCount: '',
      professionalId: '',
    });
  };

  const exportToExcelAnual = (type?: 'entrada' | 'saida') => {
    const wb = XLSX.utils.book_new();
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth(); // 0-11
    
    const monthNames = [
      'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
      'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
    ];

    const typeLabel = type === 'entrada' ? 'ENTRADAS' : type === 'saida' ? 'DESPESAS' : 'FINANCEIRO';

    // Criar uma aba para cada mês
    monthNames.forEach((monthName, monthIndex) => {
      // Filtrar transações do mês específico
      const monthStart = new Date(currentYear, monthIndex, 1);
      const monthEnd = endOfMonth(monthStart);
      
      const monthTransactions = transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate >= monthStart && tDate <= monthEnd &&
               (type ? t.type === type : true);
      });

      // Preparar dados da tabela
      const tableData = monthTransactions.map(t => [
        format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR }),
        t.description,
        t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
        t.category || '',
        t.comprovanteUrl || ''
      ]);

      // Criar título com o período do mês
      const title = `${typeLabel} DO PERÍODO ${format(monthStart, 'dd/MM/yyyy')} - ${format(monthEnd, 'dd/MM/yyyy')}`;

      // Criar array com título, linha vazia, headers e dados
      const wsData = [
        [title],
        [],
        ['DATA', 'DESCRIÇÃO DA DESPESA', 'VALOR', 'OBSERVAÇÕES', 'COMPROVANTE'],
        ...tableData
      ];

      const ws = XLSX.utils.aoa_to_sheet(wsData);

      // Adicionar hyperlinks nas células de comprovante
      monthTransactions.forEach((t, rowIdx) => {
        if (t.comprovanteUrl) {
          const cellRef = `E${rowIdx + 4}`;
          if (ws[cellRef]) {
            ws[cellRef].l = { Target: t.comprovanteUrl };
            ws[cellRef].v = 'Ver comprovante';
          }
        }
      });

      // Mesclar células do título (A1 até E1)
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

      // Definir larguras das colunas
      ws['!cols'] = [
        { wch: 12 },
        { wch: 40 },
        { wch: 15 },
        { wch: 25 },
        { wch: 20 }
      ];

      // Aplicar estilos ao título
      if (ws['A1']) {
        ws['A1'].s = {
          font: { bold: true, sz: 14 },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }

      // Estilo dos headers
      ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            font: { bold: true },
            alignment: { horizontal: 'center', vertical: 'center' }
          };
        }
      });

      // Aplicar background cinzento no mês atual
      if (monthIndex === currentMonth) {
        // Aplicar cor de fundo nas células de dados do mês atual
        for (let row = 3; row < wsData.length; row++) {
          ['A', 'B', 'C', 'D', 'E'].forEach(col => {
            const cellRef = `${col}${row + 1}`;
            if (ws[cellRef]) {
              ws[cellRef].s = {
                ...ws[cellRef].s,
                fill: { fgColor: { rgb: "D3D3D3" } }
              };
            }
          });
        }
      }

      XLSX.utils.book_append_sheet(wb, ws, monthName);
    });

    const fileName = `${typeLabel}_${currentYear}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const exportToExcelPeriodo = (type?: 'entrada' | 'saida') => {
    const dataToExport = type
      ? filteredByDateTransactions.filter(t => t.type === type)
      : filteredByDateTransactions;

    const typeLabel = type === 'entrada' ? 'ENTRADAS' : type === 'saida' ? 'DESPESAS' : 'FINANCEIRO';
    const periodLabel = `${format(dateRange.start, 'dd/MM/yyyy')} - ${format(dateRange.end, 'dd/MM/yyyy')}`;
    const title = `${typeLabel} DO PERÍODO ${periodLabel}`;
    
    const wb = XLSX.utils.book_new();
    
    const tableData = dataToExport.map(t => [
      format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR }),
      t.description,
      t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
      t.category || '',
      t.comprovanteUrl || ''
    ]);

    const wsData = [
      [title],
      [],
      ['DATA', 'DESCRIÇÃO DA DESPESA', 'VALOR', 'OBSERVAÇÕES', 'COMPROVANTE'],
      ...tableData
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Adicionar hyperlinks nas células de comprovante
    dataToExport.forEach((t, rowIdx) => {
      if (t.comprovanteUrl) {
        const cellRef = `E${rowIdx + 4}`;
        if (ws[cellRef]) {
          ws[cellRef].l = { Target: t.comprovanteUrl };
          ws[cellRef].v = 'Ver comprovante';
        }
      }
    });

    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

    ws['!cols'] = [
      { wch: 12 },
      { wch: 40 },
      { wch: 15 },
      { wch: 25 },
      { wch: 20 }
    ];

    if (ws['A1']) {
      ws['A1'].s = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' }
      };
    }

    ['A3', 'B3', 'C3', 'D3', 'E3'].forEach(cell => {
      if (ws[cell]) {
        ws[cell].s = {
          font: { bold: true },
          alignment: { horizontal: 'center', vertical: 'center' }
        };
      }
    });

    XLSX.utils.book_append_sheet(wb, ws, 'Período');

    const fileName = `${typeLabel}_do_período_${format(dateRange.start, 'dd-MM-yyyy')}_${format(dateRange.end, 'dd-MM-yyyy')}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const COLORS = ['#DBC192', '#9CA0A0'];

  if (roleLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl text-foreground">Financeiro</h1>
            <p className="text-sm sm:text-base text-muted-foreground font-cocon">
              {isSecretaria ? 'Adicionar lançamentos' : 'Controle detalhado de receitas e despesas'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  <TrendingUp className="h-4 w-4" />
                  Entradas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="flex flex-col gap-2">
                  <Button onClick={() => exportToExcelAnual('entrada')} variant="ghost" size="sm" className="w-full justify-start">
                    Anual (12 meses)
                  </Button>
                  <Button onClick={() => exportToExcelPeriodo('entrada')} variant="ghost" size="sm" className="w-full justify-start">
                    Período Atual
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <Download className="h-4 w-4" />
                  <TrendingDown className="h-4 w-4" />
                  Saídas
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="flex flex-col gap-2">
                  <Button onClick={() => exportToExcelAnual('saida')} variant="ghost" size="sm" className="w-full justify-start">
                    Anual (12 meses)
                  </Button>
                  <Button onClick={() => exportToExcelPeriodo('saida')} variant="ghost" size="sm" className="w-full justify-start">
                    Período Atual
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2 w-full sm:w-auto" disabled={!canCreate('financeiro')}>
                  <Plus className="h-4 w-4" />
                  Novo Lançamento
                </Button>
              </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Lançamento</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={transactionData.type}
                  onValueChange={(value) => setTransactionData({ ...transactionData, type: value as TransactionType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="saida">Saída</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={transactionData.description}
                  onChange={(e) => setTransactionData({ ...transactionData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={transactionData.amount}
                  onChange={(e) => setTransactionData({ ...transactionData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Data</Label>
                <div className="flex items-center gap-2">
                  <Select value={dateOption} onValueChange={(value) => setDateOption(value as 'hoje' | 'personalizado')}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hoje">Hoje</SelectItem>
                      <SelectItem value="personalizado">Data Personalizada</SelectItem>
                    </SelectContent>
                  </Select>
                  {dateOption === 'personalizado' && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {customDate ? format(customDate, "dd/MM/yy", { locale: ptBR }) : "Selecionar"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={customDate}
                          onSelect={setCustomDate}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              </div>
              
              <div>
                <Label>Forma de Pagamento</Label>
                <Select
                  value={transactionData.paymentMethod}
                  onValueChange={(v) => setTransactionData({ ...transactionData, paymentMethod: v as any, installmentCount: '' })}
                >
                  <SelectTrigger><SelectValue placeholder="Selecionar (opcional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="dinheiro">Espécie / Dinheiro</SelectItem>
                    <SelectItem value="cartao_debito">Débito</SelectItem>
                    <SelectItem value="cartao_credito">Crédito</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {transactionData.paymentMethod === 'cartao_credito' && (
                <div>
                  <Label htmlFor="installmentCount">Nº de Parcelas</Label>
                  <Input
                    id="installmentCount"
                    type="number"
                    min="1"
                    max="72"
                    placeholder="1 = à vista"
                    value={transactionData.installmentCount}
                    onChange={(e) => setTransactionData({ ...transactionData, installmentCount: e.target.value })}
                  />
                </div>
              )}
              {transactionData.type === 'saida' && (
                <>
                  <div>
                    <Label>Dentista (repasse — opcional)</Label>
                    <Select
                      value={transactionData.professionalId}
                      onValueChange={(v) => setTransactionData({ ...transactionData, professionalId: v === '_none' ? '' : v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Nenhum (caixa geral)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">Nenhum (caixa geral)</SelectItem>
                        {professionals.map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="comprovante">Link do Comprovante (opcional)</Label>
                    <Input
                      id="comprovante"
                      placeholder="Cole o link do Google Drive, Dropbox, etc."
                      value={transactionData.comprovanteUrl}
                      onChange={(e) => setTransactionData({ ...transactionData, comprovanteUrl: e.target.value })}
                    />
                  </div>
                </>
              )}
              <Button type="submit" className="w-full">Adicionar</Button>
            </form>
          </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros de Data */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          <Select value={datePeriod} onValueChange={(value) => setDatePeriod(value as DatePeriod)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          
          {datePeriod === 'personalizado' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yy", { locale: ptBR }) : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
              
              <span className="hidden sm:inline text-sm text-muted-foreground">-</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full sm:w-auto justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yy", { locale: ptBR }) : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </motion.div>

      {/* Cards de Resumo - apenas para quem tem canView */}
      {canView('financeiro') && !isSecretaria && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.25 }}>
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-cocon mb-1">Total de Entradas</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground truncate tabular-nums">
                    R$ {totalEntradas.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredByDateTransactions.filter(t => t.type === 'entrada').length} transações
                  </p>
                </div>
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2.5 rounded-xl flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
              <div className="mt-3 h-px bg-emerald-200/60 dark:bg-emerald-800/40 rounded-full" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.25 }}>
          <Card className="border-l-4 border-l-rose-500">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-cocon mb-1">Total de Saídas</p>
                  <p className="text-xl sm:text-2xl font-bold text-foreground truncate tabular-nums">
                    R$ {totalSaidas.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {filteredByDateTransactions.filter(t => t.type === 'saida').length} transações
                  </p>
                </div>
                <div className="bg-rose-100 dark:bg-rose-900/30 p-2.5 rounded-xl flex-shrink-0">
                  <TrendingDown className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
              <div className="mt-3 h-px bg-rose-200/60 dark:bg-rose-800/40 rounded-full" />
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26, duration: 0.25 }}>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-muted-foreground font-cocon mb-1">Saldo Atual</p>
                  <p className={`text-xl sm:text-2xl font-bold truncate tabular-nums ${saldo >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                    R$ {saldo.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{saldo >= 0 ? 'Positivo' : 'Negativo'}</p>
                </div>
                <div className="bg-primary/10 p-2.5 rounded-xl flex-shrink-0">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
              </div>
              <div className="mt-3 h-px bg-primary/20 rounded-full" />
            </CardContent>
          </Card>
        </motion.div>
        </div>
      )}

      {/* Tabs com Gráficos - apenas para quem tem canView */}
      {canView('financeiro') && !isSecretaria && (
        <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Análise Financeira</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="distribuicao" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="distribuicao" className="text-xs sm:text-sm py-2">Distribuição</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-xs sm:text-sm py-2">Evolução</TabsTrigger>
                <TabsTrigger value="previsoes" className="text-xs sm:text-sm py-2">Previsões</TabsTrigger>
              </TabsList>
              
              <TabsContent value="distribuicao" className="mt-4">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </TabsContent>


              <TabsContent value="evolucao" className="mt-4">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Line type="monotone" dataKey="entrada" stroke="#10b981" strokeWidth={2} name="Entradas" />
                    <Line type="monotone" dataKey="saida" stroke="#ef4444" strokeWidth={2} name="Saídas" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="previsoes" className="mt-4">
                <div className="space-y-4">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Pagamentos futuros previstos baseados em parcelas de sessões
                  </p>
                  {installments.filter(i => !i.paid && i.sessionId).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8 text-sm">
                      Nenhuma parcela futura cadastrada
                    </p>
                  ) : (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                        <Table className="min-w-[600px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs sm:text-sm">Paciente</TableHead>
                              <TableHead className="text-xs sm:text-sm">Sessão</TableHead>
                              <TableHead className="text-xs sm:text-sm">Data Prevista</TableHead>
                              <TableHead className="text-xs sm:text-sm">Parcela</TableHead>
                              <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                              <TableHead className="text-right text-xs sm:text-sm">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {installments
                              .filter(i => !i.paid && i.sessionId)
                              .sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime())
                              .slice(0, showAllInstallments ? undefined : 8)
                              .map((installment) => {
                                const session = sessions.find(s => s.id === installment.sessionId);
                                const patient = session ? getPatientById(session.patientId) : null;
                                
                                return (
                                  <TableRow key={installment.id}>
                                    <TableCell className="font-medium text-xs sm:text-sm">
                                      {patient?.fullName || 'Paciente não encontrado'}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                      {session?.type || 'Sessão não encontrada'}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                      {format(installment.predictedDate, 'dd/MM/yyyy', { locale: ptBR })}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm">
                                      {installment.installmentNumber}/{installment.totalInstallments}
                                    </TableCell>
                                    <TableCell className="text-xs sm:text-sm whitespace-nowrap">
                                      R$ {installment.amount.toFixed(2)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => updateInstallment(installment.id, { paid: true, paidDate: new Date() })}
                                        className="text-xs"
                                      >
                                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                        <span className="hidden sm:inline">Marcar como Pago</span>
                                        <span className="sm:hidden">Pago</span>
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      </div>
                      {installments.filter(i => !i.paid && i.sessionId).length > 8 && (
                        <div className="mt-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowAllInstallments(!showAllInstallments)}
                            className="text-xs sm:text-sm"
                          >
                            {showAllInstallments ? 'Mostrar menos' : `Exibir mais (${installments.filter(i => !i.paid && i.sessionId).length - 8} parcelas)`}
                          </Button>
                        </div>
                      )}
                      <div className="mt-4 p-3 sm:p-4 bg-muted rounded-lg">
                        <p className="text-xs sm:text-sm font-medium">
                          Total previsto: R$ {installments
                            .filter(i => !i.paid && i.sessionId)
                            .reduce((acc, i) => acc + i.amount, 0)
                            .toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        </motion.div>
      )}

      {/* Caixa Diária */}
      {canView('financeiro') && !isSecretaria && (
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.43 }}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg sm:text-xl">Caixa Diária</CardTitle>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRelatorioMes(subMonths(relatorioMes, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                    <span className="text-sm font-medium min-w-[130px] text-center capitalize">{format(relatorioMes, 'MMMM yyyy', { locale: ptBR })}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRelatorioMes(addMonths(relatorioMes, 1))}><ChevronRight className="h-4 w-4" /></Button>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2 h-8" onClick={exportCaixaDiaria}>
                    <Download className="h-4 w-4" />Excel
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {Object.keys(caixaData).length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Nenhuma entrada registrada neste mês</p>
              ) : (
                <>
                  <div className="relative overflow-x-auto -mx-4 sm:mx-0">
                    <div className={cn('overflow-hidden transition-all duration-300', !showCaixaDiaria && 'max-h-[360px]')}>
                      <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                        <Table className="min-w-[560px]">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-16 text-xs">Data</TableHead>
                              <TableHead className="text-xs">Cliente</TableHead>
                              <TableHead className="text-xs">Serviço</TableHead>
                              <TableHead className="text-right text-xs">Valor</TableHead>
                              <TableHead className="text-xs">Forma Pgto</TableHead>
                              <TableHead className="text-center text-xs">Parcelas</TableHead>
                              <TableHead className="w-10 text-xs"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {Object.entries(caixaData).map(([dayKey, items]) => {
                              const totalEntrada = items.filter(i => i.type === 'entrada').reduce((a, i) => a + i.amount, 0);
                              const totalSaida = items.filter(i => i.type === 'saida').reduce((a, i) => a + i.amount, 0);
                              const liquido = totalEntrada - totalSaida;
                              return (
                                <Fragment key={dayKey}>
                                  {items.map((item, idx) => (
                                    <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                                      <TableCell className="text-sm py-2.5 text-muted-foreground whitespace-nowrap font-mono">{idx === 0 ? dayKey : ''}</TableCell>
                                      <TableCell className="text-sm py-2.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium">{item.clientName}</span>
                                          {item.type === 'saida' && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-900/50 dark:text-rose-400 leading-none shrink-0">saída</span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm py-2.5 text-muted-foreground">{item.service}</TableCell>
                                      <TableCell className={cn('text-right text-sm py-2.5 tabular-nums font-semibold', item.type === 'entrada' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400')}>
                                        {item.type === 'saida' ? '− ' : ''}{fmtBRL(item.amount)}
                                      </TableCell>
                                      <TableCell className="text-sm py-2.5 text-muted-foreground">{pmLabel(item.paymentMethod, item.installmentCount)}</TableCell>
                                      <TableCell className="text-center text-sm py-2.5 text-muted-foreground">{item.installmentCount && item.installmentCount > 1 ? `${item.installmentCount}x` : ''}</TableCell>
                                      <TableCell className="text-center py-2.5">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-muted-foreground hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                          onClick={() => setDeletingTransaction({ id: item.id, sessionId: item.sessionId, description: item.service ?? item.clientName })}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                  <TableRow>
                                    <TableCell colSpan={7} className="p-0 pb-3">
                                      <div className={cn(
                                        'mx-1 mt-1 rounded-lg px-4 py-2.5 flex items-center justify-between gap-4',
                                        liquido >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'
                                      )}>
                                        <div className="flex items-center gap-3">
                                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total {dayKey}</span>
                                          {totalSaida > 0 && (
                                            <div className="flex items-center gap-2 text-xs">
                                              <span className="text-emerald-600 dark:text-emerald-400">↑ {fmtBRL(totalEntrada)}</span>
                                              <span className="text-rose-500 dark:text-rose-400">↓ {fmtBRL(totalSaida)}</span>
                                            </div>
                                          )}
                                        </div>
                                        <span className={cn('text-lg font-bold tabular-nums', liquido >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                                          {fmtBRL(liquido)}
                                        </span>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                </Fragment>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                    {!showCaixaDiaria && <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />}
                  </div>
                  <div className="mt-2 text-center">
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground gap-1" onClick={() => setShowCaixaDiaria(v => !v)}>
                      {showCaixaDiaria ? <><ChevronLeft className="h-3 w-3 rotate-90" />Recolher</> : <><ChevronRight className="h-3 w-3 rotate-90" />Exibir Mais</>}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Relatório de Faturamento */}
      {canView('financeiro') && !isSecretaria && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.45 }}
        >
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg sm:text-xl">Relatório de Faturamento</CardTitle>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
                  <div className="flex items-center gap-1">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRelatorioMes(subMonths(relatorioMes, 1))}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[130px] text-center capitalize">
                      {format(relatorioMes, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setRelatorioMes(addMonths(relatorioMes, 1))}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground whitespace-nowrap">Meta diária (R$):</Label>
                    <Input
                      type="number"
                      min="0"
                      step="100"
                      value={metaDiariaInput}
                      onChange={(e) => handleMetaDiariaChange(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveMetaDiaria(); }}
                      className="w-28 text-right h-8 text-sm"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleSaveMetaDiaria}
                      className="h-8 px-3 text-xs"
                    >
                      Salvar
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto -mx-4 sm:mx-0">
                <div
                  className={cn(
                    'overflow-hidden transition-all duration-300',
                    !showFullRelatorio && 'max-h-[340px]',
                  )}
                >
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <Table className="min-w-[520px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20 text-xs">Data</TableHead>
                        <TableHead className="text-right text-xs">Meta do dia</TableHead>
                        <TableHead className="text-right text-xs">Realizado</TableHead>
                        <TableHead className="text-right text-xs">Diferença</TableHead>
                        <TableHead className="text-right text-xs">% da meta</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {relatorioData.map(({ day, isWeekend, weekendLabel, holiday, isHolidayDay, realizado, meta, diferenca, percentual, isFutureDay, isToday }) => (
                        <TableRow
                          key={format(day, 'yyyy-MM-dd')}
                          className={cn(
                            isWeekend && 'bg-orange-50/60 dark:bg-orange-950/20',
                            isHolidayDay && !isWeekend && 'bg-amber-50/60 dark:bg-amber-950/20',
                            isToday && !isWeekend && !isHolidayDay && 'bg-blue-50/60 dark:bg-blue-950/20',
                          )}
                        >
                          <TableCell className={cn(
                            'text-sm font-medium py-2',
                            isWeekend && 'text-orange-500',
                            isHolidayDay && !isWeekend && 'text-amber-600 dark:text-amber-400',
                            isToday && !isWeekend && !isHolidayDay && 'text-blue-600 dark:text-blue-400',
                            isFutureDay && !isWeekend && !isHolidayDay && 'text-muted-foreground',
                          )}>
                            {format(day, 'dd/MM')}
                          </TableCell>
                          {isWeekend ? (
                            <TableCell colSpan={4} className="text-orange-500 text-sm text-center py-2 italic">
                              {weekendLabel}
                            </TableCell>
                          ) : isHolidayDay ? (
                            <TableCell colSpan={4} className="text-amber-600 dark:text-amber-400 text-sm text-center py-2 italic">
                              feriado — {holiday!.name}
                            </TableCell>
                          ) : (
                            <>
                              <TableCell className="text-right text-sm py-2 text-muted-foreground tabular-nums">
                                {meta !== null ? fmtBRL(meta) : '—'}
                              </TableCell>
                              <TableCell className={cn('text-right text-sm py-2 tabular-nums', isFutureDay && 'text-muted-foreground')}>
                                {isFutureDay ? '—' : fmtBRL(realizado ?? 0)}
                              </TableCell>
                              <TableCell className={cn(
                                'text-right text-sm py-2 font-medium tabular-nums',
                                diferenca !== null && diferenca >= 0 && !isFutureDay && 'text-emerald-600 dark:text-emerald-400',
                                (diferenca === null || diferenca < 0 || isFutureDay) && 'text-rose-600 dark:text-rose-400',
                              )}>
                                {diferenca !== null ? fmtDiff(isFutureDay ? -(meta ?? 0) : diferenca) : '—'}
                              </TableCell>
                              <TableCell className={cn(
                                'text-right text-sm py-2 tabular-nums',
                                percentual !== null && percentual >= 100 && !isFutureDay && 'text-emerald-600 dark:text-emerald-400 font-semibold',
                                (percentual === null || percentual < 100 || isFutureDay) && 'text-rose-500 dark:text-rose-400',
                              )}>
                                {isFutureDay ? '0,00%' : percentual !== null ? `${percentual.toFixed(2).replace('.', ',')}%` : '—'}
                              </TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                      <TableRow className="border-t-2 border-border font-bold bg-muted/40">
                        <TableCell className="text-sm font-bold py-3">TOTAL</TableCell>
                        <TableCell className="text-right text-sm font-bold py-3 tabular-nums">{fmtBRL(relatorioTotalMeta)}</TableCell>
                        <TableCell className="text-right text-sm font-bold py-3 tabular-nums">{fmtBRL(relatorioTotalRealizado)}</TableCell>
                        <TableCell className={cn(
                          'text-right text-sm font-bold py-3 tabular-nums',
                          relatorioTotalDiferenca >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
                        )}>
                          {fmtDiff(relatorioTotalDiferenca)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold py-3 tabular-nums text-muted-foreground">
                          {relatorioTotalMeta > 0 ? `${((relatorioTotalRealizado / relatorioTotalMeta) * 100).toFixed(2).replace('.', ',')}%` : '—'}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                </div>
                {!showFullRelatorio && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent pointer-events-none" />
                )}
              </div>
              <div className="mt-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground gap-1"
                  onClick={() => setShowFullRelatorio(v => !v)}
                >
                  {showFullRelatorio ? (
                    <><ChevronLeft className="h-3 w-3 rotate-90" /> Recolher</>
                  ) : (
                    <><ChevronRight className="h-3 w-3 rotate-90" /> Exibir Mais</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

    </div>

    <AlertDialog open={!!deletingTransaction} onOpenChange={(open) => { if (!open) setDeletingTransaction(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Você está prestes a excluir <strong>{deletingTransaction?.description}</strong>.
            {deletingTransaction?.sessionId && (
              <span className="block mt-1">Este lançamento está vinculado a um paciente — a sessão correspondente também será removida do prontuário.</span>
            )}
            <span className="block mt-1 text-rose-500 font-medium">Esta ação não pode ser desfeita.</span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-500 hover:bg-rose-600 text-white"
            onClick={async () => {
              if (!deletingTransaction) return;
              await deleteTransaction(deletingTransaction.id);
              if (deletingTransaction.sessionId) {
                await deleteSession(deletingTransaction.sessionId);
              }
              setDeletingTransaction(null);
            }}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
