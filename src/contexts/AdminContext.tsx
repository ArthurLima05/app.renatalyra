import React, { createContext, useContext, useState, useEffect } from "react";
import { Lead, LeadStage, AppUser, UserProfile, AppModule, UserPermission } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AdminContextType {
  appUsers: AppUser[];
  userPermissions: UserPermission[];
  inviteAppUser: (data: { email: string; fullName: string; phone?: string; profile: UserProfile }) => Promise<void>;
  toggleAppUserActive: (id: string, active: boolean) => Promise<void>;
  updateUserPermission: (userId: string, module: AppModule, field: 'canView' | 'canCreate' | 'canEdit' | 'canDelete', value: boolean) => Promise<void>;
  leads: Lead[];
  addLead: (data: Omit<Lead, 'id' | 'stage' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateLead: (id: string, data: Partial<Omit<Lead, 'id' | 'createdAt'>>) => Promise<void>;
  moveLeadStage: (id: string, stage: LeadStage, extra?: { lostReason?: string }) => Promise<{ patientId?: string }>;
  deleteLead: (id: string) => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) throw new Error("useAdmin must be used within AdminProvider");
  return context;
};

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [userPermissions, setUserPermissions] = useState<UserPermission[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    Promise.all([loadAppUsers(), loadUserPermissions(), loadLeads()]);
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
    return { patientId };
  };

  const deleteLead = async (id: string) => {
    const { error } = await (supabase as any).from('leads').delete().eq('id', id);
    if (error) { toast({ title: 'Erro ao excluir lead', description: error.message, variant: 'destructive' }); throw error; }
    setLeads(prev => prev.filter(l => l.id !== id));
  };

  const value: AdminContextType = {
    appUsers,
    userPermissions,
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
