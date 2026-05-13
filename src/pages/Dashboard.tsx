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

const ORIGIN_COLORS = ['#DBC192', '#9CA0A0', '#F5E6D3', '#C9A876'];
const STATUS_COLOR = '#DBC192';

export default function Dashboard() {
  const { appointments, patients, professionals } = useClinic();
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Visão geral das métricas da clínica</p>
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
        <MetricCard title="Total de Atendimentos" value={totalAppointments} icon={Calendar}  delay={0.1} />
        <MetricCard title="Taxa de Retorno"        value={`${returnRate}%`} icon={TrendingUp} delay={0.2} />
        <MetricCard title="Faltas/Cancelamentos"   value={canceledOrMissed} icon={UserCheck}  delay={0.3} />
        <MetricCard title="Confirmados"            value={confirmedAppointments} icon={Clock} delay={0.4} />
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
              <CardTitle>Origem dos Pacientes</CardTitle>
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
                      <Tooltip />
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
                  <p className="text-sm">Sem dados de origem identificados</p>
                  {outroCount > 0 && (
                    <p className="text-xs">{outroCount} atendimentos sem origem definida</p>
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
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip
                      labelFormatter={(label) => byProfessional.find(p => p.name === label)?.fullName ?? label}
                    />
                    <Bar dataKey="Realizados" fill="#DBC192" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="Agendados"  fill="#9CA0A0" radius={[0, 4, 4, 0]} />
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
                  <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill={STATUS_COLOR} radius={[4, 4, 0, 0]} />
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
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="realizados" name="Realizados" stroke="#DBC192" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="agendados"  name="Agendados"  stroke="#9CA0A0" strokeWidth={2} dot={{ r: 4 }} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
