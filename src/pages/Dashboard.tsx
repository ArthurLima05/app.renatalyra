import { motion } from 'framer-motion';
import { Calendar, TrendingUp, UserCheck, Clock, CalendarIcon, Users } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, LineChart, Line, CartesianGrid } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type DatePeriod = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado' | 'todos';

// Tooltip customizado para todos os gráficos
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-primary/15 px-3 py-2.5 text-sm min-w-[120px]"
      style={{ background: 'var(--card-gradient)', boxShadow: 'var(--card-shadow)' }}
    >
      {label && (
        <p className="font-cocon text-xs text-muted-foreground mb-2 tracking-[0.03em]">{label}</p>
      )}
      <div className="space-y-1">
        {payload.map((item: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: item.color ?? item.fill }} />
            <span className="text-muted-foreground text-xs">{item.name ?? item.dataKey}:</span>
            <span className="font-semibold text-foreground text-xs tabular-nums">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Paleta 100% alinhada com os tokens do design system
const ORIGIN_COLORS = [
  'hsl(40,45%,65%)',   // primary — dourado
  'hsl(40,30%,55%)',   // warm deep
  'hsl(180,2%,58%)',   // muted — cinza neutro
  'hsl(40,60%,80%)',   // light gold
];
const STATUS_COLORS: Record<string, string> = {
  Agendado:   'hsl(40,60%,80%)',   // dourado claro
  Confirmado: 'hsl(40,45%,65%)',   // dourado primário
  Realizado:  'hsl(40,35%,50%)',   // dourado escuro
  Cancelado:  'hsl(0,0%,68%)',     // cinza médio
  Falta:      'hsl(0,0%,50%)',     // cinza escuro
};

export default function Dashboard() {
  const { appointments, patients, professionals, transactions } = useClinic();
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('todos');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const getDateRange = () => {
    const now = new Date();
    switch (datePeriod) {
      case 'hoje':     return { start: startOfDay(now), end: endOfDay(now) };
      case 'semana':   return { start: startOfWeek(now, { locale: ptBR }), end: endOfWeek(now, { locale: ptBR }) };
      case 'mes':      return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'ano':      return { start: startOfYear(now), end: endOfYear(now) };
      case 'personalizado':
        if (customStartDate && customEndDate)
          return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
        return null;
      default: return null;
    }
  };

  const dateRange = getDateRange();

  const filteredAppointments = dateRange
    ? appointments.filter(a => isWithinInterval(new Date(a.date), { start: dateRange.start, end: dateRange.end }))
    : appointments;

  // ── Cards ──────────────────────────────────────────────────────────────────
  const totalAppointments   = filteredAppointments.filter(a => a.status === 'realizado').length;
  const confirmedAppointments = filteredAppointments.filter(a => a.status === 'confirmado').length;
  const canceledOrMissed    = filteredAppointments.filter(a => a.status === 'cancelado' || a.status === 'falta').length;

  // Taxa de retorno: pacientes realizados no período que já tinham consulta antes
  const periodStart = dateRange?.start ?? new Date(0);
  const realizadosNoPeriodo = filteredAppointments.filter(a => a.status === 'realizado');
  const pacientesUnicos = [...new Set(realizadosNoPeriodo.map(a => a.patientId))];
  const pacientesComRetorno = pacientesUnicos.filter(patientId =>
    appointments.some(a =>
      a.patientId === patientId &&
      a.status === 'realizado' &&
      new Date(a.date) < periodStart
    )
  ).length;
  const returnRate = pacientesUnicos.length > 0
    ? Math.round((pacientesComRetorno / pacientesUnicos.length) * 100)
    : 0;

  // Novos pacientes / total pacientes
  const isTodos = datePeriod === 'todos';
  const newPatients = isTodos
    ? patients.length
    : dateRange
      ? patients.filter(p => {
          const created = new Date((p as any).createdAt ?? 0);
          return isWithinInterval(created, { start: dateRange.start, end: dateRange.end });
        }).length
      : patients.length;

  // ── Gráfico: Origem dos Pacientes (sem "Outro") ────────────────────────────
  const patientMap = new Map(patients.map(p => [p.id, p]));

  const knownOrigins = ['Google Ads', 'Instagram', 'Indicação'] as const;
  const originDataFiltered = knownOrigins
    .map(name => ({
      name,
      value: filteredAppointments.filter(a => patientMap.get(a.patientId)?.origin === name).length,
    }))
    .filter(item => item.value > 0);

  const outroCount = filteredAppointments.filter(
    a => patientMap.get(a.patientId)?.origin === 'Outro' || !patientMap.get(a.patientId)?.origin
  ).length;

  // ── Gráfico: Status dos Atendimentos ──────────────────────────────────────
  const statusData = [
    { status: 'Agendado',   count: filteredAppointments.filter(a => a.status === 'agendado').length },
    { status: 'Confirmado', count: filteredAppointments.filter(a => a.status === 'confirmado').length },
    { status: 'Realizado',  count: filteredAppointments.filter(a => a.status === 'realizado').length },
    { status: 'Cancelado',  count: filteredAppointments.filter(a => a.status === 'cancelado').length },
    { status: 'Falta',      count: filteredAppointments.filter(a => a.status === 'falta').length },
  ];

  // ── Gráfico: Consultas por Profissional ────────────────────────────────────
  const byProfessional = professionals
    .map(pro => ({
      name: pro.name.split(' ')[0],
      fullName: pro.name,
      Realizados: filteredAppointments.filter(a => a.professionalId === pro.id && a.status === 'realizado').length,
      Agendados: filteredAppointments.filter(a => a.professionalId === pro.id && ['agendado', 'confirmado'].includes(a.status)).length,
    }))
    .filter(p => p.Realizados + p.Agendados > 0)
    .sort((a, b) => (b.Realizados + b.Agendados) - (a.Realizados + a.Agendados));

  // ── Gráfico: Repasse por Dentista ─────────────────────────────────────────
  const repasseData = (() => {
    const filtered = dateRange
      ? transactions.filter(t =>
          t.professionalId &&
          t.type === 'saida' &&
          isWithinInterval(new Date(t.date), { start: dateRange.start, end: dateRange.end })
        )
      : transactions.filter(t => t.professionalId && t.type === 'saida');

    const byPro: Record<string, number> = {};
    for (const t of filtered) {
      const proId = t.professionalId!;
      byPro[proId] = (byPro[proId] ?? 0) + t.amount;
    }

    return Object.entries(byPro)
      .map(([proId, total]) => {
        const pro = professionals.find(p => p.id === proId);
        return { name: pro?.name.split(' ')[0] ?? 'Dentista', fullName: pro?.name ?? proId, total };
      })
      .sort((a, b) => b.total - a.total);
  })();

  // ── Gráfico: Evolução de Atendimentos (últimos 6 meses) ────────────────────
  const now = new Date();
  const evolutionData = Array.from({ length: 6 }, (_, i) => {
    const ref = subMonths(now, 5 - i);
    const start = startOfMonth(ref);
    const end = endOfMonth(ref);
    return {
      mes: format(ref, 'MMM/yy', { locale: ptBR }),
      realizados: appointments.filter(a =>
        a.status === 'realizado' && isWithinInterval(new Date(a.date), { start, end })
      ).length,
      agendados: appointments.filter(a =>
        ['agendado', 'confirmado'].includes(a.status) && isWithinInterval(new Date(a.date), { start, end })
      ).length,
    };
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho + filtro */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground font-cocon">Visão geral das métricas da clínica</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={datePeriod} onValueChange={(v) => setDatePeriod(v as DatePeriod)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os períodos</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta Semana</SelectItem>
              <SelectItem value="mes">Este Mês</SelectItem>
              <SelectItem value="ano">Este Ano</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {datePeriod === 'personalizado' && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yy", { locale: ptBR }) : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customStartDate} onSelect={setCustomStartDate}
                    initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
              <span className="hidden sm:inline text-sm text-muted-foreground">-</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customEndDate ? format(customEndDate, "dd/MM/yy", { locale: ptBR }) : "Fim"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={customEndDate} onSelect={setCustomEndDate}
                    initialFocus locale={ptBR} className={cn("p-3 pointer-events-auto")} />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </motion.div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <MetricCard title="Total de Atendimentos" value={totalAppointments}       icon={Calendar}  delay={0.1} />
        <MetricCard title="Taxa de Retorno"        value={`${returnRate}%`}      icon={TrendingUp} delay={0.2} />
        <MetricCard title="Faltas/Cancelamentos"   value={canceledOrMissed}      icon={UserCheck}  delay={0.3} />
        <MetricCard title="Confirmados"            value={confirmedAppointments} icon={Clock}      delay={0.4} />
        <MetricCard
          title={isTodos ? "Total Pacientes" : "Novos Pacientes"}
          value={newPatients}
          icon={Users}
          delay={0.5}
        />
      </div>

      {/* Gráficos — linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Origem dos Pacientes */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }}>
          <Card className="h-full">
            <CardHeader className="items-start sm:items-center text-left sm:text-center pb-2">
              <CardTitle>Canal dos Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              {originDataFiltered.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie
                        data={originDataFiltered}
                        cx="50%" cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={90}
                        dataKey="value"
                      >
                        {originDataFiltered.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={ORIGIN_COLORS[index % ORIGIN_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  {outroCount > 0 && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Não identificados (Outro): {outroCount} atendimentos
                    </p>
                  )}
                </>
              ) : (
                <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                  <p className="text-sm">Sem dados de canal identificados</p>
                  {outroCount > 0 && (
                    <p className="text-xs">{outroCount} atendimentos sem canal definido</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Consultas por Profissional */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.55 }}>
          <Card className="h-full">
            <CardHeader className="items-start sm:items-center text-left sm:text-center pb-2">
              <CardTitle>Consultas por Profissional</CardTitle>
            </CardHeader>
            <CardContent>
              {byProfessional.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={byProfessional} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Realizados" fill="hsl(40,45%,65%)" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Agendados"  fill="hsl(180,2%,58%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">
                  Nenhuma consulta no período
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Repasse por Dentista */}
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.58 }}>
        <Card>
          <CardHeader className="items-start sm:items-center text-left sm:text-center pb-2">
            <CardTitle>Repasse por Dentista</CardTitle>
            <p className="text-xs text-muted-foreground">Total de saídas atribuídas por profissional no período</p>
          </CardHeader>
          <CardContent>
            {repasseData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={repasseData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="rounded-xl border border-primary/15 px-3 py-2.5 text-sm"
                          style={{ background: 'var(--card-gradient)', boxShadow: 'var(--card-shadow)' }}>
                          <p className="font-semibold text-foreground">{d.fullName}</p>
                          <p className="text-muted-foreground text-xs mt-1">
                            {Number(d.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="total" name="Repasse" fill="hsl(40,45%,65%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <p className="text-sm">Nenhum repasse registrado no período</p>
                <p className="text-xs">Ao adicionar uma saída com dentista atribuído, ela aparecerá aqui</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Gráficos — linha 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status dos Atendimentos */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.6 }}>
          <Card className="h-full">
            <CardHeader className="items-start sm:items-center text-left sm:text-center pb-2">
              <CardTitle>Status dos Atendimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={statusData} margin={{ left: -20, right: 8 }}>
                  <XAxis dataKey="status" tick={{ fontSize: 11, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {statusData.map((entry) => (
                      <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? 'hsl(40,45%,72%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Evolução de Atendimentos — últimos 6 meses */}
        <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.65 }}>
          <Card className="h-full">
            <CardHeader className="items-start sm:items-center text-left sm:text-center pb-2">
              <CardTitle>Evolução dos Atendimentos</CardTitle>
              <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={evolutionData} margin={{ left: -20, right: 8 }}>
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(40,20%,88%)" strokeOpacity={0.6} />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(180,2%,45%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="realizados" name="Realizados" stroke="hsl(40,45%,60%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(40,45%,60%)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="agendados"  name="Agendados"  stroke="hsl(180,2%,62%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(180,2%,62%)', strokeWidth: 0 }} strokeDasharray="5 3" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
