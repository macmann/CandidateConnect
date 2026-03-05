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
  locked_at?: string;
  created_at: string;
  updated_at: string;
}

export interface SubmissionSnapshot {
  id: string;
  application_id: string;
  cv_version_id: string;
  cover_version_id: string;
  salary_expectation: string;
  jd_snapshot_ref: string;
  field_answer_refs: string[];
  submitted_at: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  job_url: string;
  status: ApplicationStatus;
  salary_expectation: string;
  applied_date: string;
  notes: string;
  created_at: string;
  updated_at: string;

  // Backward compatibility aliases for existing callers.
  candidateName: string;
  candidateEmail: string;
  jobDescription: JobDescriptionSnapshot;
  fieldAnswers: FieldAnswer[];
  submissionSnapshot?: SubmissionSnapshot;
  cvDocumentVersionId?: string;
  coverDocumentVersionId?: string;
  salaryExpectation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationInput {
  candidateName: string;
  candidateEmail: string;
  company: string;
  role: string;
  location?: string;
  job_url?: string;
  status?: ApplicationStatus;
  salary_expectation?: string;
  applied_date?: string;
  notes?: string;
  created_at?: string;
  jobDescription: Omit<JobDescriptionSnapshot, "capturedAt"> & {
    capturedAt?: string;
  };
  fieldAnswers?: FieldAnswer[];
  submissionSnapshot?: SubmissionSnapshot;
  cvDocumentVersionId?: string;
  coverDocumentVersionId?: string;
  salaryExpectation?: string;
}

export const APPLICATION_STATUS_FLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  Saved: ["Applied", "Rejected"],
  Applied: ["Interview", "Offer", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Rejected"],
  Rejected: [],
};
