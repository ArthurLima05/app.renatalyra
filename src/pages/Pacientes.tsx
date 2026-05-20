import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { PatientCardSkeleton, SkeletonGrid } from '@/components/SkeletonCard';
import { useClinic } from '@/contexts/ClinicContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Phone, Calendar } from 'lucide-react';
import { PhoneInput, formatPhoneDisplay } from '@/components/ui/phone-input';
import { PatientOrigin } from '@/types';
import { usePermissionsCtx } from '@/contexts/PermissionsContext';

const Pacientes = () => {
  const navigate = useNavigate();
  const { patients, sessions, addPatient, loading } = useClinic();
  const { canCreate, canView } = usePermissionsCtx();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    birthDate: '',
    cpf: '',
    origin: 'Outro' as PatientOrigin,
    notes: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addPatient({
      ...formData,
      birthDate: formData.birthDate ? new Date(formData.birthDate + 'T12:00:00') : undefined,
    });
    setFormData({
      fullName: '',
      phone: '',
      email: '',
      birthDate: '',
      cpf: '',
      origin: 'Outro',
      notes: '',
    });
    setIsOpen(false);
  };

  const LIMIT = 100;
  const INITIAL_LIMIT = 6;
  const searching = searchTerm.trim().length > 0;

  const filteredPatients = searching
    ? patients
        .filter(p => p.fullName.toLowerCase().includes(searchTerm.toLowerCase()))
        .slice(0, LIMIT)
    : [...patients]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, INITIAL_LIMIT);

  const totalMatch = searching
    ? patients.filter(p => p.fullName.toLowerCase().includes(searchTerm.toLowerCase())).length
    : patients.length;

  const getLastAppointment = (patientId: string) => {
    const patientSessions = sessions.filter(s => s.patientId === patientId && s.status === 'realizado');
    if (patientSessions.length === 0) return null;
    return patientSessions.sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  };

  const getNextAppointment = (patientId: string) => {
    const patientSessions = sessions.filter(s => s.patientId === patientId && (s.status === 'agendado' || s.status === 'confirmado'));
    if (patientSessions.length === 0) return null;
    return patientSessions.sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  };


  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 md:p-8 space-y-6"
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div>
          <h1 className="text-3xl text-foreground">Pacientes</h1>
          <p className="text-muted-foreground mt-1 font-cocon">Gerencie os pacientes da clínica</p>
        </div>

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2" disabled={!canCreate('pacientes')}>
              <Plus className="h-4 w-4" />
              Adicionar Paciente
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl flex flex-col max-h-[90vh]">
            <DialogHeader className="flex-none">
              <DialogTitle>Novo Paciente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 overflow-y-auto pr-1">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Telefone / WhatsApp *</Label>
                <PhoneInput
                  id="phone"
                  value={formData.phone}
                  onChange={(v) => setFormData({ ...formData, phone: v })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">E-mail (opcional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="paciente@email.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="birthDate">Nascimento</Label>
                  <Input
                    id="birthDate"
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="origin">Origem *</Label>
                <Select value={formData.origin} onValueChange={(value: PatientOrigin) => setFormData({ ...formData, origin: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Google Ads">Google Ads</SelectItem>
                    <SelectItem value="Instagram">Instagram</SelectItem>
                    <SelectItem value="Indicação">Indicação</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Observações Iniciais</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Observações sobre o paciente..."
                  rows={2}
                />
              </div>
              <Button type="submit" className="w-full flex-none">Cadastrar Paciente</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {canView('pacientes') && (
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar paciente por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <p className="text-xs text-muted-foreground px-1">
          {searching
            ? `${filteredPatients.length} de ${totalMatch} resultado${totalMatch !== 1 ? 's' : ''} para "${searchTerm}"`
            : `Mostrando os ${INITIAL_LIMIT} mais recentes de ${patients.length} pacientes — busque para encontrar outros`
          }
        </p>
      </div>
      )}

      {!canView('pacientes') && canCreate('pacientes') && (
        <p className="text-sm text-muted-foreground text-center py-6">
          Você tem permissão apenas para cadastrar novos pacientes.
        </p>
      )}

      {canView('pacientes') && loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <SkeletonGrid count={6}><PatientCardSkeleton /></SkeletonGrid>
        </div>
      )}

      {canView('pacientes') && !loading && (
      <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPatients.map((patient, index) => {
          const lastAppointment = getLastAppointment(patient.id);
          const nextAppointment = getNextAppointment(patient.id);

          return (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4, boxShadow: '0 10px 32px -6px hsl(40 25% 45% / 0.24), 0 3px 10px hsl(0 0% 0% / 0.05)' }}
              transition={{ delay: Math.min(index * 0.04, 0.28), duration: 0.25, ease: 'easeOut' }}
            >
              <Card
                className="cursor-pointer min-h-[10rem] flex flex-col transition-colors hover:border-primary/30"
                onClick={() => navigate(`/pacientes/${patient.id}`)}
              >
                <CardHeader className="pb-2 flex-none text-center sm:text-left">
                  <CardTitle className="text-lg leading-tight line-clamp-2 font-cocon tracking-[0.055em]">
                    {patient.fullName}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between text-sm pt-0">
                  <div className="space-y-1.5 flex flex-col items-center sm:items-start">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate text-xs">{formatPhoneDisplay(patient.phone)}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{patient.origin}</Badge>
                  </div>
                  <div className="mt-2 flex justify-center sm:justify-start">
                    {nextAppointment ? (
                      <div className="flex items-center gap-1.5 text-primary">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs font-medium">
                          Próxima: {nextAppointment.date.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ) : lastAppointment ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5 shrink-0" />
                        <span className="text-xs">
                          Última: {lastAppointment.date.toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">Sem consultas</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {filteredPatients.length === 0 && searching && (
        <EmptyState
          title={`Nenhum resultado para "${searchTerm}"`}
          description="Tente buscar por outro nome ou confira a grafia."
        />
      )}
      </>
      )}
    </motion.div>
  );
};

export default Pacientes;
