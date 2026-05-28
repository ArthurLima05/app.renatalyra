import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import {
  Appointment,
  Professional,
  Transaction,
  Notification,
  Patient,
  Session,
  SessionStatus,
  AppointmentStatus,
  Installment,
  PaymentMethod,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClinicContextType {
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
  addTransaction: (transaction: Omit<Transaction, "id">) => Promise<void>;
  updateTransactionComprovante: (id: string, comprovanteUrl: string | null) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
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
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error("useClinic must be used within ClinicProvider");
  return context;
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [clinicSettings, setClinicSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const myProfessionalIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const isCheckingNotifications = useRef(false);

  useEffect(() => {
    loadAllData();

    const professionalsChannel = supabase
      .channel("professionals-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "professionals" }, (payload) => {
        const newPro = {
          ...payload.new,
          createdAt: new Date(payload.new.created_at),
          userId: (payload.new as any).user_id ?? null,
        } as Professional;
        setProfessionals((prev) => [...prev, newPro]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "professionals" }, (payload) => {
        const updated = {
          ...payload.new,
          createdAt: new Date(payload.new.created_at),
          userId: (payload.new as any).user_id ?? null,
        } as Professional;
        setProfessionals((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "professionals" }, (payload) => {
        setProfessionals((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();

    const patientsChannel = supabase
      .channel("patients-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "patients" }, (payload) => {
        const raw: any = payload.new;
        const newPatient: Patient = {
          ...raw,
          fullName: raw.full_name,
          birthDate: raw.birth_date ? new Date(raw.birth_date + 'T12:00:00') : undefined,
          nickname: raw.nickname ?? undefined,
          gender: raw.gender ?? undefined,
          rg: raw.rg ?? undefined,
          maritalStatus: raw.marital_status ?? undefined,
          education: raw.education ?? undefined,
          avatarUrl: raw.avatar_url ?? undefined,
          createdAt: new Date(raw.created_at),
          responsible: raw.responsible ?? undefined,
          responsibleCpf: raw.responsible_cpf ?? undefined,
          address: raw.address ?? undefined,
          profession: raw.profession ?? undefined,
        };
        setPatients((prev) => [...prev, newPatient]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "patients" }, (payload) => {
        const raw: any = payload.new;
        const updated: Patient = {
          ...raw,
          fullName: raw.full_name,
          birthDate: raw.birth_date ? new Date(raw.birth_date + 'T12:00:00') : undefined,
          nickname: raw.nickname ?? undefined,
          gender: raw.gender ?? undefined,
          rg: raw.rg ?? undefined,
          maritalStatus: raw.marital_status ?? undefined,
          education: raw.education ?? undefined,
          avatarUrl: raw.avatar_url ?? undefined,
          createdAt: new Date(raw.created_at),
          feedbackGiven: raw.feedback_given ?? false,
          feedbackSentAt: raw.feedback_sent_at ? new Date(raw.feedback_sent_at) : undefined,
          responsible: raw.responsible ?? undefined,
          responsibleCpf: raw.responsible_cpf ?? undefined,
          address: raw.address ?? undefined,
          profession: raw.profession ?? undefined,
        };
        setPatients((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "patients" }, (payload) => {
        setPatients((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();

    const appointmentsChannel = supabase
      .channel("appointments-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "appointments" }, () => {
        loadAppointments();
      })
      .subscribe();

    const sessionsChannel = supabase
      .channel("sessions-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "sessions" }, (payload) => {
        const newSession: Session = {
          id: payload.new.id,
          patientId: payload.new.patient_id,
          date: new Date(payload.new.date),
          procedure: payload.new.type,
          sessionType: payload.new.session_type,
          status: payload.new.status as SessionStatus,
          amount: Number(payload.new.amount),
          paymentStatus: payload.new.payment_status,
          paymentMethod: (payload.new as any).payment_method || undefined,
          installmentCount: (payload.new as any).installment_count || undefined,
          nextAppointment: payload.new.next_appointment ? new Date(payload.new.next_appointment) : undefined,
          professionalId: payload.new.professional_id || undefined,
          notes: payload.new.notes || undefined,
        };
        setSessions((prev) => [...prev, newSession]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "sessions" }, (payload) => {
        const updated: Session = {
          id: payload.new.id,
          patientId: payload.new.patient_id,
          date: new Date(payload.new.date),
          procedure: payload.new.type,
          sessionType: payload.new.session_type,
          status: payload.new.status as SessionStatus,
          amount: Number(payload.new.amount),
          paymentStatus: payload.new.payment_status,
          paymentMethod: (payload.new as any).payment_method || undefined,
          installmentCount: (payload.new as any).installment_count || undefined,
          nextAppointment: payload.new.next_appointment ? new Date(payload.new.next_appointment) : undefined,
          professionalId: payload.new.professional_id || undefined,
          notes: payload.new.notes || undefined,
        };
        setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "sessions" }, (payload) => {
        setSessions((prev) => prev.filter((s) => s.id !== payload.old.id));
      })
      .subscribe();

    const transactionsChannel = supabase
      .channel("transactions-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions" }, (payload) => {
        const newTrans = {
          ...payload.new,
          date: new Date(payload.new.date),
          amount: Number(payload.new.amount),
          patientId: payload.new.patient_id || undefined,
          sessionId: payload.new.session_id || undefined,
          comprovanteUrl: (payload.new as any).comprovante_url || undefined,
          paymentMethod: (payload.new as any).payment_method || undefined,
          installmentCount: (payload.new as any).installment_count || undefined,
        } as Transaction;
        setTransactions((prev) => [newTrans, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "transactions" }, (payload) => {
        const updated = {
          ...payload.new,
          date: new Date(payload.new.date),
          amount: Number(payload.new.amount),
          patientId: payload.new.patient_id || undefined,
          sessionId: payload.new.session_id || undefined,
          comprovanteUrl: (payload.new as any).comprovante_url || undefined,
        } as Transaction;
        setTransactions((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "transactions" }, (payload) => {
        setTransactions((prev) => prev.filter((t) => t.id !== payload.old.id));
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel("notifications-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, (payload) => {
        const profId = myProfessionalIdRef.current;
        const notifProfId = (payload.new as any).professional_id ?? null;

        if (profId && notifProfId && notifProfId !== profId) return;

        const newNotif = {
          ...payload.new,
          type: payload.new.type,
          date: new Date(payload.new.date),
        } as Notification;
        setNotifications((prev) => [newNotif, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, (payload) => {
        const profId = myProfessionalIdRef.current;
        const notifProfId = (payload.new as any).professional_id ?? null;

        if (profId && notifProfId && notifProfId !== profId) {
          setNotifications((prev) => prev.filter((n) => n.id !== payload.new.id));
          return;
        }

        const updated = {
          ...payload.new,
          type: payload.new.type,
          date: new Date(payload.new.date),
        } as Notification;
        setNotifications((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "notifications" }, (payload) => {
        setNotifications((prev) => prev.filter((n) => n.id !== payload.old.id));
      })
      .subscribe();

    const installmentsChannel = supabase
      .channel("installments-changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "installments" }, (payload) => {
        const newInstallment: Installment = {
          id: payload.new.id,
          transactionId: payload.new.transaction_id || undefined,
          sessionId: payload.new.session_id || undefined,
          installmentNumber: payload.new.installment_number,
          totalInstallments: payload.new.total_installments,
          amount: Number(payload.new.amount),
          predictedDate: new Date(payload.new.predicted_date),
          paid: payload.new.paid,
          paidDate: payload.new.paid_date ? new Date(payload.new.paid_date) : undefined,
          createdAt: new Date(payload.new.created_at),
        };
        setInstallments((prev) => {
          if (prev.some((i) => i.id === newInstallment.id)) return prev;
          return [...prev, newInstallment];
        });
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "installments" }, (payload) => {
        const updated: Installment = {
          id: payload.new.id,
          transactionId: payload.new.transaction_id || undefined,
          sessionId: payload.new.session_id || undefined,
          installmentNumber: payload.new.installment_number,
          totalInstallments: payload.new.total_installments,
          amount: Number(payload.new.amount),
          predictedDate: new Date(payload.new.predicted_date),
          paid: payload.new.paid,
          paidDate: payload.new.paid_date ? new Date(payload.new.paid_date) : undefined,
          createdAt: new Date(payload.new.created_at),
        };
        setInstallments((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "installments" }, (payload) => {
        setInstallments((prev) => prev.filter((i) => i.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(professionalsChannel);
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(installmentsChannel);
    };
  }, []);

  const loadClinicSettings = async () => {
    const { data, error } = await (supabase as any).from("clinic_settings").select("key, value");
    if (error) { console.error("Error loading settings:", error); return; }
    const map: Record<string, string> = {};
    for (const row of data || []) map[row.key] = row.value;
    setClinicSettings(map);
  };

  const updateClinicSetting = async (key: string, value: string) => {
    const { error } = await (supabase as any)
      .from("clinic_settings")
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) {
      toast({ title: "Erro ao salvar configuração", description: error.message, variant: "destructive" });
      throw error;
    }
    setClinicSettings(prev => ({ ...prev, [key]: value }));
  };

  const loadAllData = async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: prof } = await (supabase as any)
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      const profId = prof?.id ?? null;
      myProfessionalIdRef.current = profId;
      setMyProfessionalId(profId);
    }

    await Promise.all([
      loadProfessionals(),
      loadPatients(),
      loadAppointments(),
      loadSessions(),
      loadTransactions(),
      loadNotifications(),
      loadInstallments(),
      loadClinicSettings(),
    ]);
    setLoading(false);
  };

  const loadProfessionals = async () => {
    const { data, error } = await supabase.from("professionals").select("*");
    if (error) {
      console.error("Error loading professionals:", error);
      return;
    }
    setProfessionals(
      (data || []).map((p) => ({
        ...p,
        createdAt: new Date(p.created_at),
        userId: (p as any).user_id ?? null,
      })),
    );
  };

  const loadPatients = async () => {
    let patientIdFilter: string[] | null = null;
    if (myProfessionalIdRef.current) {
      const { data: apptData } = await (supabase as any)
        .from('appointments')
        .select('patient_id')
        .eq('professional_id', myProfessionalIdRef.current);
      patientIdFilter = [...new Set<string>((apptData ?? []).map((a: any) => a.patient_id))];
      if (patientIdFilter.length === 0) {
        setPatients([]);
        return;
      }
    }

    const PAGE = 1000;
    let from = 0;
    let allData: any[] = [];

    while (true) {
      let q = (supabase as any)
        .from("patients")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);

      if (patientIdFilter) q = q.in('id', patientIdFilter);

      const { data, error } = await q;

      if (error) { console.error("Error loading patients:", error); break; }
      if (!data || data.length === 0) break;

      allData = allData.concat(data);
      if (data.length < PAGE) break;
      from += PAGE;
    }

    setPatients(
      allData.map((p: any) => ({
        ...p,
        fullName: p.full_name,
        birthDate: p.birth_date ? new Date(p.birth_date + 'T12:00:00') : undefined,
        feedbackGiven: (p as any).feedback_given ?? false,
        feedbackSentAt: (p as any).feedback_sent_at ? new Date((p as any).feedback_sent_at) : undefined,
        nickname: p.nickname ?? undefined,
        gender: p.gender ?? undefined,
        rg: p.rg ?? undefined,
        maritalStatus: p.marital_status ?? undefined,
        education: p.education ?? undefined,
        avatarUrl: p.avatar_url ?? undefined,
        createdAt: new Date(p.created_at),
        responsible: p.responsible ?? undefined,
        responsibleCpf: p.responsible_cpf ?? undefined,
        address: p.address ?? undefined,
        profession: p.profession ?? undefined,
      })),
    );
  };

  const loadAppointments = async () => {
    let q = (supabase as any)
      .from("appointments")
      .select("*, patients(full_name)")
      .is("deleted_at", null)
      .order("date", { ascending: false });

    if (myProfessionalIdRef.current) {
      q = q.eq("professional_id", myProfessionalIdRef.current);
    }

    const { data, error } = await q;

    if (error) {
      console.error("Error loading appointments:", error);
      return;
    }

    setAppointments(
      (data || []).map((a) => ({
        id: a.id,
        patientId: a.patient_id,
        patientName: a.patients?.full_name || "",
        professionalId: a.professional_id,
        date: new Date(a.date.substring(0, 10) + 'T12:00:00'),
        time: a.time,
        duration: a.duration ?? 1,
        status: a.status as AppointmentStatus,
        notes: a.notes || undefined,
        createdAt: new Date(a.created_at),
        sessionId: a.session_id || undefined,
        deletedAt: (a as any).deleted_at ? new Date((a as any).deleted_at) : undefined,
      })),
    );
  };

  const loadSessions = async () => {
    const { data, error } = await supabase.from("sessions").select("*").order("date", { ascending: false });
    if (error) {
      console.error("Error loading sessions:", error);
      return;
    }
    setSessions(
      (data || []).map((s) => ({
        id: s.id,
        patientId: s.patient_id,
        date: new Date(s.date),
        procedure: s.type,
        sessionType: s.session_type as any,
        status: s.status as SessionStatus,
        notes: s.notes || undefined,
        amount: Number(s.amount),
        paymentStatus: s.payment_status as any,
        paymentMethod: (s as any).payment_method || undefined,
        installmentCount: (s as any).installment_count || undefined,
        nextAppointment: s.next_appointment ? new Date(s.next_appointment) : undefined,
        professionalId: s.professional_id || undefined,
      })),
    );
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false });
    if (error) {
      console.error("Error loading transactions:", error);
      return;
    }
    setTransactions(
      (data || []).map((t) => ({
        ...t,
        date: new Date(t.date),
        amount: Number(t.amount),
        patientId: t.patient_id || undefined,
        sessionId: t.session_id || undefined,
        comprovanteUrl: (t as any).comprovante_url || undefined,
        paymentMethod: (t as any).payment_method || undefined,
        installmentCount: (t as any).installment_count || undefined,
      })),
    );
  };

  const loadNotifications = async () => {
    let q = (supabase as any).from("notifications").select("*").order("date", { ascending: false });

    if (myProfessionalIdRef.current) {
      q = q.or(`professional_id.eq.${myProfessionalIdRef.current},professional_id.is.null`);
    }

    const { data, error } = await q;
    if (error) {
      console.error("Error loading notifications:", error);
      return;
    }
    setNotifications(
      (data || []).map((n) => ({
        ...n,
        type: n.type as any,
        date: new Date(n.date),
        patientId: n.patient_id || undefined,
        appointmentId: n.appointment_id || undefined,
        sessionId: n.session_id || undefined,
        installmentId: n.installment_id || undefined,
      })),
    );
  };

  const loadInstallments = async () => {
    const { data, error } = await supabase
      .from("installments")
      .select("*")
      .order("predicted_date", { ascending: true });
    if (error) {
      console.error("Error loading installments:", error);
      return;
    }
    setInstallments(
      (data || []).map((i) => ({
        id: i.id,
        transactionId: i.transaction_id || undefined,
        sessionId: i.session_id || undefined,
        installmentNumber: i.installment_number,
        totalInstallments: i.total_installments,
        amount: Number(i.amount),
        predictedDate: new Date(i.predicted_date),
        paid: i.paid,
        paidDate: i.paid_date ? new Date(i.paid_date) : undefined,
        createdAt: new Date(i.created_at),
      })),
    );
  };

  const addAppointment = async (appointment: Omit<Appointment, "id" | "createdAt">) => {
    const patient = patients.find((p) => p.id === appointment.patientId);
    const { error } = await supabase
      .from("appointments")
      .insert({
        patient_id: appointment.patientId,
        professional_id: appointment.professionalId,
        date: appointment.date.toISOString(),
        time: appointment.time,
        duration: appointment.duration ?? 1,
        status: appointment.status,
        notes: appointment.notes,
        session_id: appointment.sessionId,
        origin: patient?.origin ?? "Outro",
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro ao adicionar agendamento", description: error.message, variant: "destructive" });
      throw error;
    }

    await supabase.from("notifications").insert({
      type: "agendamento",
      title: "Novo agendamento",
      message: `${appointment.patientName} agendou consulta para ${appointment.date.toLocaleDateString()}`,
    });
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar status", description: error.message, variant: "destructive" });
      throw error;
    }

    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));

    if (status === "cancelado" || status === "falta" || status === "confirmado") {
      const appointment = appointments.find((a) => a.id === id);
      if (appointment) {
        await supabase.from("notifications").insert({
          type: status === "cancelado" ? "cancelamento" : status === "falta" ? "falta" : "agendamento",
          title: status === "cancelado" ? "Consulta cancelada" : status === "falta" ? "Falta registrada" : "Consulta confirmada",
          message: `${appointment.patientName} - ${appointment.date.toLocaleDateString()} às ${appointment.time}`,
          patient_id: appointment.patientId,
          appointment_id: id,
        });
      }
    }
  };

  const updateAppointmentTime = async (id: string, date: Date, time: string, duration: number) => {
    const { error } = await supabase
      .from("appointments")
      .update({ date: date.toISOString(), time, duration })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao reagendar", description: error.message, variant: "destructive" });
      throw error;
    }

    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, date, time, duration } : a));
    toast({ title: "Horário atualizado com sucesso" });
  };

  const updateAppointmentProfessional = async (id: string, professionalId: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ professional_id: professionalId })
      .eq("id", id);
    if (error) {
      toast({ title: "Erro ao reatribuir dentista", description: error.message, variant: "destructive" });
      throw error;
    }
    setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, professionalId } : a));
    toast({ title: "Dentista atualizado com sucesso" });
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ deleted_at: new Date().toISOString() } as any)
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir agendamento", description: error.message, variant: "destructive" });
      throw error;
    }

    setAppointments((prev) =>
      prev.map((a) => a.id === id ? { ...a, deletedAt: new Date() } : a)
    );
    toast({ title: "Agendamento excluído com sucesso" });
  };

  const addTransaction = async (transaction: Omit<Transaction, "id">) => {
    const { error } = await supabase.from("transactions").insert({
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date.toISOString(),
      category: transaction.category,
      comprovante_url: transaction.comprovanteUrl ?? null,
      payment_method: transaction.paymentMethod ?? null,
      installment_count: transaction.installmentCount ?? null,
    } as any);

    if (error) {
      toast({ title: "Erro ao adicionar transação", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Transação adicionada com sucesso" });
  };

  const updateTransactionComprovante = async (id: string, comprovanteUrl: string | null) => {
    const { error } = await (supabase as any)
      .from("transactions")
      .update({ comprovante_url: comprovanteUrl })
      .eq("id", id);

    if (error) {
      toast({ title: "Erro ao salvar comprovante", description: error.message, variant: "destructive" });
      throw error;
    }

    setTransactions((prev) =>
      prev.map((t) => t.id === id ? { ...t, comprovanteUrl: comprovanteUrl ?? undefined } : t)
    );
    toast({ title: "Comprovante salvo com sucesso" });
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir transação", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Transação excluída com sucesso" });
  };

  const addProfessional = async (professional: Omit<Professional, "id">) => {
    const { error } = await supabase.from("professionals").insert({
      name: professional.name,
      specialty: professional.specialty || "",
      email: professional.email || "",
      phone: professional.phone || "",
    });

    if (error) {
      toast({ title: "Erro ao adicionar profissional", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const deleteProfessional = async (id: string) => {
    const { error } = await supabase.from("professionals").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir profissional", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Profissional excluído" });
  };

  const updateProfessional = async (id: string, data: Partial<Omit<Professional, "id">>) => {
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.specialty !== undefined) update.specialty = data.specialty;
    if (data.email !== undefined) update.email = data.email;
    if (data.phone !== undefined) update.phone = data.phone;

    const { error } = await supabase.from("professionals").update(update).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar profissional", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Profissional atualizado com sucesso" });
  };

  const markNotificationRead = async (id: string) => {
    const { error } = await supabase.from("notifications").update({ read: true }).eq("id", id);

    if (error) {
      toast({ title: "Erro ao marcar notificação", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const deleteNotification = async (id: string) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir notificação", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const createNotification = async (notification: Omit<Notification, "id">) => {
    const { error } = await supabase.from("notifications").insert({
      type: notification.type,
      title: notification.title,
      message: notification.message,
      date: notification.date.toISOString(),
      read: false,
      patient_id: notification.patientId,
      appointment_id: notification.appointmentId,
      session_id: notification.sessionId,
      installment_id: notification.installmentId,
    });

    if (error) {
      console.error("Error creating notification:", error);
    }
  };

  useEffect(() => {
    const checkNotifications = async () => {
      const now = new Date();

      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

      const upcomingIn3Hours = appointments.filter((a) => {
        if (!(a.status === "agendado" || a.status === "confirmado")) return false;
        const appointmentDateTime = new Date(a.date);
        const [hh, mm] = (a.time || "00:00").split(":");
        appointmentDateTime.setHours(parseInt(hh || "0", 10), parseInt(mm || "0", 10), 0, 0);
        const diff = appointmentDateTime.getTime() - now.getTime();
        return diff > 0 && diff <= THREE_HOURS_MS;
      });

      for (const apt of upcomingIn3Hours) {
        const exists = notifications.find(
          (n) => n.type === "lembrete_consulta" && n.appointmentId === apt.id,
        );

        if (!exists) {
          const { count, error: existsError } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("type", "lembrete_consulta")
            .eq("appointment_id", apt.id);

          if (!existsError && (count ?? 0) === 0) {
            const patient = patients.find((p) => p.id === apt.patientId);
            const appointmentDateTime = new Date(apt.date);
            const [hh, mm] = (apt.time || "00:00").split(":");
            appointmentDateTime.setHours(parseInt(hh || "0", 10), parseInt(mm || "0", 10), 0, 0);
            const sameDay = appointmentDateTime.toDateString() === now.toDateString();
            await createNotification({
              type: "lembrete_consulta",
              title: "Lembrete de Consulta",
              message: `Consulta com ${patient?.fullName || apt.patientName} agendada para ${sameDay ? "hoje" : appointmentDateTime.toLocaleDateString("pt-BR")} às ${apt.time}`,
              date: now,
              read: false,
              patientId: apt.patientId,
              appointmentId: apt.id,
            });
          }
        }
      }

      const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
      const overdueInstallments = installments.filter((i) => !i.paid && new Date(i.predictedDate) < startOfToday);

      for (const installment of overdueInstallments) {
        const existingNotification = notifications.find(
          (n) => n.type === "lembrete_pagamento" && n.installmentId === installment.id,
        );

        if (!existingNotification) {
          const { count, error: existsError } = await supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("type", "lembrete_pagamento")
            .eq("installment_id", installment.id);

          if (!existsError && (count ?? 0) === 0) {
            const session = sessions.find((s) => s.id === installment.sessionId);
            const patient = session ? patients.find((p) => p.id === session.patientId) : undefined;
            await createNotification({
              type: "lembrete_pagamento",
              title: "Pagamento Vencido",
              message: `Parcela ${installment.installmentNumber}/${installment.totalInstallments} de ${patient?.fullName || "paciente"} vencida - R$ ${installment.amount.toFixed(2)}`,
              date: now,
              read: false,
              patientId: session?.patientId,
              sessionId: session?.id,
              installmentId: installment.id,
            });
          }
        }
      }
    };

    if (loading || isCheckingNotifications.current) return;
    isCheckingNotifications.current = true;
    checkNotifications().finally(() => {
      isCheckingNotifications.current = false;
    });
  }, [appointments, sessions, installments, patients, loading]);

  const addPatient = async (patient: Omit<Patient, "id" | "createdAt">) => {
    const { error } = await supabase.from("patients").insert({
      full_name: patient.fullName,
      phone: patient.phone,
      email: patient.email,
      birth_date: patient.birthDate
        ? `${patient.birthDate.getFullYear()}-${String(patient.birthDate.getMonth() + 1).padStart(2, '0')}-${String(patient.birthDate.getDate()).padStart(2, '0')}`
        : undefined,
      nickname: patient.nickname,
      gender: patient.gender,
      cpf: patient.cpf,
      rg: patient.rg,
      marital_status: patient.maritalStatus,
      education: patient.education,
      origin: patient.origin,
      notes: patient.notes,
      responsible: patient.responsible,
      responsible_cpf: patient.responsibleCpf,
      address: patient.address,
      profession: patient.profession,
    } as any);

    if (error) {
      toast({ title: "Erro ao adicionar paciente", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Paciente adicionado com sucesso" });
  };

  const updatePatient = async (id: string, patient: Partial<Patient>) => {
    const updateData: any = {};
    if (patient.fullName) updateData.full_name = patient.fullName;
    if (patient.phone !== undefined) updateData.phone = patient.phone;
    if (patient.email !== undefined) updateData.email = patient.email;
    if (patient.birthDate !== undefined) updateData.birth_date = patient.birthDate
      ? `${patient.birthDate.getFullYear()}-${String(patient.birthDate.getMonth() + 1).padStart(2, '0')}-${String(patient.birthDate.getDate()).padStart(2, '0')}`
      : null;
    if (patient.nickname !== undefined) updateData.nickname = patient.nickname;
    if (patient.gender !== undefined) updateData.gender = patient.gender;
    if (patient.cpf !== undefined) updateData.cpf = patient.cpf;
    if (patient.rg !== undefined) updateData.rg = patient.rg;
    if (patient.maritalStatus !== undefined) updateData.marital_status = patient.maritalStatus;
    if (patient.education !== undefined) updateData.education = patient.education;
    if (patient.avatarUrl !== undefined) updateData.avatar_url = patient.avatarUrl;
    if (patient.origin !== undefined) updateData.origin = patient.origin;
    if (patient.notes !== undefined) updateData.notes = patient.notes;
    if (patient.feedbackGiven !== undefined) updateData.feedback_given = patient.feedbackGiven;
    if (patient.responsible !== undefined) updateData.responsible = patient.responsible;
    if (patient.responsibleCpf !== undefined) updateData.responsible_cpf = patient.responsibleCpf;
    if (patient.address !== undefined) updateData.address = patient.address;
    if (patient.profession !== undefined) updateData.profession = patient.profession;

    const { error } = await supabase.from("patients").update(updateData).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar paciente", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Paciente atualizado com sucesso" });
  };

  const deletePatient = async (id: string) => {
    const { error } = await supabase.from("patients").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir paciente", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Paciente excluído com sucesso" });
  };

  const addSession = async (session: Omit<Session, "id"> & { installmentsCount?: number; firstPaymentDate?: Date; paymentMethod?: PaymentMethod; cardInstallments?: number }) => {
    const { data, error } = await supabase.rpc("create_session_with_installments", {
      p_patient_id:         session.patientId,
      p_date:               session.date.toISOString(),
      p_type:               session.procedure,
      p_session_type:       session.sessionType,
      p_notes:              session.notes ?? null,
      p_amount:             session.amount,
      p_payment_status:     session.paymentStatus,
      p_payment_method:     session.paymentMethod ?? null,
      p_next_appointment:   session.nextAppointment?.toISOString() ?? null,
      p_professional_id:    session.professionalId ?? null,
      p_installments_count: session.installmentsCount ?? 1,
      p_first_payment_date: session.firstPaymentDate?.toISOString() ?? null,
    });

    if (error) {
      toast({ title: "Erro ao adicionar lançamento", description: error.message, variant: "destructive" });
      throw error;
    }

    const rawInstallments: any[] = data?.installments ?? [];
    if (rawInstallments.length > 0) {
      const mapped = rawInstallments.map((i) => ({
        id: i.id,
        transactionId: i.transaction_id || undefined,
        sessionId: i.session_id || undefined,
        installmentNumber: i.installment_number,
        totalInstallments: i.total_installments,
        amount: Number(i.amount),
        predictedDate: new Date(i.predicted_date),
        paid: i.paid,
        paidDate: i.paid_date ? new Date(i.paid_date) : undefined,
        createdAt: new Date(i.created_at),
      }));
      setInstallments((prev) => {
        const newOnes = mapped.filter((n) => !prev.some((p) => p.id === n.id));
        return [...prev, ...newOnes];
      });
    }

    if (session.cardInstallments && session.cardInstallments > 1) {
      const sessionId =
        (data as any)?.session_id ??
        (data as any)?.installments?.[0]?.session_id;

      if (sessionId) {
        await (supabase as any).from("sessions")
          .update({ installment_count: session.cardInstallments })
          .eq("id", sessionId);
      } else {
        const { data: recent } = await (supabase as any)
          .from("sessions")
          .select("id")
          .eq("patient_id", session.patientId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (recent?.id) {
          await (supabase as any).from("sessions")
            .update({ installment_count: session.cardInstallments })
            .eq("id", recent.id);
        }
      }
    }

    toast({ title: "Lançamento adicionado com sucesso" });
  };

  const updateSession = async (id: string, session: Partial<Session>) => {
    const updateData: any = {};
    if (session.date) updateData.date = session.date.toISOString();
    if (session.procedure) updateData.type = session.procedure;
    if (session.sessionType) updateData.session_type = session.sessionType;
    if (session.status) updateData.status = session.status;
    if (session.notes !== undefined) updateData.notes = session.notes;
    if (session.amount !== undefined) updateData.amount = session.amount;
    if (session.paymentStatus) updateData.payment_status = session.paymentStatus;
    if (session.nextAppointment !== undefined) {
      updateData.next_appointment = session.nextAppointment ? session.nextAppointment.toISOString() : null;
    }
    if (session.professionalId !== undefined) updateData.professional_id = session.professionalId;

    const { error } = await supabase.from("sessions").update(updateData).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar sessão", description: error.message, variant: "destructive" });
      throw error;
    }

    if (session.paymentStatus === "pago") {
      const existingSession = sessions.find((s) => s.id === id);
      if (existingSession && existingSession.paymentStatus !== "pago") {
        await supabase.from("transactions").insert({
          type: "entrada",
          description: `Pagamento - ${existingSession.procedure}`,
          amount: session.amount || existingSession.amount,
          date: new Date().toISOString(),
          category: "Consulta",
          patient_id: existingSession.patientId,
          session_id: id,
        });
      }
    }

    toast({ title: "Sessão atualizada com sucesso" });
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase.from("sessions").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir sessão", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Sessão excluída com sucesso" });
  };

  const sendCancellationNotification = async (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) throw new Error('Agendamento não encontrado');
    const patient = getPatientById(appointment.patientId);
    if (!patient?.phone) throw new Error('Paciente sem telefone cadastrado');

    const template = clinicSettings['msg_appointment_cancellation']
      ?? 'Olá, {{nome_paciente}}! Sua consulta do dia *{{data}}* foi cancelada. Entre em contato para reagendar. 📞';
    const dateStr = new Date(appointment.date).toLocaleDateString('pt-BR');
    const message = template
      .replace(/\{\{nome_paciente\}\}/g, patient.fullName)
      .replace(/\{\{data\}\}/g, dateStr);

    const { data, error } = await supabase.functions.invoke('trigger-cancel-notification', {
      body: {
        patientName: patient.fullName,
        phone: patient.phone,
        appointmentDate: appointment.date.toISOString(),
        appointmentTime: appointment.time,
        message,
      },
    });

    if (error || !data?.success) {
      const msg = error?.message ?? data?.error ?? 'Erro desconhecido';
      throw new Error(msg);
    }
  };

  const sendFaltaNotification = async (appointmentId: string) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;
    const patient = getPatientById(appointment.patientId);
    if (!patient?.phone) return;

    const template = clinicSettings['msg_falta_notification']
      ?? 'Olá, {{nome_paciente}}! 😊 Notamos que você não pôde comparecer à sua consulta do dia *{{data}}* às *{{hora}}*. Sabemos que imprevistos acontecem! Caso queira reagendar, é só responder *REAGENDAR*. 📅';
    const dateStr = new Date(appointment.date).toLocaleDateString('pt-BR');
    const message = template
      .replace(/\{\{nome_paciente\}\}/g, patient.fullName)
      .replace(/\{\{data\}\}/g, dateStr)
      .replace(/\{\{hora\}\}/g, appointment.time);

    const { data, error } = await supabase.functions.invoke('trigger-falta-notification', {
      body: {
        patientName: patient.fullName,
        phone: patient.phone,
        appointmentDate: appointment.date.toISOString(),
        appointmentTime: appointment.time,
        message,
      },
    });

    if (error || !data?.success) {
      const msg = error?.message ?? data?.error ?? 'Erro desconhecido';
      throw new Error(msg);
    }
  };

  const sendFeedbackRequest = async (patientId: string) => {
    const { data, error } = await supabase.functions.invoke('trigger-feedback-bot', {
      body: { patientId },
    });
    if (error || !data?.success) {
      const msg = error?.message ?? data?.error ?? 'Erro desconhecido';
      toast({ title: 'Erro ao enviar pedido de feedback', description: msg, variant: 'destructive' });
      throw new Error(msg);
    }
    toast({ title: '✅ Pedido de avaliação enviado' });
  };

  const linkProfessionalToUser = async (professionalId: string | null, userId: string) => {
    const { data, error } = await supabase.functions.invoke('link-professional-user', {
      body: { professionalId, userId },
    });

    if (error || !data?.success) {
      const msg = error?.message ?? data?.error ?? 'Erro desconhecido';
      toast({ title: 'Erro ao vincular profissional', description: msg, variant: 'destructive' });
      throw new Error(msg);
    }

    await loadProfessionals();
    toast({ title: professionalId ? 'Profissional vinculado' : 'Vínculo removido' });
  };

  const updateInstallment = async (id: string, data: Partial<Installment>) => {
    const updateData: any = {};

    if (data.paid !== undefined) updateData.paid = data.paid;
    if (data.paidDate) updateData.paid_date = data.paidDate.toISOString();
    if (data.predictedDate) updateData.predicted_date = data.predictedDate.toISOString();

    const { error } = await supabase.from("installments").update(updateData).eq("id", id);

    if (error) {
      toast({ title: "Erro ao atualizar parcela", description: error.message, variant: "destructive" });
      throw error;
    }

    setInstallments((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              paid: data.paid ?? i.paid,
              paidDate: data.paidDate ?? i.paidDate,
              predictedDate: data.predictedDate ?? i.predictedDate,
            }
          : i,
      ),
    );

    if (data.paid === true) {
      const installment = installments.find((i) => i.id === id);
      if (installment && installment.sessionId) {
        const session = sessions.find((s) => s.id === installment.sessionId);
        const patient = session ? getPatientById(session.patientId) : null;

        await supabase.from("transactions").insert({
          type: "entrada",
          description: `Parcela ${installment.installmentNumber}/${installment.totalInstallments} - ${session?.procedure || "Sessão"}${patient ? ` - ${patient.fullName}` : ""}`,
          amount: installment.amount,
          category: "Sessões",
          date: data.paidDate?.toISOString() || new Date().toISOString(),
          patient_id: session?.patientId,
          session_id: installment.sessionId,
        });

        const sessionInstallments = installments.filter((i) => i.sessionId === installment.sessionId);
        const allPaidNow = sessionInstallments.every((i) => (i.id === id ? true : i.paid));
        if (allPaidNow) {
          const { error: sessErr } = await supabase
            .from("sessions")
            .update({ payment_status: "pago" })
            .eq("id", installment.sessionId);
          if (!sessErr) {
            setSessions((prev) =>
              prev.map((s) => (s.id === installment.sessionId ? { ...s, paymentStatus: "pago" } : s)),
            );
          }
        }
      }
    }

    toast({ title: "Parcela atualizada com sucesso" });
  };

  const linkAppointmentToSession = async (sessionId: string, appointmentDate: Date, appointmentTime: string) => {
    const { error } = await supabase
      .from("sessions")
      .update({
        status: "agendado",
        date: appointmentDate.toISOString(),
      })
      .eq("id", sessionId);

    if (error) {
      toast({ title: "Erro ao vincular sessão", description: error.message, variant: "destructive" });
      throw error;
    }
  };

  const getPatientById = (id: string) => patients.find((p) => p.id === id);
  const getSessionsByPatientId = (patientId: string) => sessions.filter((s) => s.patientId === patientId);
  const getTransactionsByPatientId = (patientId: string) => transactions.filter((t) => t.patientId === patientId);
  const getSuggestedSessionsByPatientId = (patientId: string) =>
    sessions.filter((s) => s.patientId === patientId && s.status === "sugerido");

  const value: ClinicContextType = {
    professionals,
    appointments,
    transactions,
    notifications,
    patients,
    sessions,
    installments,
    loading,
    addAppointment,
    updateAppointmentStatus,
    updateAppointmentTime,
    updateAppointmentProfessional,
    deleteAppointment,
    addTransaction,
    updateTransactionComprovante,
    deleteTransaction,
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
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return <ClinicContext.Provider value={value}>{children}</ClinicContext.Provider>;
};
