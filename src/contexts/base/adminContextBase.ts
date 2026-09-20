import { createContext, useContext } from "react";
import { Lead, LeadStage, AppUser, UserProfile, AppModule, UserPermission } from "@/types";

export interface AdminContextType {
  appUsers: AppUser[];
  userPermissions: UserPermission[];
  reloadUserPermissions: () => Promise<void>;
  setModuleEnabled: (userId: string, module: AppModule, enabled: boolean) => Promise<void>;
  inviteAppUser: (data: { email: string; fullName: string; phone?: string; profile: UserProfile }) => Promise<void>;
  toggleAppUserActive: (id: string, active: boolean) => Promise<void>;
  updateUserPermission: (userId: string, module: AppModule, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => Promise<void>;
  leads: Lead[];
  addLead: (data: Omit<Lead, 'id' | 'stage' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, data: Partial<Omit<Lead, 'id' | 'createdAt'>>) => Promise<void>;
  moveLeadStage: (id: string, stage: LeadStage, extra?: { lostReason?: string }) => Promise<{ patientId?: string }>;
  deleteLead: (id: string) => Promise<void>;
}

export const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
};
