export interface UserProfile {
  name: string;
  email: string;
  cvBase: string;
  cvVersionsBaseNotes: string;
  coverLetterBase: string;
  defaultCvDocumentVersionId?: string;
  defaultCoverDocumentVersionId?: string;
  updatedAt: string;
}

export interface UserProfileInput {
  name: string;
  email: string;
  cvBase: string;
  cvVersionsBaseNotes?: string;
  coverLetterBase: string;
  defaultCvDocumentVersionId?: string;
  defaultCoverDocumentVersionId?: string;
}
