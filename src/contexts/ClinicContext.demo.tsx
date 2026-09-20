import React, { useState } from "react";
import {
  Appointment,
  Professional,
  Transaction,
  Notification,
  Patient,
  Session,
  AppointmentStatus,
  Installment,
  Holiday,
  TransactionAttachment,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { ClinicContext, ClinicContextType } from "./base/clinicContextBase";
import {
  demoProfessionals,
  demoPatients,
  demoAppointments,
  demoSessions,
  demoTransactions,
  demoNotifications,
  demoInstallments,
  demoHolidays,
  demoClinicSettings,
} from "@/data/demoSeed";

const uid = () => crypto.randomUUID();

// Provider de demonstração: mesma interface do ClinicContext real, mas 100%
// em memória — nenhuma chamada ao Supabase é feita. Edições somem ao recarregar.
export const DemoClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [professionals, setProfessionals] = useState<Professional[]>(demoProfessionals);
  const [appointments, setAppointments] = useState<Appointment[]>(demoAppointments);
  const [transactions, setTransactions] = useState<Transaction[]>(demoTransactions);
  const [notifications, setNotifications] = useState<Notification[]>(demoNotifications);
  const [patients, setPatients] = useState<Patient[]>(demoPatients);
  const [sessions, setSessions] = useState<Session[]>(demoSessions);
  const [installments, setInstallments] = useState<Installment[]>(demoInstallments);
  const [holidays, setHolidays] = useState<Holiday[]>(demoHolidays);
  const [clinicSettings, setClinicSettings] = useState<Record<string, string>>(demoClinicSettings);
  const [attachments, setAttachments] = useState<TransactionAttachment[]>([]);
  const { toast } = useToast();

  const getPatientById = (id: string) => patients.find((p) => p.id === id);
  const getSessionsByPatientId = (patientId: string) => sessions.filter((s) => s.patientId === patientId);
  const getTransactionsByPatientId = (patientId: string) => transactions.filter((t) => t.patientId === patientId);
  const getSuggestedSessionsByPatientId = (patientId: string) =>
    sessions.filter((s) => s.patientId === patientId && s.status === "sugerido");
  const isHoliday = (date: Date): Holiday | undefined => {
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const y = date.getFullYear();
    const fullDate = `${y}-${m}-${dd}`;
    const monthDay = `${m}-${dd}`;
    return holidays.find(h => h.date === fullDate || (h.recurring && h.date.substring(5) === monthDay));
  };

  const addAppointment = async (appointment: Omit<Appointment, "id" | "createdAt">) => {
    const newAppt: Appointment = { ...appointment, id: uid(), createdAt: new Date() };
    setAppointments((prev) => [newAppt, ...prev]);
    toast({ title: "Agendamento adicionado (demonstração)" });
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const updateAppointmentTime = async (id: string, date: Date, time: string, duration: number) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, date, time, duration } : a)));
    toast({ title: "Horário atualizado com sucesso" });
  };

  const updateAppointmentProfessional = async (id: string, professionalId: string) => {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, professionalId } : a)));
    toast({ title: "Dentista atualizado com sucesso" });
  };

  const deleteAppointment = async (id: string) => {
    setAppointments((prev) => prev.filter((a) => a.id !== id));
    toast({ title: "Agendamento excluído com sucesso" });
  };

  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    const id = uid();
    setTransactions((prev) => [{ ...transaction, id }, ...prev]);
    toast({ title: "Transação adicionada com sucesso" });
    return id;
  };

  const deleteTransaction = async (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    toast({ title: "Transação excluída com sucesso" });
  };

  const getTransactionAttachments = async (transactionId: string) =>
    attachments.filter((a) => a.transactionId === transactionId);

  const addTransactionAttachment = async (transactionId: string, file: File): Promise<TransactionAttachment> => {
    const attachment: TransactionAttachment = {
      id: uid(),
      transactionId,
      name: file.name,
      url: URL.createObjectURL(file),
      fileType: file.type,
      fileSize: file.size,
      createdAt: new Date(),
    };
    setAttachments((prev) => [...prev, attachment]);
    return attachment;
  };

  const deleteTransactionAttachment = async (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const addProfessional = async (professional: Omit<Professional, "id">) => {
    setProfessionals((prev) => [...prev, { ...professional, id: uid(), createdAt: new Date() }]);
    toast({ title: "Profissional adicionado (demonstração)" });
  };

  const updateProfessional = async (id: string, data: Partial<Omit<Professional, "id">>) => {
    setProfessionals((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    toast({ title: "Profissional atualizado com sucesso" });
  };

  const deleteProfessional = async (id: string) => {
    setProfessionals((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Profissional excluído" });
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const addPatient = async (patient: Omit<Patient, "id" | "createdAt">) => {
    setPatients((prev) => [{ ...patient, id: uid(), createdAt: new Date() }, ...prev]);
    toast({ title: "Paciente adicionado com sucesso" });
  };

  const updatePatient = async (id: string, patient: Partial<Patient>) => {
    setPatients((prev) => prev.map((p) => (p.id === id ? { ...p, ...patient } : p)));
    toast({ title: "Paciente atualizado com sucesso" });
  };

  const deletePatient = async (id: string) => {
    setPatients((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Paciente excluído com sucesso" });
  };

  const addSession = async (
    session: Omit<Session, "id"> & { installmentsCount?: number; firstPaymentDate?: Date; cardInstallments?: number }
  ) => {
    const id = uid();
    const { installmentsCount, firstPaymentDate, cardInstallments, ...rest } = session;
    setSessions((prev) => [{ ...rest, id }, ...prev]);

    const count = installmentsCount ?? 1;
    if (count > 1) {
      const base = firstPaymentDate ?? session.date;
      const perInstallment = Math.round((session.amount / count) * 100) / 100;
      const newInstallments: Installment[] = Array.from({ length: count }, (_, i) => {
        const predictedDate = new Date(base);
        predictedDate.setMonth(predictedDate.getMonth() + i);
        return {
          id: uid(),
          sessionId: id,
          installmentNumber: i + 1,
          totalInstallments: count,
          amount: perInstallment,
          predictedDate,
          paid: false,
          createdAt: new Date(),
        };
      });
      setInstallments((prev) => [...prev, ...newInstallments]);
    }
    toast({ title: "Lançamento adicionado com sucesso" });
  };

  const updateSession = async (id: string, session: Partial<Session>) => {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, ...session } : s)));
    toast({ title: "Sessão atualizada com sucesso" });
  };

  const deleteSession = async (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setTransactions((prev) => prev.filter((t) => t.sessionId !== id));
    toast({ title: "Sessão excluída com sucesso" });
  };

  const linkAppointmentToSession = async (sessionId: string, appointmentDate: Date) => {
    setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, status: "agendado", date: appointmentDate } : s)));
  };

  const updateInstallment = async (id: string, data: Partial<Installment>) => {
    setInstallments((prev) => prev.map((i) => (i.id === id ? { ...i, ...data } : i)));
    toast({ title: "Parcela atualizada com sucesso" });
  };

  const myProfessionalId: string | null = null;
  const linkProfessionalToUser = async () => {
    toast({ title: "Indisponível na demonstração" });
  };

  const sendFeedbackRequest = async () => {
    toast({ title: "✅ Pedido de avaliação enviado (simulado na demonstração)" });
  };

  const updateClinicSetting = async (key: string, value: string) => {
    setClinicSettings((prev) => ({ ...prev, [key]: value }));
  };

  const sendCancellationNotification = async () => {
    toast({ title: "Mensagem simulada (demonstração)", description: "Nenhum WhatsApp real é enviado na demo." });
  };

  const sendFaltaNotification = async () => {
    toast({ title: "Mensagem simulada (demonstração)", description: "Nenhum WhatsApp real é enviado na demo." });
  };

  const addHoliday = async (date: string, name: string, recurring: boolean) => {
    setHolidays((prev) => [...prev, { id: uid(), date, name, recurring, createdAt: new Date() }]);
    toast({ title: "Feriado adicionado" });
  };

  const deleteHoliday = async (id: string) => {
    setHolidays((prev) => prev.filter((h) => h.id !== id));
    toast({ title: "Feriado removido" });
  };

  const value: ClinicContextType = {
    professionals,
    appointments,
    transactions,
    notifications,
    patients,
    sessions,
    installments,
    loading: false,
    addAppointment,
    updateAppointmentStatus,
    updateAppointmentTime,
    updateAppointmentProfessional,
    deleteAppointment,
    addTransaction,
    deleteTransaction,
    getTransactionAttachments,
    addTransactionAttachment,
    deleteTransactionAttachment,
    addProfessional,
    updateProfessional,
    deleteProfessional,
    markNotificationRead,
    deleteNotification,
    addPatient,
    updatePatient,
    deletePatient,
    addSession,
    updateSession,
    deleteSession,
    getPatientById,
    getSessionsByPatientId,
    getTransactionsByPatientId,
    linkAppointmentToSession,
    getSuggestedSessionsByPatientId,
    updateInstallment,
    myProfessionalId,
    linkProfessionalToUser,
    sendFeedbackRequest,
    clinicSettings,
    updateClinicSetting,
    sendCancellationNotification,
    sendFaltaNotification,
    holidays,
    addHoliday,
    deleteHoliday,
    isHoliday,
  };

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
};
