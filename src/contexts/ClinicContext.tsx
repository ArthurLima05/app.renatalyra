import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, Professional, Transaction, Feedback, Notification } from '@/types';
import { mockProfessionals, mockAppointments, mockTransactions, mockFeedbacks } from '@/data/mockData';

interface ClinicContextType {
  professionals: Professional[];
  appointments: Appointment[];
  transactions: Transaction[];
  feedbacks: Feedback[];
  notifications: Notification[];
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  updateAppointmentStatus: (id: string, status: Appointment['status']) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'date'>) => void;
  addProfessional: (professional: Omit<Professional, 'id'>) => void;
  markNotificationRead: (id: string) => void;
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

  return (
    <ClinicContext.Provider
      value={{
        professionals,
        appointments,
        transactions,
        feedbacks,
        notifications,
        addAppointment,
        updateAppointmentStatus,
        addTransaction,
        addFeedback,
        addProfessional,
        markNotificationRead,
      }}
    >
      {children}
    </ClinicContext.Provider>
  );
};
