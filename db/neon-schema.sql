-- CandidateConnect baseline schema for Neon Postgres
-- UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_name TEXT NOT NULL DEFAULT '',
  candidate_email TEXT NOT NULL DEFAULT '',
  cv_base TEXT NOT NULL DEFAULT '',
  cv_versions_base_notes TEXT NOT NULL DEFAULT '',
  cover_letter_base TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  job_url TEXT NOT NULL DEFAULT '',
  salary_expectation TEXT NOT NULL DEFAULT '',
  applied_date TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  candidate_name TEXT NOT NULL DEFAULT '',
  candidate_email TEXT NOT NULL DEFAULT '',
  contact_person TEXT NOT NULL DEFAULT '',
  source_platform TEXT NOT NULL DEFAULT '',
  cv_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  cover_letter_submitted BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL,
  job_description JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  cv_document_version_id UUID NULL,
  cover_document_version_id UUID NULL
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NULL REFERENCES applications(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('CV', 'COVER')),
  label TEXT NOT NULL,
  text TEXT NOT NULL,
  source TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (application_id, kind, version)
);

ALTER TABLE applications
  ADD CONSTRAINT applications_cv_document_fk
  FOREIGN KEY (cv_document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

ALTER TABLE applications
  ADD CONSTRAINT applications_cover_document_fk
  FOREIGN KEY (cover_document_version_id) REFERENCES document_versions(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS submission_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  cv_version_id UUID NOT NULL REFERENCES document_versions(id),
  cover_version_id UUID NOT NULL REFERENCES document_versions(id),
  jd_snapshot JSONB NOT NULL,
  answers JSONB NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_versions_application
  ON document_versions(application_id, kind, version DESC);

CREATE INDEX IF NOT EXISTS idx_submission_snapshots_application
  ON submission_snapshots(application_id, submitted_at DESC);
