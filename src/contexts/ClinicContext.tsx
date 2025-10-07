import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, Professional, Transaction, Feedback, Notification, Patient, Session } from '@/types';
import { mockProfessionals, mockAppointments, mockTransactions, mockFeedbacks, mockPatients, mockSessions } from '@/data/mockData';

interface ClinicContextType {
  professionals: Professional[];
  appointments: Appointment[];
  transactions: Transaction[];
  feedbacks: Feedback[];
  notifications: Notification[];
  patients: Patient[];
  sessions: Session[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'date'>) => void;
  addProfessional: (professional: Omit<Professional, 'id'>) => void;
  markNotificationRead: (id: string) => void;
  addPatient: (patient: Omit<Patient, 'id' | 'createdAt'>) => void;
  updatePatient: (id: string, patient: Partial<Patient>) => void;
  addSession: (session: Omit<Session, 'id'>) => void;
  updateSession: (id: string, session: Partial<Session>) => void;
  getPatientById: (id: string) => Patient | undefined;
  getSessionsByPatientId: (patientId: string) => Session[];
  getTransactionsByPatientId: (patientId: string) => Transaction[];
  getFeedbacksByPatientId: (patientId: string) => Feedback[];
}

const ClinicContext = createContext<ClinicContextType | undefined>(undefined);

export const useClinic = () => {
  const context = useContext(ClinicContext);
  if (!context) throw new Error('useClinic must be used within ClinicProvider');
  return context;
};

export const ClinicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [professionals, setProfessionals] = useState<Professional[]>(mockProfessionals);
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(mockFeedbacks);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [sessions, setSessions] = useState<Session[]>(mockSessions);

  const addAppointment = (appointment: Omit<Appointment, 'id' | 'createdAt'>) => {
    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setAppointments(prev => [...prev, newAppointment]);
    
    // Criar notificação
    setNotifications(prev => [{
      id: crypto.randomUUID(),
      type: 'agendamento',
      title: 'Novo agendamento',
      message: `${appointment.patientName} agendou consulta para ${appointment.date.toLocaleDateString()}`,
      date: new Date(),
      read: false,
    }, ...prev]);
  };

  const updateAppointmentStatus = (id: string, status: Appointment['status']) => {
    setAppointments(prev =>
      prev.map(app => app.id === id ? { ...app, status } : app)
    );

    if (status === 'cancelado' || status === 'falta') {
      const appointment = appointments.find(a => a.id === id);
      if (appointment) {
        setNotifications(prev => [{
          id: crypto.randomUUID(),
          type: status === 'cancelado' ? 'cancelamento' : 'falta',
          title: status === 'cancelado' ? 'Consulta cancelada' : 'Falta registrada',
          message: `${appointment.patientName} - ${appointment.date.toLocaleDateString()}`,
          date: new Date(),
          read: false,
        }, ...prev]);
      }
    }
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    setTransactions(prev => [...prev, { ...transaction, id: crypto.randomUUID() }]);
  };

  const addFeedback = (feedback: Omit<Feedback, 'id' | 'date'>) => {
    const newFeedback: Feedback = {
      ...feedback,
      id: crypto.randomUUID(),
      date: new Date(),
    };
    setFeedbacks(prev => [...prev, newFeedback]);

    if (feedback.rating <= 2) {
      setNotifications(prev => [{
        id: crypto.randomUUID(),
        type: 'feedback',
        title: 'Feedback negativo recebido',
        message: `${feedback.patientName} deu nota ${feedback.rating}`,
        date: new Date(),
        read: false,
      }, ...prev]);
    }
  };

  const addProfessional = (professional: Omit<Professional, 'id'>) => {
    setProfessionals(prev => [...prev, { ...professional, id: crypto.randomUUID() }]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const addPatient = (patient: Omit<Patient, 'id' | 'createdAt'>) => {
    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    };
    setPatients(prev => [...prev, newPatient]);
  };

  const updatePatient = (id: string, patient: Partial<Patient>) => {
    setPatients(prev =>
      prev.map(p => p.id === id ? { ...p, ...patient } : p)
    );
  };

  const addSession = (session: Omit<Session, 'id'>) => {
    const newSession: Session = {
      ...session,
      id: crypto.randomUUID(),
    };
    setSessions(prev => [...prev, newSession]);

    // Se a sessão está paga, criar transação automaticamente
    if (session.paymentStatus === 'pago') {
      const patient = patients.find(p => p.id === session.patientId);
      addTransaction({
        type: 'entrada',
        description: `${session.type} - ${patient?.fullName || 'Paciente'}`,
        amount: session.amount,
        date: session.date,
        category: session.type,
      });
    }
  };

  const updateSession = (id: string, session: Partial<Session>) => {
    setSessions(prev => {
      const oldSession = prev.find(s => s.id === id);
      const updated = prev.map(s => s.id === id ? { ...s, ...session } : s);
      
      // Se mudou para pago, criar transação
      if (oldSession && oldSession.paymentStatus === 'em_aberto' && session.paymentStatus === 'pago') {
        const patient = patients.find(p => p.id === oldSession.patientId);
        addTransaction({
          type: 'entrada',
          description: `${oldSession.type} - ${patient?.fullName || 'Paciente'}`,
          amount: oldSession.amount,
          date: oldSession.date,
          category: oldSession.type,
        });
      }
      
      return updated;
    });
  };

  const getPatientById = (id: string) => patients.find(p => p.id === id);

  const getSessionsByPatientId = (patientId: string) => 
    sessions.filter(s => s.patientId === patientId).sort((a, b) => b.date.getTime() - a.date.getTime());

  const getTransactionsByPatientId = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return [];
    return transactions.filter(t => t.description.includes(patient.fullName));
  };

  const getFeedbacksByPatientId = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return [];
    return feedbacks.filter(f => f.patientName === patient.fullName);
  };

  return (
    <ClinicContext.Provider
      value={{
        professionals,
        appointments,
        transactions,
        feedbacks,
        notifications,
        patients,
        sessions,
        addAppointment,
        updateAppointmentStatus,
        addTransaction,
        addFeedback,
        addProfessional,
        markNotificationRead,
        addPatient,
        updatePatient,
        addSession,
        updateSession,
        getPatientById,
        getSessionsByPatientId,
        getTransactionsByPatientId,
        getFeedbacksByPatientId,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};
