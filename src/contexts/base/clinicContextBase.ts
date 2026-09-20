import { createContext, useContext } from "react";
import {
  Appointment,
  Professional,
  Transaction,
  Notification,
  Patient,
  Session,
  AppointmentStatus,
  Installment,
  PaymentMethod,
  Holiday,
  TransactionAttachment,
} from "@/types";

export interface ClinicContextType {
  professionals: Professional[];
  appointments: Appointment[];
  transactions: Transaction[];
  notifications: Notification[];
  patients: Patient[];
  sessions: Session[];
  installments: Installment[];
  loading: boolean;
  addAppointment: (appointment: Omit<Appointment, "id" | "createdAt">) => Promise<void>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  updateAppointmentTime: (id: string, date: Date, time: string, duration: number) => Promise<void>;
  updateAppointmentProfessional: (id: string, professionalId: string) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<string>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactionAttachments: (transactionId: string) => Promise<TransactionAttachment[]>;
  addTransactionAttachment: (transactionId: string, file: File) => Promise<TransactionAttachment>;
  deleteTransactionAttachment: (id: string, url: string) => Promise<void>;
  addProfessional: (professional: Omit<Professional, "id">) => Promise<void>;
  updateProfessional: (id: string, data: Partial<Omit<Professional, "id">>) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, "id" | "createdAt">) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addSession: (session: Omit<Session, "id"> & { installmentsCount?: number; firstPaymentDate?: Date; paymentMethod?: PaymentMethod; cardInstallments?: number }) => Promise<void>;
  updateSession: (id: string, session: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  getSessionsByPatientId: (patientId: string) => Session[];
  getTransactionsByPatientId: (patientId: string) => Transaction[];
  linkAppointmentToSession: (sessionId: string, appointmentDate: Date, appointmentTime: string) => Promise<void>;
  getSuggestedSessionsByPatientId: (patientId: string) => Session[];
  updateInstallment: (id: string, data: Partial<Installment>) => Promise<void>;
  myProfessionalId: string | null;
  linkProfessionalToUser: (professionalId: string | null, userId: string) => Promise<void>;
  sendFeedbackRequest: (patientId: string) => Promise<void>;
  clinicSettings: Record<string, string>;
  updateClinicSetting: (key: string, value: string) => Promise<void>;
  sendCancellationNotification: (appointmentId: string) => Promise<void>;
  sendFaltaNotification: (appointmentId: string) => Promise<void>;
  holidays: Holiday[];
  addHoliday: (date: string, name: string, recurring: boolean) => Promise<void>;
  deleteHoliday: (id: string) => Promise<void>;
  isHoliday: (date: Date) => Holiday | undefined;
}

export const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};
