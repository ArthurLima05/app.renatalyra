import React, { useState } from "react";
import { Lead, LeadStage, AppUser, UserPermission } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { AdminContext, AdminContextType } from "./base/adminContextBase";
import { demoLeads, demoAppUsers, demoUserPermissions } from "@/data/demoSeed";

const uid = () => crypto.randomUUID();

export const DemoAdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appUsers, setAppUsers] = useState<AppUser[]>(demoAppUsers);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>(demoUserPermissions);
  const [leads, setLeads] = useState<Lead[]>(demoLeads);
  const { toast } = useToast();

  const reloadUserPermissions = async () => {};

  const setModuleEnabled = async (userId: string) => {
    toast({ title: "Indisponível na demonstração" });
  };

  const inviteAppUser = async () => {
    toast({ title: "Indisponível na demonstração", description: "Convites de usuário não são enviados na demo." });
  };

  const toggleAppUserActive = async (id: string, active: boolean) => {
    setAppUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
  };

  const updateUserPermission = async () => {
    toast({ title: "Indisponível na demonstração" });
  };

  const addLead = async (data: Omit<Lead, 'id' | 'stage' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date();
    setLeads((prev) => [{ ...data, id: uid(), stage: 'novo_lead', createdAt: now, updatedAt: now }, ...prev]);
    toast({ title: "Lead adicionado ao funil" });
  };

  const updateLead = async (id: string, data: Partial<Omit<Lead, 'id' | 'createdAt'>>) => {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...data, updatedAt: new Date() } : l)));
  };

  const moveLeadStage = async (id: string, stage: LeadStage, extra?: { lostReason?: string }) => {
    const lead = leads.find((l) => l.id === id);
    if (!lead) return {};
    const patientId = lead.patientId ?? ((stage === 'consulta_agendada' || stage === 'convertido') ? uid() : undefined);
    setLeads((prev) => prev.map((l) =>
      l.id === id ? { ...l, stage, patientId: patientId ?? l.patientId, lostReason: extra?.lostReason ?? l.lostReason, updatedAt: new Date() } : l
    ));
    return { patientId };
  };

  const deleteLead = async (id: string) => {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  };

  const value: AdminContextType = {
    appUsers,
    userPermissions,
    reloadUserPermissions,
    setModuleEnabled,
    inviteAppUser,
    toggleAppUserActive,
    updateUserPermission,
    leads,
    addLead,
    updateLead,
    moveLeadStage,
    deleteLead,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};
