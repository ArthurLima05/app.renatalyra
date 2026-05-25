export type AppointmentStatus = 'agendado' | 'confirmado' | 'realizado' | 'cancelado' | 'falta' | 'sugerido';
export type SessionStatus = 'sugerido' | 'agendado' | 'realizado';
export type SessionType = 'primeira_consulta' | 'consulta_avulsa' | 'retorno';
export type PatientOrigin = 'Google Ads' | 'Instagram' | 'Indicação' | 'Outro';
export type PatientGender = 'masculino' | 'feminino' | 'outro';
export type MaritalStatus = 'casado' | 'solteiro' | 'divorciado' | 'viuvo';
export type TransactionType = 'entrada' | 'saida';
export type NotificationType = 'cancelamento' | 'falta' | 'agendamento' | 'feedback' | 'lembrete_consulta' | 'lembrete_feedback' | 'lembrete_prontuario' | 'lembrete_pagamento' | 'erro_whatsapp';
export type PaymentStatus = 'pago' | 'em_aberto';
export type PaymentMethod = 'pix' | 'cartao_credito' | 'cartao_debito' | 'dinheiro' | 'boleto' | 'cheque';

export type UserProfile =
  | 'administrador'
  | 'auxiliar_tecnico'
  | 'profissional'
  | 'financeiro'
  | 'gestor_relacionamento'
  | 'recepcionista';

export type AppModule =
  | 'agenda'
  | 'dashboard'
  | 'pacientes'
  | 'financeiro'
  | 'profissionais'
  | 'notificacoes'
  | 'configuracoes'
  | 'funil';

export interface AppUser {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  profile: UserProfile;
  active: boolean;
  createdAt: Date;
}

export interface UserPermission {
  id: string;
  userId: string;
  module: AppModule;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  email: string;
  phone: string;
  createdAt?: Date;
  userId?: string | null;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  date: Date;
  time: string;
  duration: number;
  status: AppointmentStatus;
  notes?: string;
  createdAt: Date;
  sessionId?: string;
  deletedAt?: Date;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  amount: number;
  date: Date;
  category: string;
  patientId?: string;
  sessionId?: string;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  read: boolean;
  patientId?: string;
  appointmentId?: string;
  sessionId?: string;
  installmentId?: string;
}

export interface Patient {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  birthDate?: Date;
  nickname?: string;
  gender?: PatientGender;
  cpf?: string;
  rg?: string;
  maritalStatus?: MaritalStatus;
  education?: string;
  origin: PatientOrigin;
  notes?: string;
  avatarUrl?: string;
  createdAt: Date;
  feedbackGiven?: boolean;
  feedbackSentAt?: Date;
}

export type PhotoCategory = 'antes' | 'durante' | 'depois' | 'outro';

export interface PatientPhoto {
  id: string;
  patientId: string;
  url: string;
  caption?: string;
  category: PhotoCategory;
  createdAt: Date;
}

export interface Session {
  id: string;
  patientId: string;
  date: Date;
  procedure: string;
  sessionType: SessionType;
  status: SessionStatus;
  notes?: string;
  amount: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  nextAppointment?: Date;
  professionalId?: string;
}

export type AnamneseQuestionType = 'descritivo' | 'sim_nao';

export interface AnamneseQuestion {
  id: string;
  question: string;
  sequence: number;
  type: AnamneseQuestionType;
  active: boolean;
  createdAt: Date;
}

export interface AnamneseAnswerRecord {
  id: string;
  responseId: string;
  questionId?: string;
  questionText: string;
  questionType: AnamneseQuestionType;
  questionSequence: number;
  answerBool?: boolean | null;
  answerText?: string;
}

export type AnamneseStatus = 'sent' | 'completed';

export interface AnamneseResponse {
  id: string;
  patientId: string;
  status: AnamneseStatus;
  token?: string;
  code?: string;
  answers: AnamneseAnswerRecord[];
  completedAt?: Date;
  signedName?: string;
  signedAt?: Date;
  createdAt: Date;
  // Metadados legais (Lei 14.063/2020 + LGPD)
  ipAddress?: string;
  userAgent?: string;
  verifiedPhone?: string;
}

export type OdontogramStatus = 'a_realizar' | 'executado' | 'existente';
export type Dentition = 'permanente' | 'decidua';

export interface OdontogramProcedure {
  id: string;
  patientId: string;
  toothNumbers: string[];
  toothFaces: string[];
  dentition: Dentition;
  procedureDescription: string;
  status: OdontogramStatus;
  professionalId: string;
  executionDate: Date;
  nextAppointmentDate?: Date;
  notes?: string;
  createdAt: Date;
}

export type LeadStage =
  | 'novo_lead'
  | 'em_contato'
  | 'consulta_agendada'
  | 'avaliacao_realizada'
  | 'proposta_enviada'
  | 'convertido'
  | 'perdido';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email?: string;
  origin: PatientOrigin;
  treatmentInterest?: string;
  stage: LeadStage;
  estimatedValue?: number;
  notes?: string;
  patientId?: string;
  lostReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PatientDocument {
  id: string;
  patientId: string;
  name: string;
  url: string;
  fileType?: string;
  fileSize?: number;
  createdAt: Date;
}

export interface ReturnAlert {
  id: string;
  patientId: string;
  returnDate: Date;
  notes?: string;
  whatsappSent: boolean;
  whatsappSentAt?: Date;
  createdAt: Date;
}

export interface Installment {
  id: string;
  transactionId?: string;
  sessionId?: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  predictedDate: Date;
  paid: boolean;
  paidDate?: Date;
  createdAt: Date;
}
