import { createContext, useContext } from "react";
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
  TreatmentPlanStatus,
} from "@/types";

export interface ProntuarioContextType {
  odontogramProcedures: OdontogramProcedure[];
  addOdontogramProcedure: (proc: Omit<OdontogramProcedure, "id" | "createdAt">) => Promise<void>;
  deleteOdontogramProcedure: (id: string) => Promise<void>;
  getOdontogramByPatientId: (patientId: string) => OdontogramProcedure[];
  anamneseQuestions: AnamneseQuestion[];
  anamneseResponses: AnamneseResponse[];
  addAnamneseQuestion: (question: string, type: AnamneseQuestionType, sequence: number, options?: string[]) => Promise<void>;
  updateAnamneseQuestion: (id: string, data: Partial<Pick<AnamneseQuestion, 'question' | 'sequence' | 'type' | 'active' | 'options'>>) => Promise<void>;
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
  treatmentPlans: TreatmentPlan[];
  addTreatmentPlan: (
    plan: Omit<TreatmentPlan, "id" | "createdAt" | "items">,
    items: Omit<TreatmentPlanItem, "id" | "planId" | "createdAt">[]
  ) => Promise<void>;
  updateTreatmentPlan: (
    id: string,
    plan: Partial<Pick<TreatmentPlan, "title" | "status" | "advanceValue" | "notes" | "professionalId">>,
    items: Omit<TreatmentPlanItem, "id" | "planId" | "createdAt">[]
  ) => Promise<void>;
  deleteTreatmentPlan: (id: string) => Promise<void>;
  getTreatmentPlansByPatientId: (patientId: string) => TreatmentPlan[];
}

export const ProntuarioContext = createContext<ProntuarioContextType | undefined>(undefined);

export const useProntuario = () => {
  const context = useContext(ProntuarioContext);
  if (!context) throw new Error("useProntuario must be used within ProntuarioProvider");
  return context;
};
