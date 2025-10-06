import { Professional, Appointment, Transaction, Feedback } from '@/types';

export const mockProfessionals: Professional[] = [
  {
    id: '1',
    name: 'Dra. Renata Lyra',
    specialty: 'Dermatologia',
    email: 'renata@clinicalyra.com',
    phone: '(11) 98765-4321',
    averageRating: 4.8,
  },
  {
    id: '2',
    name: 'Dr. Carlos Silva',
    specialty: 'Estética',
    email: 'carlos@clinicalyra.com',
    phone: '(11) 98765-4322',
    averageRating: 4.6,
  },
];

export const mockAppointments: Appointment[] = [
  {
    id: '1',
    patientName: 'Maria Santos',
    professionalId: '1',
    date: new Date(2025, 9, 10),
    time: '09:00',
    status: 'confirmado',
    origin: 'Instagram',
    createdAt: new Date(2025, 9, 5),
  },
  {
    id: '2',
    patientName: 'João Oliveira',
    professionalId: '2',
    date: new Date(2025, 9, 10),
    time: '14:30',
    status: 'agendado',
    origin: 'Google Ads',
    createdAt: new Date(2025, 9, 6),
  },
  {
    id: '3',
    patientName: 'Ana Costa',
    professionalId: '1',
    date: new Date(2025, 9, 8),
    time: '10:00',
    status: 'realizado',
    origin: 'Indicação',
    createdAt: new Date(2025, 8, 30),
  },
];

export const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'entrada',
    description: 'Consulta - Maria Santos',
    amount: 350,
    date: new Date(2025, 9, 8),
    category: 'Consulta',
  },
  {
    id: '2',
    type: 'saida',
    description: 'Material estético',
    amount: 1200,
    date: new Date(2025, 9, 5),
    category: 'Compras',
  },
  {
    id: '3',
    type: 'entrada',
    description: 'Procedimento estético - Ana Costa',
    amount: 800,
    date: new Date(2025, 9, 8),
    category: 'Procedimento',
  },
];

export const mockFeedbacks: Feedback[] = [
  {
    id: '1',
    patientName: 'Maria Santos',
    rating: 5,
    comment: 'Excelente atendimento! Muito profissional e atenciosa.',
    origin: 'Instagram',
    date: new Date(2025, 9, 8),
    professionalId: '1',
  },
  {
    id: '2',
    patientName: 'Pedro Lima',
    rating: 4,
    comment: 'Bom atendimento, ambiente agradável.',
    origin: 'Google Ads',
    date: new Date(2025, 9, 7),
    professionalId: '2',
  },
];
