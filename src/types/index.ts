export type AppointmentStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta';
export type PatientOrigin = 'Google Ads' | 'Instagram' | 'Indicação' | 'Outro';
export type TransactionType = 'entrada' | 'saida';
export type NotificationType = 'cancelamento' | 'falta' | 'agendamento' | 'feedback';

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
  patientName: string;
  professionalId: string;
  date: Date;
  time: string;
  status: AppointmentStatus;
  origin: PatientOrigin;
  notes?: string;
  createdAt: Date;
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
