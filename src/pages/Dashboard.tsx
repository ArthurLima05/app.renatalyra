import { motion } from 'framer-motion';
import { Calendar, TrendingUp, UserCheck, Clock, CalendarIcon } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type DatePeriod = 'hoje' | 'semana' | 'mes' | 'ano' | 'personalizado' | 'todos';

export default function Dashboard() {
  const { appointments, feedbacks, sessions } = useClinic();
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('todos');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();

  const getDateRange = () => {
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
        if (customStartDate && customEndDate) {
          return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
        }
        return null;
      default:
        return null;
    }
  };

  const dateRange = getDateRange();
  const filteredAppointments = dateRange
    ? appointments.filter(a => {
        const appointmentDate = new Date(a.date);
        return isWithinInterval(appointmentDate, { start: dateRange.start, end: dateRange.end });
      })
    : appointments;

  const totalAppointments = filteredAppointments.filter(a => a.status === 'realizado').length;
  const confirmedAppointments = filteredAppointments.filter(a => a.status === 'confirmado').length;
  const canceledOrMissed = filteredAppointments.filter(a => a.status === 'cancelado' || a.status === 'falta').length;
  
  // Calcular taxa de retorno baseado nas sessões
  const totalSessions = sessions.length;
  const returnSessions = sessions.filter(s => s.sessionType === 'retorno').length;
  const returnRate = totalSessions > 0 ? Math.round((returnSessions / totalSessions) * 100) : 0;

  const originData = [
    { name: 'Google Ads', value: filteredAppointments.filter(a => a.origin === 'Google Ads').length },
    { name: 'Instagram', value: filteredAppointments.filter(a => a.origin === 'Instagram').length },
    { name: 'Indicação', value: filteredAppointments.filter(a => a.origin === 'Indicação').length },
    { name: 'Outro', value: filteredAppointments.filter(a => a.origin === 'Outro').length },
  ];

  const statusData = [
    { status: 'Agendado', count: filteredAppointments.filter(a => a.status === 'agendado').length },
    { status: 'Confirmado', count: filteredAppointments.filter(a => a.status === 'confirmado').length },
    { status: 'Realizado', count: filteredAppointments.filter(a => a.status === 'realizado').length },
    { status: 'Cancelado', count: filteredAppointments.filter(a => a.status === 'cancelado').length },
  ];

  const COLORS = ['#DBC192', '#9CA0A0', '#F5E6D3', '#C9A876'];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das métricas da clínica</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Select value={datePeriod} onValueChange={(value) => setDatePeriod(value as DatePeriod)}>
            <SelectTrigger className="w-[180px]">
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
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {customStartDate ? format(customStartDate, "dd/MM/yy", { locale: ptBR }) : "Início"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={customStartDate}
                    onSelect={setCustomStartDate}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
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
                  <CalendarComponent
                    mode="single"
                    selected={customEndDate}
                    onSelect={setCustomEndDate}
                    initialFocus
                    locale={ptBR}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Atendimentos"
          value={totalAppointments}
          icon={Calendar}
          delay={0.1}
        />
        <MetricCard
          title="Taxa de Retorno"
          value={`${returnRate}%`}
          icon={TrendingUp}
          delay={0.2}
        />
        <MetricCard
          title="Faltas/Cancelamentos"
          value={canceledOrMissed}
          icon={UserCheck}
          delay={0.3}
        />
        <MetricCard
          title="Confirmados"
          value={confirmedAppointments}
          icon={Clock}
          delay={0.4}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Origem dos Pacientes</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={originData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {originData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Status dos Atendimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={statusData}>
                  <XAxis dataKey="status" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#DBC192" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
