export type AppointmentStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta' | 'sugerido';
export type SessionType = 'primeira_consulta' | 'consulta_avulsa' | 'retorno';
export type PatientOrigin = 'Google Ads' | 'Instagram' | 'Indicação' | 'Outro';
export type TransactionType = 'entrada' | 'saida';
export type NotificationType = 'cancelamento' | 'falta' | 'agendamento' | 'feedback';
export type PaymentStatus = 'pago' | 'em_aberto';

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  averageRating?: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  date: Date;
  time: string;
  status: AppointmentStatus;
  origin: PatientOrigin;
  notes?: string;
  createdAt: Date;
  sessionId?: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: Date;
  category: string;
}

export interface Feedback {
  id: string;
  patientName: string;
  rating: number;
  comment: string;
  origin: PatientOrigin;
  date: Date;
  professionalId?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  read: boolean;
}

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  origin: PatientOrigin;
  notes?: string;
  createdAt: Date;
}

export interface Session {
  id: string;
  patientId: string;
  date: Date;
  type: string;
  sessionType: SessionType;
  status: AppointmentStatus;
  notes?: string;
  amount: number;
  paymentStatus: PaymentStatus;
  nextAppointment?: Date;
  professionalId?: string;
}
