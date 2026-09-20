import React, { useState } from "react";
import {
  OdontogramProcedure,
  PatientPhoto,
  PhotoCategory,
  AnamneseQuestion,
  AnamneseResponse,
  AnamneseAnswerRecord,
  AnamneseQuestionType,
  ReturnAlert,
  PatientDocument,
  TreatmentPlan,
  TreatmentPlanItem,
} from "@/types";
import { useToast } from "@/hooks/use-toast";
import { useClinic } from "./base/clinicContextBase";
import { ProntuarioContext, ProntuarioContextType } from "./base/prontuarioContextBase";

const uid = () => crypto.randomUUID();

export const DemoProntuarioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [odontogramProcedures, setOdontogramProcedures] = useState<OdontogramProcedure[]>([]);
  const [patientPhotos, setPatientPhotos] = useState<PatientPhoto[]>([]);
  const [patientDocuments, setPatientDocuments] = useState<PatientDocument[]>([]);
  const [anamneseQuestions, setAnamneseQuestions] = useState<AnamneseQuestion[]>([]);
  const [anamneseResponses, setAnamneseResponses] = useState<AnamneseResponse[]>([]);
  const [returnAlerts, setReturnAlerts] = useState<ReturnAlert[]>([]);
  const [treatmentPlans, setTreatmentPlans] = useState<TreatmentPlan[]>([]);
  const { toast } = useToast();
  const { updatePatient } = useClinic();

  const addOdontogramProcedure = async (proc: Omit<OdontogramProcedure, "id" | "createdAt">) => {
    setOdontogramProcedures((prev) => [...prev, { ...proc, id: uid(), createdAt: new Date() }]);
    toast({ title: "Procedimento salvo com sucesso" });
  };

  const deleteOdontogramProcedure = async (id: string) => {
    setOdontogramProcedures((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Procedimento excluído" });
  };

  const getOdontogramByPatientId = (patientId: string) => odontogramProcedures.filter((p) => p.patientId === patientId);

  const addAnamneseQuestion = async (question: string, type: AnamneseQuestionType, sequence: number, options?: string[]) => {
    setAnamneseQuestions((prev) => [...prev, { id: uid(), question, type, sequence, options, active: true, createdAt: new Date() }]);
  };

  const updateAnamneseQuestion = async (id: string, data: Partial<Pick<AnamneseQuestion, 'question' | 'sequence' | 'type' | 'active' | 'options'>>) => {
    setAnamneseQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, ...data } : q)));
  };

  const deleteAnamneseQuestion = async (id: string) => {
    setAnamneseQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, active: false } : q)));
    toast({ title: "Pergunta excluída" });
  };

  const saveAnamneseResponse = async (patientId: string, answers: Omit<AnamneseAnswerRecord, 'id' | 'responseId'>[]) => {
    const responseId = uid();
    setAnamneseResponses((prev) => [{
      id: responseId,
      patientId,
      status: 'completed',
      completedAt: new Date(),
      createdAt: new Date(),
      answers: answers.map((a) => ({ ...a, id: uid(), responseId })),
    }, ...prev]);
    toast({ title: "Anamnese salva com sucesso" });
  };

  const requestAnamneseForPatient = async (patientId: string) => {
    const existing = anamneseResponses.find((r) => r.patientId === patientId);
    if (existing) {
      toast({ title: "Anamnese já existe", description: "Exclua a anamnese atual antes de solicitar uma nova.", variant: "destructive" });
      throw new Error("patient_already_has_anamnese");
    }
    const token = uid();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setAnamneseResponses((prev) => [{
      id: uid(), patientId, status: 'sent', token, code, createdAt: new Date(), answers: [],
    }, ...prev]);
    toast({ title: "Link gerado com sucesso" });
    return { link: `https://demo.techclin.com.br/anamnese/${token}`, code };
  };

  const sendAnamneseViaWhatsapp = async () => {
    toast({ title: "Mensagem simulada (demonstração)" });
  };

  const getAnamneseByPatientId = (patientId: string) => {
    const all = anamneseResponses.filter((r) => r.patientId === patientId);
    return all.length > 0 ? [all[0]] : [];
  };

  const deleteAnamneseResponse = async (id: string) => {
    setAnamneseResponses((prev) => prev.filter((r) => r.id !== id));
    toast({ title: "Anamnese excluída" });
  };

  const getPhotosByPatientId = (patientId: string) => patientPhotos.filter((p) => p.patientId === patientId);

  const addPatientPhoto = async (patientId: string, file: File, caption: string, category: PhotoCategory) => {
    setPatientPhotos((prev) => [{
      id: uid(), patientId, url: URL.createObjectURL(file), caption: caption || undefined, category, createdAt: new Date(),
    }, ...prev]);
    toast({ title: "Foto adicionada com sucesso" });
  };

  const deletePatientPhoto = async (id: string) => {
    setPatientPhotos((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Foto excluída" });
  };

  const updatePatientAvatar = async (patientId: string, file: File) => {
    await updatePatient(patientId, { avatarUrl: URL.createObjectURL(file) } as any);
  };

  const getDocumentsByPatientId = (patientId: string) => patientDocuments.filter((d) => d.patientId === patientId);

  const addPatientDocument = async (patientId: string, file: File) => {
    setPatientDocuments((prev) => [{
      id: uid(), patientId, name: file.name, url: URL.createObjectURL(file), fileType: file.type, fileSize: file.size, createdAt: new Date(),
    }, ...prev]);
    toast({ title: "Documento adicionado" });
  };

  const deletePatientDocument = async (id: string) => {
    setPatientDocuments((prev) => prev.filter((d) => d.id !== id));
    toast({ title: "Documento excluído" });
  };

  const addReturnAlert = async (patientId: string, returnDate: Date, notes?: string) => {
    setReturnAlerts((prev) => [...prev, {
      id: uid(), patientId, returnDate, notes, whatsappSent: false, createdAt: new Date(),
    }]);
    toast({ title: "Alerta de retorno criado" });
  };

  const deleteReturnAlert = async (id: string) => {
    setReturnAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const sendReturnAlertWhatsApp = async (id: string) => {
    setReturnAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, whatsappSent: true, whatsappSentAt: new Date() } : a)));
    toast({ title: "✅ Alerta enviado (simulado na demonstração)" });
  };

  const addTreatmentPlan = async (
    plan: Omit<TreatmentPlan, "id" | "createdAt" | "items">,
    items: Omit<TreatmentPlanItem, "id" | "planId" | "createdAt">[]
  ) => {
    const planId = uid();
    setTreatmentPlans((prev) => [{
      ...plan,
      id: planId,
      createdAt: new Date(),
      items: items.map((it) => ({ ...it, id: uid(), planId, createdAt: new Date() })),
    }, ...prev]);
    toast({ title: "Plano de tratamento criado com sucesso" });
  };

  const updateTreatmentPlan = async (
    id: string,
    plan: Partial<Pick<TreatmentPlan, "title" | "status" | "advanceValue" | "notes" | "professionalId">>,
    items: Omit<TreatmentPlanItem, "id" | "planId" | "createdAt">[]
  ) => {
    setTreatmentPlans((prev) => prev.map((p) => p.id === id
      ? { ...p, ...plan, items: items.map((it) => ({ ...it, id: uid(), planId: id, createdAt: new Date() })) }
      : p));
    toast({ title: "Plano de tratamento atualizado" });
  };

  const deleteTreatmentPlan = async (id: string) => {
    setTreatmentPlans((prev) => prev.filter((p) => p.id !== id));
    toast({ title: "Plano de tratamento excluído" });
  };

  const getTreatmentPlansByPatientId = (patientId: string) =>
    treatmentPlans.filter((p) => p.patientId === patientId);

  const value: ProntuarioContextType = {
    odontogramProcedures,
    addOdontogramProcedure,
    deleteOdontogramProcedure,
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
    treatmentPlans,
    addTreatmentPlan,
    updateTreatmentPlan,
    deleteTreatmentPlan,
    getTreatmentPlansByPatientId,
  };

  return <ProntuarioContext.Provider value={value}>{children}</ProntuarioContext.Provider>;
};
