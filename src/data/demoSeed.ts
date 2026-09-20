// Dados 100% fictícios para o ambiente de demonstração do TechClin.
// Nenhum nome, telefone, e-mail ou valor aqui corresponde a paciente real.
import {
  Professional,
  Patient,
  Appointment,
  Session,
  Transaction,
  Notification,
  Installment,
  Holiday,
  Lead,
  AppUser,
  UserPermission,
} from '@/types';

const today = new Date();
const d = (offsetDays: number, hour = 9, minute = 0) => {
  const dt = new Date(today);
  dt.setDate(dt.getDate() + offsetDays);
  dt.setHours(hour, minute, 0, 0);
  return dt;
};

export const demoProfessionals: Professional[] = [
  { id: 'demo-prof-1', name: 'Dra. Fernanda Albuquerque', specialty: 'Ortodontia', email: 'fernanda.albuquerque@clinicademo.com.br', phone: '(11) 91234-5601', createdAt: d(-400) },
  { id: 'demo-prof-2', name: 'Dr. Rodrigo Marins', specialty: 'Implantodontia', email: 'rodrigo.marins@clinicademo.com.br', phone: '(11) 91234-5602', createdAt: d(-380) },
  { id: 'demo-prof-3', name: 'Dra. Beatriz Nakamura', specialty: 'Odontopediatria', email: 'beatriz.nakamura@clinicademo.com.br', phone: '(11) 91234-5603', createdAt: d(-320) },
];

export const demoPatients: Patient[] = [
  { id: 'demo-pat-1', fullName: 'Larissa Andrade Souza', phone: '(11) 98111-2201', email: 'larissa.souza@exemplo.com', origin: 'Instagram', cpf: '111.111.111-11', gender: 'feminino', createdAt: d(-300), notes: 'Prefere horários no início da manhã.' },
  { id: 'demo-pat-2', fullName: 'Gustavo Pereira Lima', phone: '(11) 98111-2202', email: 'gustavo.lima@exemplo.com', origin: 'Google Ads', cpf: '222.222.222-22', gender: 'masculino', createdAt: d(-260) },
  { id: 'demo-pat-3', fullName: 'Camila Rocha Freitas', phone: '(11) 98111-2203', email: 'camila.freitas@exemplo.com', origin: 'Indicação', cpf: '333.333.333-33', gender: 'feminino', createdAt: d(-240), notes: 'Indicada por Larissa Andrade Souza.' },
  { id: 'demo-pat-4', fullName: 'Thiago Martins Costa', phone: '(11) 98111-2204', email: 'thiago.costa@exemplo.com', origin: 'Outro', cpf: '444.444.444-44', gender: 'masculino', createdAt: d(-210) },
  { id: 'demo-pat-5', fullName: 'Juliana Barbosa Nunes', phone: '(11) 98111-2205', email: 'juliana.nunes@exemplo.com', origin: 'Instagram', cpf: '555.555.555-55', gender: 'feminino', createdAt: d(-180) },
  { id: 'demo-pat-6', fullName: 'Rafael Cardoso Teixeira', phone: '(11) 98111-2206', email: 'rafael.teixeira@exemplo.com', origin: 'Google Ads', cpf: '666.666.666-66', gender: 'masculino', createdAt: d(-150) },
  { id: 'demo-pat-7', fullName: 'Beatriz Fonseca Ramos', phone: '(11) 98111-2207', email: 'beatriz.ramos@exemplo.com', origin: 'Indicação', cpf: '777.777.777-77', gender: 'feminino', createdAt: d(-120) },
  { id: 'demo-pat-8', fullName: 'Eduardo Vieira Santos', phone: '(11) 98111-2208', email: 'eduardo.santos@exemplo.com', origin: 'Outro', cpf: '888.888.888-88', gender: 'masculino', createdAt: d(-90) },
  { id: 'demo-pat-9', fullName: 'Patrícia Gomes Lourenço', phone: '(11) 98111-2209', email: 'patricia.lourenco@exemplo.com', origin: 'Instagram', cpf: '999.999.999-99', gender: 'feminino', createdAt: d(-60) },
  { id: 'demo-pat-10', fullName: 'Marcelo Henrique Duarte', phone: '(11) 98111-2210', email: 'marcelo.duarte@exemplo.com', origin: 'Google Ads', cpf: '101.010.101-01', gender: 'masculino', createdAt: d(-30) },
];

const patientName = (id: string) => demoPatients.find(p => p.id === id)?.fullName ?? '';

export const demoAppointments: Appointment[] = [
  { id: 'demo-appt-1', patientId: 'demo-pat-1', patientName: patientName('demo-pat-1'), professionalId: 'demo-prof-1', date: d(0), time: '09:00', duration: 1, status: 'confirmado', createdAt: d(-5) },
  { id: 'demo-appt-2', patientId: 'demo-pat-2', patientName: patientName('demo-pat-2'), professionalId: 'demo-prof-2', date: d(0), time: '14:30', duration: 1, status: 'agendado', createdAt: d(-4) },
  { id: 'demo-appt-3', patientId: 'demo-pat-3', patientName: patientName('demo-pat-3'), professionalId: 'demo-prof-3', date: d(1), time: '10:00', duration: 1, status: 'agendado', createdAt: d(-3) },
  { id: 'demo-appt-4', patientId: 'demo-pat-4', patientName: patientName('demo-pat-4'), professionalId: 'demo-prof-1', date: d(2), time: '11:00', duration: 1, status: 'agendado', createdAt: d(-2) },
  { id: 'demo-appt-5', patientId: 'demo-pat-5', patientName: patientName('demo-pat-5'), professionalId: 'demo-prof-2', date: d(3), time: '15:00', duration: 2, status: 'sugerido', createdAt: d(-1) },
  { id: 'demo-appt-6', patientId: 'demo-pat-6', patientName: patientName('demo-pat-6'), professionalId: 'demo-prof-3', date: d(-2), time: '09:30', duration: 1, status: 'realizado', createdAt: d(-8) },
  { id: 'demo-appt-7', patientId: 'demo-pat-7', patientName: patientName('demo-pat-7'), professionalId: 'demo-prof-1', date: d(-5), time: '14:00', duration: 1, status: 'falta', createdAt: d(-10) },
  { id: 'demo-appt-8', patientId: 'demo-pat-1', patientName: patientName('demo-pat-1'), professionalId: 'demo-prof-1', date: d(-10), time: '09:00', duration: 1, status: 'realizado', createdAt: d(-15) },
  { id: 'demo-appt-9', patientId: 'demo-pat-8', patientName: patientName('demo-pat-8'), professionalId: 'demo-prof-2', date: d(-7), time: '16:00', duration: 1, status: 'cancelado', createdAt: d(-12) },
  { id: 'demo-appt-10', patientId: 'demo-pat-9', patientName: patientName('demo-pat-9'), professionalId: 'demo-prof-3', date: d(5), time: '10:30', duration: 1, status: 'agendado', createdAt: d(0) },
];

export const demoSessions: Session[] = [
  { id: 'demo-sess-1', patientId: 'demo-pat-1', date: d(-10), procedure: 'Manutenção ortodôntica', sessionType: 'retorno', status: 'realizado', amount: 280, paymentStatus: 'pago', professionalId: 'demo-prof-1', notes: 'Troca de elásticos, evolução dentro do esperado.' },
  { id: 'demo-sess-2', patientId: 'demo-pat-6', date: d(-2), procedure: 'Consulta odontopediátrica', sessionType: 'primeira_consulta', status: 'realizado', amount: 220, paymentStatus: 'pago', professionalId: 'demo-prof-3' },
  { id: 'demo-sess-3', patientId: 'demo-pat-2', date: d(0), procedure: 'Avaliação para implante', sessionType: 'primeira_consulta', status: 'agendado', amount: 350, paymentStatus: 'em_aberto', professionalId: 'demo-prof-2' },
  { id: 'demo-sess-4', patientId: 'demo-pat-4', date: d(2), procedure: 'Instalação de aparelho', sessionType: 'primeira_consulta', status: 'agendado', amount: 1800, paymentStatus: 'em_aberto', professionalId: 'demo-prof-1' },
  { id: 'demo-sess-5', patientId: 'demo-pat-3', date: d(-40), procedure: 'Clareamento dental', sessionType: 'consulta_avulsa', status: 'realizado', amount: 650, paymentStatus: 'pago', professionalId: 'demo-prof-1' },
];

export const demoTransactions: Transaction[] = [
  { id: 'demo-trans-1', type: 'entrada', description: 'Manutenção ortodôntica - Larissa Andrade Souza', amount: 280, date: d(-10), category: 'Consulta', patientId: 'demo-pat-1', sessionId: 'demo-sess-1' },
  { id: 'demo-trans-2', type: 'entrada', description: 'Consulta odontopediátrica - Rafael Cardoso Teixeira', amount: 220, date: d(-2), category: 'Consulta', patientId: 'demo-pat-6', sessionId: 'demo-sess-2' },
  { id: 'demo-trans-3', type: 'entrada', description: 'Clareamento dental - Camila Rocha Freitas', amount: 650, date: d(-40), category: 'Procedimento', patientId: 'demo-pat-3', sessionId: 'demo-sess-5' },
  { id: 'demo-trans-4', type: 'saida', description: 'Compra de materiais odontológicos', amount: 1450, date: d(-15), category: 'Materiais' },
  { id: 'demo-trans-5', type: 'saida', description: 'Manutenção de equipamentos', amount: 620, date: d(-20), category: 'Manutenção' },
  { id: 'demo-trans-6', type: 'entrada', description: 'Parcela 1/6 - Instalação de aparelho - Thiago Martins Costa', amount: 300, date: d(2), category: 'Sessões', patientId: 'demo-pat-4', sessionId: 'demo-sess-4' },
];

export const demoInstallments: Installment[] = [
  { id: 'demo-inst-1', sessionId: 'demo-sess-4', installmentNumber: 1, totalInstallments: 6, amount: 300, predictedDate: d(2), paid: false, createdAt: d(-1) },
  { id: 'demo-inst-2', sessionId: 'demo-sess-4', installmentNumber: 2, totalInstallments: 6, amount: 300, predictedDate: d(32), paid: false, createdAt: d(-1) },
  { id: 'demo-inst-3', sessionId: 'demo-sess-4', installmentNumber: 3, totalInstallments: 6, amount: 300, predictedDate: d(62), paid: false, createdAt: d(-1) },
];

export const demoNotifications: Notification[] = [
  { id: 'demo-notif-1', type: 'agendamento', title: 'Novo agendamento', message: `${patientName('demo-pat-10')} agendou consulta para ${d(5).toLocaleDateString('pt-BR')}`, date: d(0), read: false, patientId: 'demo-pat-10', appointmentId: 'demo-appt-10' },
  { id: 'demo-notif-2', type: 'falta', title: 'Falta registrada', message: `${patientName('demo-pat-7')} - ${d(-5).toLocaleDateString('pt-BR')} às 14:00`, date: d(-5), read: true, patientId: 'demo-pat-7', appointmentId: 'demo-appt-7' },
  { id: 'demo-notif-3', type: 'cancelamento', title: 'Consulta cancelada', message: `${patientName('demo-pat-8')} - ${d(-7).toLocaleDateString('pt-BR')} às 16:00`, date: d(-7), read: true, patientId: 'demo-pat-8', appointmentId: 'demo-appt-9' },
  { id: 'demo-notif-4', type: 'lembrete_pagamento', title: 'Pagamento Vencido', message: `Parcela 1/6 de ${patientName('demo-pat-4')} vencida - R$ 300,00`, date: d(0), read: false, patientId: 'demo-pat-4', installmentId: 'demo-inst-1' },
];

export const demoHolidays: Holiday[] = [
  { id: 'demo-hol-1', date: '2026-01-01', name: 'Confraternização Universal', recurring: true, createdAt: d(-400) },
  { id: 'demo-hol-2', date: '2026-12-25', name: 'Natal', recurring: true, createdAt: d(-400) },
];

export const demoClinicSettings: Record<string, string> = {
  msg_appointment_cancellation: 'Olá, {{nome_paciente}}! Sua consulta do dia *{{data}}* foi cancelada. Entre em contato para reagendar. 📞',
  msg_falta_notification: 'Olá, {{nome_paciente}}! 😊 Notamos que você não pôde comparecer à sua consulta do dia *{{data}}* às *{{hora}}*. Caso queira reagendar, é só responder *REAGENDAR*. 📅',
  msg_return_alert: 'Olá, {{nome_paciente}}! Aqui é a clínica demonstração TechClin. Que tal agendar um retorno?',
};

export const demoLeads: Lead[] = [
  { id: 'demo-lead-1', name: 'Vanessa Moura Alencar', phone: '(11) 98222-3301', email: 'vanessa.alencar@exemplo.com', origin: 'Instagram', treatmentInterest: 'Clareamento dental', stage: 'novo_lead', estimatedValue: 650, createdAt: d(-3), updatedAt: d(-3) },
  { id: 'demo-lead-2', name: 'Bruno Salles Pinto', phone: '(11) 98222-3302', origin: 'Google Ads', treatmentInterest: 'Implante', stage: 'em_contato', estimatedValue: 3200, createdAt: d(-6), updatedAt: d(-4) },
  { id: 'demo-lead-3', name: 'Isabela Cunha Prado', phone: '(11) 98222-3303', origin: 'Indicação', treatmentInterest: 'Ortodontia', stage: 'consulta_agendada', estimatedValue: 1800, createdAt: d(-9), updatedAt: d(-2) },
];

export const demoAppUsers: AppUser[] = [
  { id: 'demo-user-0001', email: 'demo@techclin.com.br', fullName: 'Usuário Demonstração', profile: 'administrador', active: true, createdAt: d(-400) },
];

export const demoUserPermissions: UserPermission[] = [];
