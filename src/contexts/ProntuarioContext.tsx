import React, { createContext, useContext, useState, useEffect } from "react";
import {
  OdontogramProcedure,
  PatientPhoto,
  PhotoCategory,
  AnamneseQuestion,
  AnamneseResponse,
  AnamneseAnswerRecord,
  AnamneseQuestionType,
  AnamneseStatus,
  ReturnAlert,
  PatientDocument,
} from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "./ClinicContext";

interface ProntuarioContextType {
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
  returnAlerts: ReturnAlert[];
  addReturnAlert: (patientId: string, returnDate: Date, notes?: string) => Promise<void>;
  deleteReturnAlert: (id: string) => Promise<void>;
  sendReturnAlertWhatsApp: (id: string) => Promise<void>;
}

const ProntuarioContext = createContext<ProntuarioContextType | undefined>(undefined);

export const useProntuario = () => {
  const context = useContext(ProntuarioContext);
  if (!context) throw new Error("useProntuario must be used within ProntuarioProvider");
  return context;
};

export const ProntuarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [odontogramProcedures, setOdontogramProcedures] = useState<OdontogramProcedure[]>([]);
  const [patientPhotos, setPatientPhotos] = useState<PatientPhoto[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>([]);
  const [anamneseQuestions, setAnamneseQuestions] = useState<AnamneseQuestion[]>([]);
  const [anamneseResponses, setAnamneseResponses] = useState<AnamneseResponse[]>([]);
  const [returnAlerts, setReturnAlerts] = useState<ReturnAlert[]>([]);
  const { toast } = useToast();
  const { getPatientById, clinicSettings, updatePatient, loading: clinicLoading } = useClinic();

  useEffect(() => {
    Promise.all([
      loadOdontogramProcedures(),
      loadPatientPhotos(),
      loadPatientDocuments(),
      loadAnamneseData(),
      loadReturnAlerts(),
    ]);
  }, []);

  // Auto-envio de alertas de retorno vencidos ao carregar o app
  useEffect(() => {
    if (clinicLoading || returnAlerts.length === 0) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const overdue = returnAlerts.filter(a => {
      if (a.whatsappSent) return false;
      const rd = new Date(a.returnDate); rd.setHours(0, 0, 0, 0);
      return rd <= today;
    });
    overdue.forEach(a => sendReturnAlertWhatsApp(a.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicLoading]);

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
    setAnamneseQuestions(prev => prev.map(q => q.id === id ? { ...q, ...data } : q));
  };

  const deleteAnamneseQuestion = async (id: string) => {
    // Soft delete via FK constraint com anamnese_answers.question_id
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
    const code = String(Math.floor(100000 + Math.random() * 900000));
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

  const value: ProntuarioContextType = {
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
    returnAlerts,
    addReturnAlert,
    deleteReturnAlert,
    sendReturnAlertWhatsApp,
  };

  return <ProntuarioContext.Provider value={value}>{children}</ProntuarioContext.Provider>;
};
