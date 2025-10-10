import { motion } from 'framer-motion';
import { useState } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Download, Trash2, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { TransactionType } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type DatePeriod = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado';

export default function Financeiro() {
  const { transactions, addTransaction, deleteTransaction, installments, updateInstallment } = useClinic();
  const [isOpen, setIsOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('mes');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(undefined);
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(undefined);
  const [dateOption, setDateOption] = useState<'hoje' | 'personalizado'>('hoje');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [installmentsCount, setInstallmentsCount] = useState<string>('1');
  const [firstPaymentDate, setFirstPaymentDate] = useState<Date | undefined>(undefined);
  const [formData, setFormData] = useState({
    type: 'entrada' as TransactionType,
    description: '',
    amount: '',
    category: '',
  });

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

  const filteredTransactions = filteredByDateTransactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
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
    const count = parseInt(installmentsCount);
    
    addTransaction(
      {
        ...formData,
        amount: parseFloat(formData.amount),
        date: selectedDate,
      },
      formData.type === 'entrada' && count > 1 ? count : undefined,
      formData.type === 'entrada' && count > 1 ? firstPaymentDate : undefined
    );
    
    setIsOpen(false);
    setDateOption('hoje');
    setCustomDate(undefined);
    setInstallmentsCount('1');
    setFirstPaymentDate(undefined);
    setFormData({
      type: 'entrada',
      description: '',
      amount: '',
      category: '',
    });
  };

  const exportToCSV = () => {
    const csvData = filteredByDateTransactions.map(t => ({
      Data: format(new Date(t.date), 'dd/MM/yyyy', { locale: ptBR }),
      Tipo: t.type === 'entrada' ? 'Entrada' : 'Saída',
      Descrição: t.description,
      Categoria: t.category,
      Valor: t.amount.toFixed(2)
    }));

    const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'];
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      )
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `financeiro_${format(dateRange.start, 'dd-MM-yyyy')}_${format(dateRange.end, 'dd-MM-yyyy')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteTransaction = async () => {
    if (transactionToDelete) {
      await deleteTransaction(transactionToDelete);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const COLORS = ['#DBC192', '#9CA0A0'];
  const allCategories = Array.from(new Set(transactions.map(t => t.category)));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Financeiro</h1>
            <p className="text-sm sm:text-base text-muted-foreground">Controle detalhado de receitas e despesas</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportToCSV} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Download
            </Button>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
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
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="amount">Valor</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
              
              {formData.type === 'entrada' && (
                <>
                  <div>
                    <Label htmlFor="installments">Número de Parcelas</Label>
                    <Input
                      id="installments"
                      type="number"
                      min="1"
                      value={installmentsCount}
                      onChange={(e) => setInstallmentsCount(e.target.value)}
                    />
                  </div>
                  
                  {parseInt(installmentsCount) > 1 && (
                    <div>
                      <Label>Data da Primeira Parcela</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {firstPaymentDate ? format(firstPaymentDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={firstPaymentDate}
                            onSelect={setFirstPaymentDate}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                            locale={ptBR}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}
                </>
              )}
              
              <Button type="submit" className="w-full">Adicionar</Button>
            </form>
          </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filtros de Data */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
          <Select value={datePeriod} onValueChange={(value) => setDatePeriod(value as DatePeriod)}>
            <SelectTrigger className="w-[180px]">
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
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
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
              
              <span className="text-sm text-muted-foreground">-</span>
              
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
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

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total de Entradas</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    R$ {totalEntradas.toFixed(2)}
                  </h3>
                   <p className="text-xs text-muted-foreground mt-1">
                    {filteredByDateTransactions.filter(t => t.type === 'entrada').length} transações
                  </p>
                </div>
                <div className="bg-green-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Total de Saídas</p>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                    R$ {totalSaidas.toFixed(2)}
                  </h3>
                   <p className="text-xs text-muted-foreground mt-1">
                    {filteredByDateTransactions.filter(t => t.type === 'saida').length} transações
                  </p>
                </div>
                <div className="bg-red-100 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <TrendingDown className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 pr-2">
                  <p className="text-xs sm:text-sm text-muted-foreground mb-1">Saldo Atual</p>
                  <h3 className={`text-xl sm:text-2xl font-bold truncate ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {saldo.toFixed(2)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {saldo >= 0 ? 'Positivo' : 'Negativo'}
                  </p>
                </div>
                <div className="bg-primary/10 p-2 sm:p-3 rounded-lg flex-shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs com Gráficos */}
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
              <TabsList className="grid w-full grid-cols-4 h-auto">
                <TabsTrigger value="distribuicao" className="text-xs sm:text-sm">Distribuição</TabsTrigger>
                <TabsTrigger value="categorias" className="text-xs sm:text-sm">Categorias</TabsTrigger>
                <TabsTrigger value="evolucao" className="text-xs sm:text-sm">Evolução</TabsTrigger>
                <TabsTrigger value="previsoes" className="text-xs sm:text-sm">Previsões</TabsTrigger>
              </TabsList>
              
              <TabsContent value="distribuicao" className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
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

              <TabsContent value="categorias" className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="Entradas" fill="#10b981" />
                    <Bar dataKey="Saídas" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="evolucao" className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="entrada" stroke="#10b981" strokeWidth={2} name="Entradas" />
                    <Line type="monotone" dataKey="saida" stroke="#ef4444" strokeWidth={2} name="Saídas" />
                  </LineChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="previsoes" className="mt-4">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Pagamentos futuros previstos baseados em parcelas cadastradas
                  </p>
                  {installments.filter(i => !i.paid).length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma previsão de pagamento cadastrada
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data Prevista</TableHead>
                            <TableHead>Parcela</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {installments
                            .filter(i => !i.paid)
                            .sort((a, b) => a.predictedDate.getTime() - b.predictedDate.getTime())
                            .map((installment) => (
                              <TableRow key={installment.id}>
                                <TableCell>
                                  {format(installment.predictedDate, 'dd/MM/yyyy', { locale: ptBR })}
                                </TableCell>
                                <TableCell>
                                  {installment.installmentNumber}/{installment.totalInstallments}
                                </TableCell>
                                <TableCell>
                                  R$ {installment.amount.toFixed(2)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => updateInstallment(installment.id, { paid: true, paidDate: new Date() })}
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Marcar como Pago
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 p-4 bg-muted rounded-lg">
                        <p className="text-sm font-medium">
                          Total previsto: R$ {installments
                            .filter(i => !i.paid)
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

      {/* Filtros e Histórico */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <CardTitle>Histórico de Transações</CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Select value={filterType} onValueChange={(v) => setFilterType(v as any)}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {allCategories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma transação encontrada
                </p>
              ) : (
                filteredTransactions.slice().reverse().map((transaction) => (
                  <div key={transaction.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border rounded-lg hover:bg-secondary/50 transition-colors gap-3">
                    <div className="flex-1 min-w-0 w-full sm:w-auto">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground text-sm sm:text-base truncate">{transaction.description}</p>
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded flex-shrink-0">
                          {transaction.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {transaction.date.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <div className="text-right flex-1 sm:flex-shrink-0">
                        <p className={`font-bold text-base sm:text-lg ${transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                          {transaction.type === 'entrada' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.type === 'entrada' ? 'Entrada' : 'Saída'}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTransactionToDelete(transaction.id);
                          setDeleteDialogOpen(true);
                        }}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTransaction} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
