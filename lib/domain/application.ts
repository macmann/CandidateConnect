export type ApplicationStatus = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

export type DocumentType = "CV" | "Cover";

export interface JobDescriptionSnapshot {
  title: string;
  company: string;
  location?: string;
  description: string;
  sourceUrl?: string;
  capturedAt: string;
}

export interface DocumentVersion {
  id: string;
  type: DocumentType;
  label: string;
  fileUrl?: string;
  text?: string;
  createdAt: string;
}

export interface ApplicationDocument {
  applicationId: string;
  documentVersionId: string;
}

export interface FieldAnswer {
  id: string;
  application_id: string;
  question: string;
  ai_draft: string;
  final_answer: string;
  snapshot_id?: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionSnapshot {
  submittedAt: string;
  channel: "company_site" | "linkedin" | "referral" | "email" | "other";
  confirmationCode?: string;
  notes?: string;
}

export interface Application {
  id: string;
  candidateName: string;
  candidateEmail: string;
  status: ApplicationStatus;
  jobDescription: JobDescriptionSnapshot;
  fieldAnswers: FieldAnswer[];
  submissionSnapshot?: SubmissionSnapshot;
  cvDocumentVersionId?: string;
  coverDocumentVersionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationInput {
  candidateName: string;
  candidateEmail: string;
  status?: ApplicationStatus;
  jobDescription: Omit<JobDescriptionSnapshot, "capturedAt"> & {
    capturedAt?: string;
  };
  fieldAnswers?: FieldAnswer[];
  submissionSnapshot?: SubmissionSnapshot;
  cvDocumentVersionId?: string;
  coverDocumentVersionId?: string;
}

export const APPLICATION_STATUS_FLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  Saved: ["Applied", "Rejected"],
  Applied: ["Interview", "Offer", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Rejected"],
  Rejected: [],
};
