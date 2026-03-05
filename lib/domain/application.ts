export type ApplicationStatus = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

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
  label: string;
  content: string;
  createdAt: string;
}

export interface ApplicationDocument {
  id: string;
  type: "resume" | "coverLetter" | "portfolio" | "other";
  currentVersionId: string;
  versions: DocumentVersion[];
}

export interface FieldAnswer {
  fieldKey: string;
  label: string;
  answer: string;
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
  documents: ApplicationDocument[];
  fieldAnswers: FieldAnswer[];
  submissionSnapshot?: SubmissionSnapshot;
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
  documents?: ApplicationDocument[];
  submissionSnapshot?: SubmissionSnapshot;
}

export const APPLICATION_STATUS_FLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  Saved: ["Applied", "Rejected"],
  Applied: ["Interview", "Offer", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Rejected"],
  Rejected: [],
};
