export interface JobDescriptionSnapshot {
  application_id: string;
  raw_text: string;
  created_at: string;
  locked_at?: string;
}

export interface JobDescriptionSnapshotInput {
  application_id: string;
  raw_text: string;
}
