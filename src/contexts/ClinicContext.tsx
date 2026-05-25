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
  OdontogramProcedure,
  PatientPhoto,
  PhotoCategory,
  AnamneseQuestion,
  AnamneseResponse,
  AnamneseAnswerRecord,
  AnamneseQuestionType,
  AnamneseStatus,
  PaymentMethod,
  ReturnAlert,
  AppUser,
  UserProfile,
  AppModule,
  UserPermission,
  PatientDocument,
  Lead,
  LeadStage,
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
  deleteTransaction: (id: string) => Promise<void>;
  addProfessional: (professional: Omit<Professional, "id">) => Promise<void>;
  updateProfessional: (id: string, data: Partial<Omit<Professional, "id">>) => Promise<void>;
  deleteProfessional: (id: string) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, "id" | "createdAt">) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
  addSession: (session: Omit<Session, "id"> & { installmentsCount?: number; firstPaymentDate?: Date; paymentMethod?: PaymentMethod }) => Promise<void>;
  updateSession: (id: string, session: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  getSessionsByPatientId: (patientId: string) => Session[];
  getTransactionsByPatientId: (patientId: string) => Transaction[];
  linkAppointmentToSession: (sessionId: string, appointmentDate: Date, appointmentTime: string) => Promise<void>;
  getSuggestedSessionsByPatientId: (patientId: string) => Session[];
  updateInstallment: (id: string, data: Partial<Installment>) => Promise<void>;
  returnAlerts: ReturnAlert[];
  addReturnAlert: (patientId: string, returnDate: Date, notes?: string) => Promise<void>;
  deleteReturnAlert: (id: string) => Promise<void>;
  sendReturnAlertWhatsApp: (id: string) => Promise<void>;
  sendCancellationNotification: (appointmentId: string) => Promise<void>;
  myProfessionalId: string | null;
  linkProfessionalToUser: (professionalId: string | null, userId: string) => Promise<void>;
  sendFeedbackRequest: (patientId: string) => Promise<void>;
  clinicSettings: Record<string, string>;
  updateClinicSetting: (key: string, value: string) => Promise<void>;
  appUsers: AppUser[];
  userPermissions: UserPermission[];
  inviteAppUser: (data: { email: string; fullName: string; phone?: string; profile: UserProfile }) => Promise<void>;
  toggleAppUserActive: (id: string, active: boolean) => Promise<void>;
  updateUserPermission: (userId: string, module: AppModule, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => Promise<void>;
  odontogramProcedures: OdontogramProcedure[];
  addOdontogramProcedure: (proc: Omit<OdontogramProcedure, "id" | "createdAt">) => Promise<void>;
  getOdontogramByPatientId: (patientId: string) => OdontogramProcedure[];
  anamneseQuestions: AnamneseQuestion[];
  anamneseResponses: AnamneseResponse[];
  addAnamneseQuestion: (question: string, type: AnamneseQuestionType, sequence: number) => Promise<void>;
  updateAnamneseQuestion: (id: string, data: Partial<Pick<AnamneseQuestion, 'question' | 'sequence' | 'type' | 'active'>>) => Promise<void>;
  deleteAnamneseQuestion: (id: string) => Promise<void>;
  saveAnamneseResponse: (patientId: string, answers: Omit<AnamneseAnswerRecord, 'id' | 'responseId'>[]) => Promise<void>;
  requestAnamneseForPatient: (patientId: string) => Promise<{ link: string; code: string }>;
  sendAnamneseViaWhatsapp: (patientId: string, responseId: string, token: string, code: string) => Promise<void>;
  deleteAnamneseResponse: (id: string) => Promise<void>;
  getAnamneseByPatientId: (patientId: string) => AnamneseResponse[];
  patientPhotos: PatientPhoto[];
  addPatientPhoto: (patientId: string, file: File, caption: string, category: PhotoCategory) => Promise<void>;
  deletePatientPhoto: (id: string, url: string) => Promise<void>;
  updatePatientAvatar: (patientId: string, file: File) => Promise<void>;
  getPhotosByPatientId: (patientId: string) => PatientPhoto[];
  patientDocuments: PatientDocument[];
  addPatientDocument: (patientId: string, file: File) => Promise<void>;
  deletePatientDocument: (id: string, url: string) => Promise<void>;
  getDocumentsByPatientId: (patientId: string) => PatientDocument[];
  leads: Lead[];
  addLead: (data: Omit<Lead, 'id' | 'stage' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, data: Partial<Omit<Lead, 'id' | 'createdAt'>>) => Promise<void>;
  moveLeadStage: (id: string, stage: LeadStage, extra?: { lostReason?: string }) => Promise<{ patientId?: string }>;
  deleteLead: (id: string) => Promise<void>;
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
  const [odontogramProcedures, setOdontogramProcedures] = useState<OdontogramProcedure[]>([]);
  const [patientPhotos, setPatientPhotos] = useState<PatientPhoto[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [anamneseQuestions, setAnamneseQuestions] = useState<AnamneseQuestion[]>([]);
  const [anamneseResponses, setAnamneseResponses] = useState<AnamneseResponse[]>([]);
  const [returnAlerts, setReturnAlerts] = useState<ReturnAlert[]>([]);
  const [clinicSettings, setClinicSettings] = useState<Record<string, string>>({});
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [myProfessionalId, setMyProfessionalId] = useState<string | null>(null);
  const myProfessionalIdRef = useRef<string | null>(null);
  const { toast } = useToast();
  const isCheckingNotifications = useRef(false);

  // Carregar todos os dados
  useEffect(() => {
    loadAllData();

    // Configurar realtime otimizado para atualizar apenas items modificados
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
        loadAppointments(); // Mantém carregamento completo por causa do join com patients
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

        // Dentista: ignora notificações de outros profissionais
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

        // Dentista: remove do estado se a notificação não é mais dela
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

  const loadAppUsers = async () => {
    const { data, error } = await (supabase as any).from('app_users').select('*').order('full_name');
    if (error) { console.error('Error loading app_users:', error); return; }
    setAppUsers((data || []).map((u: any) => ({
      id: u.id, email: u.email, fullName: u.full_name,
      phone: u.phone ?? undefined, profile: u.profile, active: u.active,
      createdAt: new Date(u.created_at),
    })));
  };

  const loadUserPermissions = async () => {
    const { data, error } = await (supabase as any).from('user_permissions').select('*');
    if (error) { console.error('Error loading user_permissions:', error); return; }
    setUserPermissions((data || []).map((p: any) => ({
      id: p.id, userId: p.user_id, module: p.module,
      canView: p.can_view, canCreate: p.can_create, canEdit: p.can_edit, canDelete: p.can_delete,
    })));
  };

  const inviteAppUser = async (data: { email: string; fullName: string; phone?: string; profile: UserProfile }) => {
    const { error } = await supabase.functions.invoke('invite-user', {
      body: { email: data.email, fullName: data.fullName, phone: data.phone, profile: data.profile },
    });
    if (error) {
      toast({ title: 'Erro ao convidar usuário', description: error.message, variant: 'destructive' });
      throw error;
    }
    await loadAppUsers();
    await loadUserPermissions();
    toast({ title: 'Convite enviado', description: `${data.email} receberá um e-mail para definir a senha.` });
  };

  const toggleAppUserActive = async (id: string, active: boolean) => {
    const { error } = await (supabase as any).from('app_users').update({ active }).eq('id', id);
    if (error) { toast({ title: 'Erro ao atualizar usuário', description: error.message, variant: 'destructive' }); throw error; }
    setAppUsers(prev => prev.map(u => u.id === id ? { ...u, active } : u));
  };

  const updateUserPermission = async (userId: string, module: AppModule, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => {
    const colMap: Record<string, string> = { canView: 'can_view', canCreate: 'can_create', canEdit: 'can_edit', canDelete: 'can_delete' };
    const existing = userPermissions.find(p => p.userId === userId && p.module === module);
    const { error } = await (supabase as any)
      .from('user_permissions')
      .upsert({
        user_id: userId,
        module,
        can_view: existing?.canView ?? false,
        can_create: existing?.canCreate ?? false,
        can_edit: existing?.canEdit ?? false,
        can_delete: existing?.canDelete ?? false,
        [colMap[field]]: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,module' });
    if (error) { toast({ title: 'Erro ao salvar permissão', description: error.message, variant: 'destructive' }); throw error; }
    if (existing) {
      setUserPermissions(prev => prev.map(p =>
        p.userId === userId && p.module === module ? { ...p, [field]: value } : p
      ));
    } else {
      setUserPermissions(prev => [...prev, {
        id: crypto.randomUUID(),
        userId,
        module,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        [field]: value,
      }]);
    }
  };

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

  const loadReturnAlerts = async () => {
    const { data, error } = await (supabase as any).from("return_alerts").select("*").order("return_date", { ascending: true });
    if (error) { console.error("Error loading return alerts:", error); return; }
    setReturnAlerts(
      (data || []).map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        returnDate: new Date(r.return_date + 'T12:00:00'),
        notes: r.notes ?? undefined,
        whatsappSent: r.whatsapp_sent,
        whatsappSentAt: r.whatsapp_sent_at ? new Date(r.whatsapp_sent_at) : undefined,
        createdAt: new Date(r.created_at),
      }))
    );
  };

  const loadAllData = async () => {
    setLoading(true);

    // Verifica se o usuário logado está vinculado a um profissional
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
      loadOdontogramProcedures(),
      loadPatientPhotos(),
      loadAnamneseData(),
      loadReturnAlerts(),
      loadClinicSettings(),
      loadAppUsers(),
      loadUserPermissions(),
      loadPatientDocuments(),
      loadLeads(),
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
    // Se for dentista, busca apenas os IDs dos seus pacientes via appointments
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

    // Carrega em lotes de 1000 até buscar todos os pacientes
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
      if (data.length < PAGE) break; // última página
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
      })),
    );
  };

  const loadNotifications = async () => {
    let q = (supabase as any).from("notifications").select("*").order("date", { ascending: false });

    if (myProfessionalIdRef.current) {
      // Dentista vê apenas notificações da sua agenda ou sem profissional vinculado
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
    const { data, error } = await supabase
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

    // Criar notificação
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
    });

    if (error) {
      toast({ title: "Erro ao adicionar transação", description: error.message, variant: "destructive" });
      throw error;
    }

    toast({ title: "Transação adicionada com sucesso" });
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

  // Função auxiliar para criar notificações
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

  // Verificar e criar notificações automáticas
  useEffect(() => {
    const checkNotifications = async () => {
      const now = new Date();

      // 1. Lembrete de consultas (3h antes)
      const THREE_HOURS_MS = 3 * 60 * 60 * 1000;

      const upcomingIn3Hours = appointments.filter((a) => {
        if (!(a.status === "agendado" || a.status === "confirmado")) return false;
        const appointmentDateTime = new Date(a.date);
        // Combina a data com o horário HH:mm do agendamento
        const [hh, mm] = (a.time || "00:00").split(":");
        appointmentDateTime.setHours(parseInt(hh || "0", 10), parseInt(mm || "0", 10), 0, 0);
        const diff = appointmentDateTime.getTime() - now.getTime();
        return diff > 0 && diff <= THREE_HOURS_MS;
      });

      for (const apt of upcomingIn3Hours) {
        // Evitar duplicatas (independente de lida ou não)
        const exists = notifications.find(
          (n) => n.type === "lembrete_consulta" && n.appointmentId === apt.id,
        );

        if (!exists) {
          // Verificação adicional no backend para evitar duplicações por corrida de eventos
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

      // 4. Lembrete de pagamento (parcelas vencidas)
      const overdueInstallments = installments.filter((i) => !i.paid && new Date(i.predictedDate) < now);

      for (const installment of overdueInstallments) {
        const existingNotification = notifications.find(
          (n) => n.type === "lembrete_pagamento" && n.installmentId === installment.id,
        );

        if (!existingNotification) {
          // Verificação adicional no backend para evitar duplicações
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

  // Auto-envio de alertas de retorno vencidos ao carregar o app
  useEffect(() => {
    if (loading || returnAlerts.length === 0) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = returnAlerts.filter(a => {
      if (a.whatsappSent) return false;
      const rd = new Date(a.returnDate); rd.setHours(0, 0, 0, 0);
      return rd <= today;
    });
    overdue.forEach(a => sendReturnAlertWhatsApp(a.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

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

  const addSession = async (session: Omit<Session, "id"> & { installmentsCount?: number; firstPaymentDate?: Date; paymentMethod?: PaymentMethod }) => {
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

    // Atualizar parcelas no estado local imediatamente (realtime também as captura)
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

    // Atualizar transação se necessário
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

  const loadAnamneseData = async () => {
    const [qRes, rRes, tRes] = await Promise.all([
      (supabase as any).from("anamnese_questions").select("*").order("sequence"),
      (supabase as any).from("anamnese_responses").select("*, anamnese_answers(*)").order("created_at", { ascending: false }),
      (supabase as any).from("anamnese_tokens").select("response_id, token, code"),
    ]);
    if (!qRes.error) {
      setAnamneseQuestions(
        (qRes.data || []).map((q: any) => ({
          id: q.id, question: q.question, sequence: q.sequence,
          type: q.type, active: q.active, createdAt: new Date(q.created_at),
        }))
      );
    }
    const tokenMap: Record<string, { token: string; code: string }> = {};
    for (const t of tRes.data || []) tokenMap[t.response_id] = { token: t.token, code: t.code };

    if (!rRes.error) {
      setAnamneseResponses(
        (rRes.data || []).map((r: any) => ({
          id: r.id,
          patientId: r.patient_id,
          status: (r.status ?? "sent") as AnamneseStatus,
          token: tokenMap[r.id]?.token,
          code: tokenMap[r.id]?.code,
          completedAt: r.completed_at ? new Date(r.completed_at) : undefined,
          signedName: r.patient_signed_name ?? undefined,
          signedAt: r.signed_at ? new Date(r.signed_at) : undefined,
          createdAt: new Date(r.created_at),
          ipAddress: r.ip_address ?? undefined,
          userAgent: r.user_agent ?? undefined,
          verifiedPhone: r.verified_phone ?? undefined,
          answers: (r.anamnese_answers || []).map((a: any) => ({
            id: a.id, responseId: a.response_id, questionId: a.question_id ?? undefined,
            questionText: a.question_text, questionType: a.question_type,
            questionSequence: a.question_sequence,
            answerBool: a.answer_bool ?? undefined,
            answerText: a.answer_text ?? undefined,
          })),
        }))
      );
    }
  };

  const addAnamneseQuestion = async (question: string, type: AnamneseQuestionType, sequence: number) => {
    const { error } = await (supabase as any).from("anamnese_questions").insert({ question, type, sequence, active: true });
    if (error) { toast({ title: "Erro ao adicionar pergunta", description: error.message, variant: "destructive" }); throw error; }
    await loadAnamneseData();
  };

  const updateAnamneseQuestion = async (id: string, data: Partial<Pick<AnamneseQuestion, 'question' | 'sequence' | 'type' | 'active'>>) => {
    const { error } = await (supabase as any).from("anamnese_questions").update(data).eq("id", id);
    if (error) { toast({ title: "Erro ao atualizar pergunta", description: error.message, variant: "destructive" }); throw error; }
    // Atualiza estado local diretamente — evita recarregar tudo do banco
    setAnamneseQuestions(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
  };

  const deleteAnamneseQuestion = async (id: string) => {
    // Soft delete: marca como inativa em vez de deletar
    // (DELETE falha por FK constraint com anamnese_answers.question_id)
    const { error } = await (supabase as any).from("anamnese_questions").update({ active: false }).eq("id", id);
    if (error) { toast({ title: "Erro ao excluir pergunta", description: error.message, variant: "destructive" }); throw error; }
    setAnamneseQuestions(prev => prev.map(q => q.id === id ? { ...q, active: false } : q));
    toast({ title: "Pergunta excluída" });
  };

  const saveAnamneseResponse = async (patientId: string, answers: Omit<AnamneseAnswerRecord, 'id' | 'responseId'>[]) => {
    const { data: resp, error: respErr } = await (supabase as any)
      .from("anamnese_responses").insert({ patient_id: patientId, completed_at: new Date().toISOString() }).select().single();
    if (respErr) { toast({ title: "Erro ao salvar anamnese", description: respErr.message, variant: "destructive" }); throw respErr; }
    const rows = answers.map((a) => ({
      response_id: resp.id,
      question_id: a.questionId ?? null,
      question_text: a.questionText,
      question_type: a.questionType,
      question_sequence: a.questionSequence,
      answer_bool: a.answerBool ?? null,
      answer_text: a.answerText ?? null,
    }));
    const { error: ansErr } = await (supabase as any).from("anamnese_answers").insert(rows);
    if (ansErr) { toast({ title: "Erro ao salvar respostas", description: ansErr.message, variant: "destructive" }); throw ansErr; }
    await loadAnamneseData();
    toast({ title: "Anamnese salva com sucesso" });
  };

  const requestAnamneseForPatient = async (patientId: string) => {
    const { data: resp, error: respErr } = await (supabase as any)
      .from("anamnese_responses")
      .insert({ patient_id: patientId, status: "sent" })
      .select().single();
    if (respErr) { toast({ title: "Erro ao solicitar anamnese", description: respErr.message, variant: "destructive" }); throw respErr; }

    const token = crypto.randomUUID();
    const code = String(Math.floor(100000 + Math.random() * 900000)); // 6 dígitos
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const { error: tokenErr } = await (supabase as any).from("anamnese_tokens").insert({
      response_id: resp.id, patient_id: patientId,
      token, code, expires_at: expiresAt.toISOString(),
    });
    if (tokenErr) { toast({ title: "Erro ao gerar token", description: tokenErr.message, variant: "destructive" }); throw tokenErr; }

    await loadAnamneseData();
    const link = `https://app.renatalyra.com.br/anamnese/${token}`;
    toast({ title: "Link gerado com sucesso" });
    return { link, code };
  };

  const sendAnamneseViaWhatsapp = async (patientId: string, responseId: string, token: string, code: string) => {
    const { error } = await supabase.functions.invoke("send-anamnese-link", {
      body: { patientId, responseId, token, code },
    });
    if (error) {
      toast({ title: "Erro ao enviar WhatsApp", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Mensagem em processamento. Verifique nas notificações em caso de erro" });
  };

  const getAnamneseByPatientId = (patientId: string) =>
    anamneseResponses.filter((r) => r.patientId === patientId);

  const deleteAnamneseResponse = async (id: string) => {
    await Promise.all([
      (supabase as any).from("anamnese_answers").delete().eq("response_id", id),
      (supabase as any).from("anamnese_tokens").delete().eq("response_id", id),
    ]);
    const { error } = await (supabase as any).from("anamnese_responses").delete().eq("id", id);
    if (error) { toast({ title: "Erro ao excluir anamnese", description: error.message, variant: "destructive" }); throw error; }
    setAnamneseResponses(prev => prev.filter(r => r.id !== id));
    toast({ title: "Anamnese excluída" });
  };

  const loadPatientPhotos = async () => {
    const { data, error } = await (supabase as any)
      .from("patient_photos")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("Error loading photos:", error); return; }
    setPatientPhotos(
      (data || []).map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        url: r.url,
        caption: r.caption ?? undefined,
        category: r.category,
        createdAt: new Date(r.created_at),
      }))
    );
  };

  const addPatientPhoto = async (patientId: string, file: File, caption: string, category: PhotoCategory) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${patientId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-photos")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: uploadError.message, variant: "destructive" });
      throw uploadError;
    }
    const { data: { publicUrl } } = supabase.storage.from("patient-photos").getPublicUrl(path);
    const { error } = await (supabase as any).from("patient_photos").insert({
      patient_id: patientId,
      url: publicUrl,
      caption: caption || null,
      category,
    });
    if (error) {
      toast({ title: "Erro ao salvar foto", description: error.message, variant: "destructive" });
      throw error;
    }
    await loadPatientPhotos();
    toast({ title: "Foto adicionada com sucesso" });
  };

  const deletePatientPhoto = async (id: string, url: string) => {
    const { error } = await (supabase as any).from("patient_photos").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir foto", description: error.message, variant: "destructive" });
      throw error;
    }
    // Remove do storage (extrai o path da URL)
    try {
      const parts = url.split("/patient-photos/");
      if (parts[1]) await supabase.storage.from("patient-photos").remove([parts[1]]);
    } catch (_) { /* ignora erro de storage */ }
    await loadPatientPhotos();
    toast({ title: "Foto excluída" });
  };

  const updatePatientAvatar = async (patientId: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `${patientId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-photos")
      .upload(path, file, { cacheControl: "3600", upsert: true });
    if (uploadError) {
      toast({ title: "Erro ao enviar foto", description: uploadError.message, variant: "destructive" });
      throw uploadError;
    }
    const { data: { publicUrl } } = supabase.storage.from("patient-photos").getPublicUrl(path);
    const avatarUrl = `${publicUrl}?t=${Date.now()}`;
    await updatePatient(patientId, { avatarUrl } as any);
  };

  const getPhotosByPatientId = (patientId: string) =>
    patientPhotos.filter((p) => p.patientId === patientId);

  const loadPatientDocuments = async () => {
    const { data, error } = await (supabase as any)
      .from("patient_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { console.error("Error loading documents:", error); return; }
    setPatientDocuments(
      (data || []).map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        name: r.name,
        url: r.url,
        fileType: r.file_type ?? undefined,
        fileSize: r.file_size ?? undefined,
        createdAt: new Date(r.created_at),
      }))
    );
  };

  const addPatientDocument = async (patientId: string, file: File) => {
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${patientId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage
      .from("patient-documents")
      .upload(path, file, { cacheControl: "3600", upsert: false });
    if (uploadError) {
      toast({ title: "Erro ao enviar documento", description: uploadError.message, variant: "destructive" });
      throw uploadError;
    }
    const { data: { publicUrl } } = supabase.storage.from("patient-documents").getPublicUrl(path);
    const { error } = await (supabase as any).from("patient_documents").insert({
      patient_id: patientId,
      name: file.name,
      url: publicUrl,
      file_type: file.type || ext,
      file_size: file.size,
    });
    if (error) {
      toast({ title: "Erro ao salvar documento", description: error.message, variant: "destructive" });
      throw error;
    }
    await loadPatientDocuments();
    toast({ title: "Documento adicionado" });
  };

  const deletePatientDocument = async (id: string, url: string) => {
    const { error } = await (supabase as any).from("patient_documents").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir documento", description: error.message, variant: "destructive" });
      throw error;
    }
    try {
      const parts = url.split("/patient-documents/");
      if (parts[1]) await supabase.storage.from("patient-documents").remove([parts[1]]);
    } catch (_) { /* ignora erro de storage */ }
    await loadPatientDocuments();
    toast({ title: "Documento excluído" });
  };

  const getDocumentsByPatientId = (patientId: string) =>
    patientDocuments.filter((d) => d.patientId === patientId);

  // ── Leads (Funil de Vendas) ──────────────────────────────────────────────
  const mapLead = (r: any): Lead => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email ?? undefined,
    origin: r.origin,
    treatmentInterest: r.treatment_interest ?? undefined,
    stage: r.stage as LeadStage,
    estimatedValue: r.estimated_value ? Number(r.estimated_value) : undefined,
    notes: r.notes ?? undefined,
    patientId: r.patient_id ?? undefined,
    lostReason: r.lost_reason ?? undefined,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  });

  const loadLeads = async () => {
    const { data, error } = await (supabase as any)
      .from('leads').select('*').order('created_at', { ascending: false });
    if (error) { console.error('Error loading leads:', error); return; }
    setLeads((data || []).map(mapLead));
  };

  const addLead = async (data: Omit<Lead, 'id' | 'stage' | 'createdAt' | 'updatedAt'>) => {
    const { error } = await (supabase as any).from('leads').insert({
      name: data.name,
      phone: data.phone,
      email: data.email ?? null,
      origin: data.origin,
      treatment_interest: data.treatmentInterest ?? null,
      estimated_value: data.estimatedValue ?? null,
      notes: data.notes ?? null,
    });
    if (error) { toast({ title: 'Erro ao adicionar lead', description: error.message, variant: 'destructive' }); throw error; }
    await loadLeads();
    toast({ title: 'Lead adicionado ao funil' });
  };

  const updateLead = async (id: string, data: Partial<Omit<Lead, 'id' | 'createdAt'>>) => {
    const update: any = { updated_at: new Date().toISOString() };
    if (data.name !== undefined) update.name = data.name;
    if (data.phone !== undefined) update.phone = data.phone;
    if (data.email !== undefined) update.email = data.email ?? null;
    if (data.origin !== undefined) update.origin = data.origin;
    if (data.treatmentInterest !== undefined) update.treatment_interest = data.treatmentInterest ?? null;
    if (data.estimatedValue !== undefined) update.estimated_value = data.estimatedValue ?? null;
    if (data.notes !== undefined) update.notes = data.notes ?? null;
    if (data.stage !== undefined) update.stage = data.stage;
    if (data.lostReason !== undefined) update.lost_reason = data.lostReason ?? null;
    if (data.patientId !== undefined) update.patient_id = data.patientId ?? null;
    const { error } = await (supabase as any).from('leads').update(update).eq('id', id);
    if (error) { toast({ title: 'Erro ao atualizar lead', description: error.message, variant: 'destructive' }); throw error; }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...data, updatedAt: new Date() } : l));
  };

  const moveLeadStage = async (id: string, stage: LeadStage, extra?: { lostReason?: string }): Promise<{ patientId?: string }> => {
    const lead = leads.find(l => l.id === id);
    if (!lead) return {};

    let patientId = lead.patientId;

    // Se está avançando para consulta agendada e ainda não tem paciente, cria paciente mínimo
    if (stage === 'consulta_agendada' && !patientId) {
      const { data: newPatient, error: patientError } = await supabase.from('patients').insert({
        full_name: lead.name,
        phone: lead.phone,
        email: lead.email ?? null,
        origin: lead.origin,
      }).select().single();
      if (patientError) {
        toast({ title: 'Erro ao criar paciente', description: patientError.message, variant: 'destructive' });
        throw patientError;
      }
      patientId = newPatient.id;
    }

    // Se convertido e ainda não tem paciente, cria agora
    if (stage === 'convertido' && !patientId) {
      const { data: newPatient, error: patientError } = await supabase.from('patients').insert({
        full_name: lead.name,
        phone: lead.phone,
        email: lead.email ?? null,
        origin: lead.origin,
      }).select().single();
      if (!patientError && newPatient) patientId = newPatient.id;
    }

    const update: any = { stage, updated_at: new Date().toISOString() };
    if (patientId) update.patient_id = patientId;
    if (extra?.lostReason) update.lost_reason = extra.lostReason;

    await (supabase as any).from('leads').update(update).eq('id', id);
    setLeads(prev => prev.map(l =>
      l.id === id ? { ...l, stage, patientId: patientId ?? l.patientId, lostReason: extra?.lostReason ?? l.lostReason, updatedAt: new Date() } : l
    ));
    await loadPatients();
    return { patientId };
  };

  const deleteLead = async (id: string) => {
    const { error } = await (supabase as any).from('leads').delete().eq('id', id);
    if (error) { toast({ title: 'Erro ao excluir lead', description: error.message, variant: 'destructive' }); throw error; }
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const loadOdontogramProcedures = async () => {
    const { data, error } = await supabase
      .from("odontogram_procedures")
      .select("*")
      .order("execution_date", { ascending: false });
    if (error) { console.error("Error loading odontogram:", error); return; }
    setOdontogramProcedures(
      (data || []).map((r: any) => ({
        id: r.id,
        patientId: r.patient_id,
        toothNumbers: r.tooth_numbers ?? [],
        toothFaces: r.tooth_faces ?? [],
        dentition: r.dentition,
        procedureDescription: r.procedure_description,
        status: r.status,
        professionalId: r.professional_id,
        executionDate: new Date(r.execution_date),
        nextAppointmentDate: r.next_appointment_date ? new Date(r.next_appointment_date) : undefined,
        notes: r.notes ?? undefined,
        createdAt: new Date(r.created_at),
      }))
    );
  };

  const addOdontogramProcedure = async (proc: Omit<OdontogramProcedure, "id" | "createdAt">) => {
    const { error } = await supabase.from("odontogram_procedures").insert({
      patient_id: proc.patientId,
      tooth_numbers: proc.toothNumbers,
      tooth_faces: proc.toothFaces,
      dentition: proc.dentition,
      procedure_description: proc.procedureDescription,
      status: proc.status,
      professional_id: proc.professionalId,
      execution_date: proc.executionDate.toISOString().split("T")[0],
      next_appointment_date: proc.nextAppointmentDate?.toISOString().split("T")[0] ?? null,
      notes: proc.notes ?? null,
    } as any);
    if (error) {
      toast({ title: "Erro ao salvar procedimento", description: error.message, variant: "destructive" });
      throw error;
    }
    toast({ title: "Procedimento salvo com sucesso" });
    await loadOdontogramProcedures();
  };

  const getOdontogramByPatientId = (patientId: string) =>
    odontogramProcedures.filter((p) => p.patientId === patientId);

  const addReturnAlert = async (patientId: string, returnDate: Date, notes?: string) => {
    const { data, error } = await (supabase as any).from("return_alerts").insert({
      patient_id: patientId,
      return_date: returnDate.toISOString().split('T')[0],
      notes: notes ?? null,
    }).select().single();
    if (error) {
      toast({ title: "Erro ao criar alerta", description: error.message, variant: "destructive" });
      throw error;
    }
    setReturnAlerts(prev => [...prev, {
      id: data.id,
      patientId: data.patient_id,
      returnDate: new Date(data.return_date + 'T12:00:00'),
      notes: data.notes ?? undefined,
      whatsappSent: false,
      createdAt: new Date(data.created_at),
    }]);
    toast({ title: "Alerta de retorno criado" });
  };

  const deleteReturnAlert = async (id: string) => {
    const { error } = await (supabase as any).from("return_alerts").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir alerta", description: error.message, variant: "destructive" });
      throw error;
    }
    setReturnAlerts(prev => prev.filter(a => a.id !== id));
  };

  const sendReturnAlertWhatsApp = async (id: string) => {
    const alert = returnAlerts.find(a => a.id === id);
    if (!alert) return;
    const patient = getPatientById(alert.patientId);
    if (!patient) return;

    if (!patient.phone || patient.phone.trim() === '') {
      toast({
        title: 'Telefone não cadastrado',
        description: `Cadastre o telefone de ${patient.fullName} antes de enviar o WhatsApp.`,
        variant: 'destructive',
      });
      return;
    }

    const template = clinicSettings['msg_return_alert'] ?? 'Olá, {{nome_paciente}}! Aqui é a clínica Dra. Renata Lyra. Que tal agendar um retorno?';
    const message = template.replace('{{nome_paciente}}', patient.fullName);

    let res: Response;
    try {
      res = await supabase.functions.invoke('trigger-return-alert', {
        body: {
          patientName: patient.fullName,
          patientPhone: patient.phone,
          returnDate: alert.returnDate.toISOString().split('T')[0],
          notes: alert.notes ?? '',
          message,
        },
      }) as unknown as Response;
    } catch (e) {
      console.error('Erro ao acionar alerta de retorno:', e);
      toast({
        title: 'WhatsApp não enviado',
        description: `Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.`,
        variant: 'destructive',
      });
      return;
    }

    const data = (res as any).data;
    const error = (res as any).error;

    if (error || !data?.success) {
      const msg = error?.message ?? data?.error ?? 'Erro desconhecido';
      console.error('Falha no alerta de retorno:', msg);
      toast({
        title: 'WhatsApp não enviado',
        description: `Falha ao enviar alerta para ${patient.fullName}: ${msg}`,
        variant: 'destructive',
      });
      return;
    }

    const now = new Date();
    await (supabase as any).from("return_alerts").update({
      whatsapp_sent: true,
      whatsapp_sent_at: now.toISOString(),
    }).eq("id", id);
    setReturnAlerts(prev => prev.map(a => a.id === id ? { ...a, whatsappSent: true, whatsappSentAt: now } : a));
    toast({ title: '✅ Alerta enviado', description: `Mensagem de retorno disparada para ${patient.fullName}` });
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

    // Atualização otimista local para refletir imediatamente na UI
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

    // Se a parcela foi marcada como paga, criar uma transação de entrada
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

        // Se todas as parcelas desta sessão estiverem pagas, marcar sessão como paga (sem criar transação extra)
        const sessionInstallments = installments.filter((i) => i.sessionId === installment.sessionId);
        const allPaidNow = sessionInstallments.every((i) => (i.id === id ? true : i.paid));
        if (allPaidNow) {
          const { error: sessErr } = await supabase
            .from("sessions")
            .update({ payment_status: "pago" })
            .eq("id", installment.sessionId);
          if (!sessErr) {
            // Atualização otimista local da sessão para atualizar totais/badges
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
    returnAlerts,
    addReturnAlert,
    deleteReturnAlert,
    sendReturnAlertWhatsApp,
    sendCancellationNotification,
    myProfessionalId,
    linkProfessionalToUser,
    sendFeedbackRequest,
    clinicSettings,
    updateClinicSetting,
    appUsers,
    userPermissions,
    inviteAppUser,
    toggleAppUserActive,
    updateUserPermission,
    odontogramProcedures,
    addOdontogramProcedure,
    getOdontogramByPatientId,
    anamneseQuestions,
    anamneseResponses,
    addAnamneseQuestion,
    updateAnamneseQuestion,
    deleteAnamneseQuestion,
    saveAnamneseResponse,
    requestAnamneseForPatient,
    sendAnamneseViaWhatsapp,
    deleteAnamneseResponse,
    getAnamneseByPatientId,
    patientPhotos,
    addPatientPhoto,
    deletePatientPhoto,
    updatePatientAvatar,
    getPhotosByPatientId,
    patientDocuments,
    addPatientDocument,
    deletePatientDocument,
    getDocumentsByPatientId,
    leads,
    addLead,
    updateLead,
    moveLeadStage,
    deleteLead,
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
