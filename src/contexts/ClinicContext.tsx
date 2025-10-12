import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, Professional, Transaction, Feedback, Notification, Patient, Session, AppointmentStatus, Installment } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ClinicContextType {
  professionals: Professional[];
  appointments: Appointment[];
  transactions: Transaction[];
  feedbacks: Feedback[];
  notifications: Notification[];
  patients: Patient[];
  sessions: Session[];
  installments: Installment[];
  loading: boolean;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
  updateAppointmentStatus: (id: string, status: AppointmentStatus) => Promise<void>;
  deleteAppointment: (id: string) => Promise<void>;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'date'>) => Promise<void>;
  addProfessional: (professional: Omit<Professional, 'id'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  addSession: (session: Omit<Session, 'id'> & { installmentsCount?: number; firstPaymentDate?: Date }) => Promise<void>;
  updateSession: (id: string, session: Partial<Session>) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  getPatientById: (id: string) => Patient | undefined;
  getSessionsByPatientId: (patientId: string) => Session[];
  getTransactionsByPatientId: (patientId: string) => Transaction[];
  getFeedbacksByPatientId: (patientId: string) => Feedback[];
  linkAppointmentToSession: (sessionId: string, appointmentDate: Date, appointmentTime: string) => Promise<void>;
  getSuggestedSessionsByPatientId: (patientId: string) => Session[];
  updateInstallment: (id: string, data: Partial<Installment>) => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic must be used within ClinicProvider');
  return context;
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Carregar todos os dados
  useEffect(() => {
    loadAllData();

    // Configurar realtime otimizado para atualizar apenas items modificados
    const professionalsChannel = supabase
      .channel('professionals-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'professionals' }, (payload) => {
        const newPro = { ...payload.new, averageRating: payload.new.average_rating ? Number(payload.new.average_rating) : undefined, createdAt: new Date(payload.new.created_at) } as Professional;
        setProfessionals(prev => [...prev, newPro]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'professionals' }, (payload) => {
        const updated = { ...payload.new, averageRating: payload.new.average_rating ? Number(payload.new.average_rating) : undefined, createdAt: new Date(payload.new.created_at) } as Professional;
        setProfessionals(prev => prev.map(p => p.id === updated.id ? updated : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'professionals' }, (payload) => {
        setProfessionals(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    const patientsChannel = supabase
      .channel('patients-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'patients' }, (payload) => {
        const newPatient = { ...payload.new, fullName: payload.new.full_name, createdAt: new Date(payload.new.created_at) } as Patient;
        setPatients(prev => [...prev, newPatient]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'patients' }, (payload) => {
        const updated = { ...payload.new, fullName: payload.new.full_name, createdAt: new Date(payload.new.created_at) } as Patient;
        setPatients(prev => prev.map(p => p.id === updated.id ? updated : p));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'patients' }, (payload) => {
        setPatients(prev => prev.filter(p => p.id !== payload.old.id));
      })
      .subscribe();

    const appointmentsChannel = supabase
      .channel('appointments-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, () => {
        loadAppointments(); // Mantém carregamento completo por causa do join com patients
      })
      .subscribe();

    const sessionsChannel = supabase
      .channel('sessions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sessions' }, (payload) => {
        const newSession: Session = { 
          id: payload.new.id,
          patientId: payload.new.patient_id,
          date: new Date(payload.new.date),
          type: payload.new.type,
          sessionType: payload.new.session_type,
          status: payload.new.status,
          amount: Number(payload.new.amount),
          paymentStatus: payload.new.payment_status,
          nextAppointment: payload.new.next_appointment ? new Date(payload.new.next_appointment) : undefined,
          professionalId: payload.new.professional_id || undefined,
          notes: payload.new.notes || undefined
        };
        setSessions(prev => [...prev, newSession]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions' }, (payload) => {
        const updated: Session = { 
          id: payload.new.id,
          patientId: payload.new.patient_id,
          date: new Date(payload.new.date),
          type: payload.new.type,
          sessionType: payload.new.session_type,
          status: payload.new.status,
          amount: Number(payload.new.amount),
          paymentStatus: payload.new.payment_status,
          nextAppointment: payload.new.next_appointment ? new Date(payload.new.next_appointment) : undefined,
          professionalId: payload.new.professional_id || undefined,
          notes: payload.new.notes || undefined
        };
        setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'sessions' }, (payload) => {
        setSessions(prev => prev.filter(s => s.id !== payload.old.id));
      })
      .subscribe();

    const transactionsChannel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transactions' }, (payload) => {
        const newTrans = { 
          ...payload.new, 
          date: new Date(payload.new.date),
          amount: Number(payload.new.amount),
          patientId: payload.new.patient_id || undefined,
          sessionId: payload.new.session_id || undefined
        } as Transaction;
        setTransactions(prev => [newTrans, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'transactions' }, (payload) => {
        const updated = { 
          ...payload.new, 
          date: new Date(payload.new.date),
          amount: Number(payload.new.amount),
          patientId: payload.new.patient_id || undefined,
          sessionId: payload.new.session_id || undefined
        } as Transaction;
        setTransactions(prev => prev.map(t => t.id === updated.id ? updated : t));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'transactions' }, (payload) => {
        setTransactions(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();

    const feedbacksChannel = supabase
      .channel('feedbacks-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'feedbacks' }, () => {
        loadFeedbacks(); // Mantém carregamento completo por causa do join com patients
      })
      .subscribe();

    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, (payload) => {
        const newNotif = { 
          ...payload.new, 
          type: payload.new.type,
          date: new Date(payload.new.date)
        } as Notification;
        setNotifications(prev => [newNotif, ...prev]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications' }, (payload) => {
        const updated = { 
          ...payload.new, 
          type: payload.new.type,
          date: new Date(payload.new.date)
        } as Notification;
        setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'notifications' }, (payload) => {
        setNotifications(prev => prev.filter(n => n.id !== payload.old.id));
      })
      .subscribe();

    const installmentsChannel = supabase
      .channel('installments-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'installments' }, (payload) => {
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
        setInstallments(prev => {
          if (prev.some(i => i.id === newInstallment.id)) return prev;
          return [...prev, newInstallment];
        });
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'installments' }, (payload) => {
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
        setInstallments(prev => prev.map(i => i.id === updated.id ? updated : i));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'installments' }, (payload) => {
        setInstallments(prev => prev.filter(i => i.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(professionalsChannel);
      supabase.removeChannel(patientsChannel);
      supabase.removeChannel(appointmentsChannel);
      supabase.removeChannel(sessionsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(feedbacksChannel);
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(installmentsChannel);
    };
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    await Promise.all([
      loadProfessionals(),
      loadPatients(),
      loadAppointments(),
      loadSessions(),
      loadTransactions(),
      loadFeedbacks(),
      loadNotifications(),
      loadInstallments(),
    ]);
    setLoading(false);
  };

  const loadProfessionals = async () => {
    const { data, error } = await supabase.from('professionals').select('*');
    if (error) {
      console.error('Error loading professionals:', error);
      return;
    }
    setProfessionals((data || []).map(p => ({
      ...p,
      averageRating: p.average_rating ? Number(p.average_rating) : undefined,
      createdAt: new Date(p.created_at),
    })));
  };

  const loadPatients = async () => {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) {
      console.error('Error loading patients:', error);
      return;
    }
    setPatients((data || []).map(p => ({
      ...p,
      fullName: p.full_name,
      createdAt: new Date(p.created_at),
    })));
  };

  const loadAppointments = async () => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*, patients(full_name)')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error loading appointments:', error);
      return;
    }
    
    setAppointments((data || []).map(a => ({
      id: a.id,
      patientId: a.patient_id,
      patientName: a.patients?.full_name || '',
      professionalId: a.professional_id,
      date: new Date(a.date),
      time: a.time,
      status: a.status as AppointmentStatus,
      origin: a.origin as any,
      notes: a.notes || undefined,
      createdAt: new Date(a.created_at),
      sessionId: a.session_id || undefined,
    })));
  };

  const loadSessions = async () => {
    const { data, error } = await supabase.from('sessions').select('*').order('date', { ascending: false });
    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }
    setSessions((data || []).map(s => ({
      ...s,
      patientId: s.patient_id,
      date: new Date(s.date),
      sessionType: s.session_type as any,
      status: s.status as AppointmentStatus,
      amount: Number(s.amount),
      paymentStatus: s.payment_status as any,
      nextAppointment: s.next_appointment ? new Date(s.next_appointment) : undefined,
      professionalId: s.professional_id || undefined,
      createdAt: new Date(s.created_at),
    })));
  };

  const loadTransactions = async () => {
    const { data, error } = await supabase.from('transactions').select('*').order('date', { ascending: false });
    if (error) {
      console.error('Error loading transactions:', error);
      return;
    }
    setTransactions((data || []).map(t => ({
      ...t,
      date: new Date(t.date),
      amount: Number(t.amount),
      patientId: t.patient_id || undefined,
      sessionId: t.session_id || undefined,
    })));
  };

  const loadFeedbacks = async () => {
    const { data, error } = await supabase
      .from('feedbacks')
      .select('*, patients(full_name)')
      .order('date', { ascending: false });
    
    if (error) {
      console.error('Error loading feedbacks:', error);
      return;
    }
    
    setFeedbacks((data || []).map(f => ({
      id: f.id,
      patientId: f.patient_id,
      patientName: f.patients?.full_name || '',
      rating: f.rating,
      comment: f.comment,
      origin: f.origin as any,
      date: new Date(f.date),
      professionalId: f.professional_id || undefined,
    })));
  };

  const loadNotifications = async () => {
    const { data, error } = await supabase.from('notifications').select('*').order('date', { ascending: false });
    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }
    setNotifications((data || []).map(n => ({
      ...n,
      type: n.type as any,
      date: new Date(n.date),
    })));
  };

  const loadInstallments = async () => {
    const { data, error } = await supabase.from('installments').select('*').order('predicted_date', { ascending: true });
    if (error) {
      console.error('Error loading installments:', error);
      return;
    }
    setInstallments((data || []).map(i => ({
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
    })));
  };

  const addAppointment = async (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        patient_id: appointment.patientId,
        professional_id: appointment.professionalId,
        date: appointment.date.toISOString(),
        time: appointment.time,
        status: appointment.status,
        origin: appointment.origin,
        notes: appointment.notes,
        session_id: appointment.sessionId,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao adicionar agendamento', description: error.message, variant: 'destructive' });
      throw error;
    }

    // Criar notificação
    await supabase.from('notifications').insert({
      type: 'agendamento',
      title: 'Novo agendamento',
      message: `${appointment.patientName} agendou consulta para ${appointment.date.toLocaleDateString()}`,
    });
  };

  const updateAppointmentStatus = async (id: string, status: AppointmentStatus) => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
      throw error;
    }

    if (status === 'cancelado' || status === 'falta') {
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        await supabase.from('notifications').insert({
          type: status === 'cancelado' ? 'cancelamento' : 'falta',
          title: status === 'cancelado' ? 'Consulta cancelada' : 'Falta registrada',
          message: `${appointment.patientName} - ${appointment.date.toLocaleDateString()}`,
        });
      }
    }
  };

  const deleteAppointment = async (id: string) => {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir agendamento', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Agendamento excluído com sucesso' });
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    const { error } = await supabase.from('transactions').insert({
      type: transaction.type,
      description: transaction.description,
      amount: transaction.amount,
      date: transaction.date.toISOString(),
      category: transaction.category,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar transação', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Transação adicionada com sucesso' });
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir transação', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Transação excluída com sucesso' });
  };

  const addFeedback = async (feedback: Omit<Feedback, 'id' | 'date'>) => {
    // Buscar patient_id pelo nome
    const { data: patientData } = await supabase
      .from('patients')
      .select('id')
      .eq('full_name', feedback.patientName)
      .single();

    const { error } = await supabase.from('feedbacks').insert({
      patient_id: patientData?.id,
      rating: feedback.rating,
      comment: feedback.comment,
      origin: feedback.origin,
      date: new Date().toISOString(),
      professional_id: feedback.professionalId,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar feedback', description: error.message, variant: 'destructive' });
      throw error;
    }

    if (feedback.rating <= 2) {
      await supabase.from('notifications').insert({
        type: 'feedback',
        title: 'Feedback negativo recebido',
        message: `${feedback.patientName} deixou uma avaliação de ${feedback.rating} estrelas`,
      });
    }
  };

  const addProfessional = async (professional: Omit<Professional, 'id'>) => {
    const { error } = await supabase.from('professionals').insert({
      name: professional.name,
      specialty: professional.specialty,
      email: professional.email,
      phone: professional.phone,
      average_rating: professional.averageRating,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar profissional', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const markNotificationRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao marcar notificação', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const addPatient = async (patient: Omit<Patient, 'id' | 'createdAt'>) => {
    const { error } = await supabase.from('patients').insert({
      full_name: patient.fullName,
      phone: patient.phone,
      email: patient.email,
      origin: patient.origin,
      notes: patient.notes,
    });

    if (error) {
      toast({ title: 'Erro ao adicionar paciente', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Paciente adicionado com sucesso' });
  };

  const updatePatient = async (id: string, patient: Partial<Patient>) => {
    const updateData: any = {};
    if (patient.fullName) updateData.full_name = patient.fullName;
    if (patient.phone) updateData.phone = patient.phone;
    if (patient.email !== undefined) updateData.email = patient.email;
    if (patient.origin) updateData.origin = patient.origin;
    if (patient.notes !== undefined) updateData.notes = patient.notes;

    const { error } = await supabase
      .from('patients')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar paciente', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Paciente atualizado com sucesso' });
  };

  const addSession = async (session: Omit<Session, 'id'> & { installmentsCount?: number; firstPaymentDate?: Date }) => {
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        patient_id: session.patientId,
        date: session.date.toISOString(),
        type: session.type,
        session_type: session.sessionType,
        status: 'sugerido',
        notes: session.notes,
        amount: session.amount,
        payment_status: session.paymentStatus,
        next_appointment: session.nextAppointment?.toISOString(),
        professional_id: session.professionalId,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Erro ao adicionar sessão', description: error.message, variant: 'destructive' });
      throw error;
    }

    // Se houver parcelamento, criar as parcelas
    if (session.installmentsCount && session.installmentsCount > 1 && session.firstPaymentDate) {
      const installmentAmount = session.amount / session.installmentsCount;
      const installmentsToCreate = [];

      for (let i = 0; i < session.installmentsCount; i++) {
        const predictedDate = new Date(session.firstPaymentDate);
        predictedDate.setMonth(predictedDate.getMonth() + i);

        installmentsToCreate.push({
          session_id: data.id,
          installment_number: i + 1,
          total_installments: session.installmentsCount,
          amount: installmentAmount,
          predicted_date: predictedDate.toISOString(),
          paid: false,
        });
      }

      const { data: insData, error: installmentsError } = await supabase
        .from('installments')
        .insert(installmentsToCreate)
        .select('*');

      if (installmentsError) {
        console.error('Error creating installments:', installmentsError);
        toast({ title: 'Erro ao criar parcelas', description: installmentsError.message, variant: 'destructive' });
      } else {
        const mapped = (insData || []).map(i => ({
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
        setInstallments(prev => {
          const newOnes = mapped.filter(n => !prev.some(p => p.id === n.id));
          return [...prev, ...newOnes];
        });
      }
    }

    // Se a sessão foi paga, criar transação
    if (session.paymentStatus === 'pago' && session.amount > 0) {
      await supabase.from('transactions').insert({
        type: 'entrada',
        description: `Pagamento - ${session.type}`,
        amount: session.amount,
        date: session.date.toISOString(),
        category: 'Consulta',
        patient_id: session.patientId,
        session_id: data.id,
      });
    }

    toast({ title: 'Sessão adicionada com sucesso' });
  };

  const updateSession = async (id: string, session: Partial<Session>) => {
    const updateData: any = {};
    if (session.date) updateData.date = session.date.toISOString();
    if (session.type) updateData.type = session.type;
    if (session.sessionType) updateData.session_type = session.sessionType;
    if (session.status) updateData.status = session.status;
    if (session.notes !== undefined) updateData.notes = session.notes;
    if (session.amount !== undefined) updateData.amount = session.amount;
    if (session.paymentStatus) updateData.payment_status = session.paymentStatus;
    if (session.nextAppointment !== undefined) {
      updateData.next_appointment = session.nextAppointment ? session.nextAppointment.toISOString() : null;
    }
    if (session.professionalId !== undefined) updateData.professional_id = session.professionalId;

    const { error } = await supabase
      .from('sessions')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar sessão', description: error.message, variant: 'destructive' });
      throw error;
    }

    // Atualizar transação se necessário
    if (session.paymentStatus === 'pago') {
      const existingSession = sessions.find(s => s.id === id);
      if (existingSession && existingSession.paymentStatus !== 'pago') {
        await supabase.from('transactions').insert({
          type: 'entrada',
          description: `Pagamento - ${existingSession.type}`,
          amount: session.amount || existingSession.amount,
          date: new Date().toISOString(),
          category: 'Consulta',
          patient_id: existingSession.patientId,
          session_id: id,
        });
      }
    }

    toast({ title: 'Sessão atualizada com sucesso' });
  };

  const deleteSession = async (id: string) => {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao excluir sessão', description: error.message, variant: 'destructive' });
      throw error;
    }

    toast({ title: 'Sessão excluída com sucesso' });
  };

  const updateInstallment = async (id: string, data: Partial<Installment>) => {
    const updateData: any = {};
    
    if (data.paid !== undefined) updateData.paid = data.paid;
    if (data.paidDate) updateData.paid_date = data.paidDate.toISOString();
    if (data.predictedDate) updateData.predicted_date = data.predictedDate.toISOString();
    
    const { error } = await supabase
      .from('installments')
      .update(updateData)
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar parcela', description: error.message, variant: 'destructive' });
      throw error;
    }

    // Se a parcela foi marcada como paga, criar uma transação de entrada
    if (data.paid === true) {
      const installment = installments.find(i => i.id === id);
      if (installment && installment.sessionId) {
        const session = sessions.find(s => s.id === installment.sessionId);
        const patient = session ? getPatientById(session.patientId) : null;
        
        await supabase.from('transactions').insert({
          type: 'entrada',
          description: `Parcela ${installment.installmentNumber}/${installment.totalInstallments} - ${session?.type || 'Sessão'}${patient ? ` - ${patient.fullName}` : ''}`,
          amount: installment.amount,
          category: 'Sessões',
          date: data.paidDate?.toISOString() || new Date().toISOString(),
          patient_id: session?.patientId,
          session_id: installment.sessionId,
        });

        // Se todas as parcelas desta sessão estiverem pagas, marcar sessão como paga (sem criar transação extra)
        const sessionInstallments = installments.filter(i => i.sessionId === installment.sessionId);
        const allPaidNow = sessionInstallments.every(i => (i.id === id ? true : i.paid));
        if (allPaidNow) {
          await supabase.from('sessions').update({ payment_status: 'pago' }).eq('id', installment.sessionId);
        }
      }
    }

    toast({ title: 'Parcela atualizada com sucesso' });
  };

  const linkAppointmentToSession = async (sessionId: string, appointmentDate: Date, appointmentTime: string) => {
    const { error } = await supabase
      .from('sessions')
      .update({
        status: 'agendado',
        date: appointmentDate.toISOString(),
      })
      .eq('id', sessionId);

    if (error) {
      toast({ title: 'Erro ao vincular sessão', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);
  const getSessionsByPatientId = (patientId: string) => sessions.filter(s => s.patientId === patientId);
  const getTransactionsByPatientId = (patientId: string) => transactions.filter(t => t.patientId === patientId);
  const getFeedbacksByPatientId = (patientId: string) => feedbacks.filter(f => f.patientId === patientId);
  const getSuggestedSessionsByPatientId = (patientId: string) => 
    sessions.filter(s => s.patientId === patientId && s.status === 'sugerido');

  const value: ClinicContextType = {
    professionals,
    appointments,
    transactions,
    feedbacks,
    notifications,
    patients,
    sessions,
    installments,
    loading,
    addAppointment,
    updateAppointmentStatus,
    deleteAppointment,
    addTransaction,
    deleteTransaction,
    addFeedback,
    addProfessional,
    markNotificationRead,
    addPatient,
    updatePatient,
    addSession,
    updateSession,
    deleteSession,
    getPatientById,
    getSessionsByPatientId,
    getTransactionsByPatientId,
    getFeedbacksByPatientId,
    linkAppointmentToSession,
    getSuggestedSessionsByPatientId,
    updateInstallment,
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
