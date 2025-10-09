import { motion } from 'framer-motion';
import { Calendar, TrendingUp, UserCheck, Clock } from 'lucide-react';
import { MetricCard } from '@/components/MetricCard';
import { useClinic } from '@/contexts/ClinicContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

export default function Dashboard() {
  const { appointments, feedbacks } = useClinic();

  const totalAppointments = appointments.filter(a => a.status === 'realizado').length;
  const confirmedAppointments = appointments.filter(a => a.status === 'confirmado' || a.status === 'realizado').length;
  const canceledOrMissed = appointments.filter(a => a.status === 'cancelado' || a.status === 'falta').length;
  const returnRate = appointments.filter(a => a.status === 'realizado').length > 0 
    ? Math.round((appointments.filter(a => a.status === 'realizado').length / totalAppointments) * 100)
    : 0;

  const originData = [
    { name: 'Google Ads', value: appointments.filter(a => a.origin === 'Google Ads').length },
    { name: 'Instagram', value: appointments.filter(a => a.origin === 'Instagram').length },
    { name: 'Indicação', value: appointments.filter(a => a.origin === 'Indicação').length },
  ];

  const statusData = [
    { status: 'Agendado', count: appointments.filter(a => a.status === 'agendado').length },
    { status: 'Confirmado', count: appointments.filter(a => a.status === 'confirmado').length },
    { status: 'Realizado', count: appointments.filter(a => a.status === 'realizado').length },
    { status: 'Cancelado', count: appointments.filter(a => a.status === 'cancelado').length },
  ];

  const COLORS = ['#DBC192', '#9CA0A0', '#F5E6D3', '#C9A876'];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral das métricas da clínica</p>
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
          trend="Este mês"
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
