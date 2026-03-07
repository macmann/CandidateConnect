export type ApplicationStatus = "Saved" | "Applied" | "Interview" | "Offer" | "Rejected";

export type DocumentType = "CV" | "Cover";

export type InterviewRoundType =
  | "Recruiter"
  | "Hiring Manager"
  | "Technical"
  | "Case"
  | "Panel"
  | "Final";

export type InterviewRoundStatus =
  | "Scheduled"
  | "Completed"
  | "Passed"
  | "Failed"
  | "Cancelled";

export type InterviewMode = "Online" | "Onsite" | "Phone";

export interface InterviewRound {
  id: string;
  application_id: string;
  round_index: number;
  round_type: InterviewRoundType;
  scheduled_at?: string;
  timezone?: string;
  mode?: InterviewMode;
  location_or_link?: string;
  purpose?: string;
  status: InterviewRoundStatus;
  notes: string;
  created_at: string;
}

export interface Interviewer {
  id: string;
  user_id: string;
  name: string;
  title: string;
  department?: string;
  linkedin_url?: string;
  notes?: string;
  created_at: string;
}

export interface RoundInterviewer {
  round_id: string;
  interviewer_id: string;
}

export interface PrepArtifact {
  id: string;
  round_id: string;
  generated_text: string;
  version: number;
  created_at: string;
  pinned: boolean;
  tone: "concise" | "detailed";
  length: "short" | "full";
  warning?: string;
}

export interface RoundDebrief {
  id: string;
  round_id: string;
  raw_notes: string;
  structured_fields: {
    questions_asked: string;
    went_well: string;
    went_badly: string;
    to_improve: string;
    follow_up_tasks: string;
    follow_up_reminder_at?: string;
    follow_up_reminder_completed: boolean;
    take_home_checklist: Array<{
      id: string;
      label: string;
      checked: boolean;
    }>;
  };
  created_at: string;
}

export interface DebriefArtifact {
  id: string;
  round_id: string;
  generated_summary: string;
  improvements: string;
  next_round_focus: string;
  thank_you_email: string;
  created_at: string;
}

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

  candidateName: string;
  candidateEmail: string;
  contactPerson: string;
  sourcePlatform?: string;
  cvSubmitted: boolean;
  coverLetterSubmitted: boolean;
  jobDescription: JobDescriptionSnapshot;
  fieldAnswers: FieldAnswer[];
  submissionSnapshot?: SubmissionSnapshot;
  interviewRounds?: InterviewRound[];
  cvDocumentVersionId?: string;
  coverDocumentVersionId?: string;
  salaryExpectation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationInput {
  candidateName: string;
  candidateEmail: string;
  contactPerson?: string;
  sourcePlatform?: string;
  company: string;
  role: string;
  location?: string;
  job_url?: string;
  status?: ApplicationStatus;
  salary_expectation?: string;
  applied_date?: string;
  notes?: string;
  cvSubmitted?: boolean;
  coverLetterSubmitted?: boolean;
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

export interface InterviewRoundInput {
  round_type: InterviewRoundType;
  scheduled_at?: string;
  timezone?: string;
  mode?: InterviewMode;
  location_or_link?: string;
  purpose?: string;
  status?: InterviewRoundStatus;
  notes?: string;
}

export const APPLICATION_STATUS_FLOW: Record<ApplicationStatus, ApplicationStatus[]> = {
  Saved: ["Applied", "Rejected"],
  Applied: ["Interview", "Offer", "Rejected"],
  Interview: ["Offer", "Rejected"],
  Offer: ["Rejected"],
  Rejected: [],
};
