import { motion } from 'framer-motion';
import { useState } from 'react';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, Legend, CartesianGrid } from 'recharts';
import { TransactionType } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Financeiro() {
  const { transactions, addTransaction } = useClinic();
  const [isOpen, setIsOpen] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'entrada' | 'saida'>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [formData, setFormData] = useState({
    type: 'entrada' as TransactionType,
    description: '',
    amount: '',
    category: '',
  });

  const filteredTransactions = transactions.filter(t => {
    if (filterType !== 'all' && t.type !== filterType) return false;
    if (filterCategory !== 'all' && t.category !== filterCategory) return false;
    return true;
  });

  const totalEntradas = transactions
    .filter(t => t.type === 'entrada')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalSaidas = transactions
    .filter(t => t.type === 'saida')
    .reduce((acc, t) => acc + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

  // Agrupar por categoria
  const categoriesData = transactions.reduce((acc, t) => {
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

  // Dados para gráfico de evolução (últimos 6 meses simulados)
  const evolutionData = [
    { mes: 'Jan', entrada: 45000, saida: 28000 },
    { mes: 'Fev', entrada: 52000, saida: 31000 },
    { mes: 'Mar', entrada: 48000, saida: 29000 },
    { mes: 'Abr', entrada: 61000, saida: 35000 },
    { mes: 'Mai', entrada: 55000, saida: 32000 },
    { mes: 'Jun', entrada: totalEntradas, saida: totalSaidas },
  ];

  const chartData = [
    { name: 'Entradas', value: totalEntradas },
    { name: 'Saídas', value: totalSaidas },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTransaction({
      ...formData,
      amount: parseFloat(formData.amount),
      date: new Date(),
    });
    setIsOpen(false);
    setFormData({
      type: 'entrada',
      description: '',
      amount: '',
      category: '',
    });
  };

  const COLORS = ['#DBC192', '#9CA0A0'];
  const allCategories = Array.from(new Set(transactions.map(t => t.category)));

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">Controle detalhado de receitas e despesas</p>
        </div>
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
              <Button type="submit" className="w-full">Adicionar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total de Entradas</p>
                  <h3 className="text-2xl font-bold text-foreground">
                    R$ {totalEntradas.toFixed(2)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {transactions.filter(t => t.type === 'entrada').length} transações
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-600" />
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total de Saídas</p>
                  <h3 className="text-2xl font-bold text-foreground">
                    R$ {totalSaidas.toFixed(2)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {transactions.filter(t => t.type === 'saida').length} transações
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-lg">
                  <TrendingDown className="h-6 w-6 text-red-600" />
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
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo Atual</p>
                  <h3 className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    R$ {saldo.toFixed(2)}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {saldo >= 0 ? 'Positivo' : 'Negativo'}
                  </p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <DollarSign className="h-6 w-6 text-primary" />
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
                <TabsTrigger value="categorias">Categorias</TabsTrigger>
                <TabsTrigger value="evolucao">Evolução</TabsTrigger>
              </TabsList>
              
              <TabsContent value="distribuicao">
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

              <TabsContent value="categorias">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Entradas" fill="#10b981" />
                    <Bar dataKey="Saídas" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </TabsContent>

              <TabsContent value="evolucao">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="entrada" stroke="#10b981" strokeWidth={2} name="Entradas" />
                    <Line type="monotone" dataKey="saida" stroke="#ef4444" strokeWidth={2} name="Saídas" />
                  </LineChart>
                </ResponsiveContainer>
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
                  <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{transaction.description}</p>
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">
                          {transaction.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <CalendarIcon className="h-3 w-3 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {transaction.date.toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold text-lg ${transaction.type === 'entrada' ? 'text-green-600' : 'text-red-600'}`}>
                        {transaction.type === 'entrada' ? '+' : '-'} R$ {transaction.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.type === 'entrada' ? 'Entrada' : 'Saída'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
