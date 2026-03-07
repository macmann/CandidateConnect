import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  APPLICATION_STATUS_FLOW,
  Application,
  ApplicationInput,
  ApplicationStatus,
} from "@/lib/domain/application";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { submissionSnapshotRepository } from "@/lib/repositories/submissionSnapshotRepository";
import { interviewRoundRepository } from "@/lib/repositories/interviewRoundRepository";

interface ApplicationStore {
  applications: Application[];
}

type LegacyApplicationRecord = Partial<Application> & {
  id?: string;
  candidateName?: string;
  candidateEmail?: string;
  contactPerson?: string;
  company?: string;
  role?: string;
  location?: string;
  job_url?: string;
  salary_expectation?: string;
  applied_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  sourcePlatform?: string;
  cvSubmitted?: boolean;
  coverLetterSubmitted?: boolean;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "applications.json");

const defaultStore: ApplicationStore = { applications: [] };

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<ApplicationStore> {
  await ensureStore();
  const content = await readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(content) as { applications?: LegacyApplicationRecord[] };
    const migrated = (Array.isArray(parsed.applications) ? parsed.applications : []).map(
      normalizeApplication,
    );

    // Persist migration so old JSON records are backfilled once.
    await writeStore({ applications: migrated });

    return {
      applications: migrated,
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: ApplicationStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowIso() {
  return new Date().toISOString();
}

function createApplication(input: ApplicationInput): Application {
  const timestamp = nowIso();
  const jobUrl = input.job_url?.trim() || input.jobDescription.sourceUrl?.trim() || "";
  const location = input.location?.trim() || input.jobDescription.location?.trim() || "";
  const salaryExpectation = input.salary_expectation ?? input.salaryExpectation ?? "";

  return {
    id: crypto.randomUUID(),
    company: input.company,
    role: input.role,
    location,
    job_url: jobUrl,
    salary_expectation: salaryExpectation,
    applied_date: input.applied_date ?? "",
    notes: input.notes ?? "",
    created_at: input.created_at ?? timestamp,
    updated_at: timestamp,
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    contactPerson: input.contactPerson?.trim() ?? "",
    sourcePlatform: input.sourcePlatform?.trim() || "",
    cvSubmitted: Boolean(input.cvSubmitted),
    coverLetterSubmitted: Boolean(input.coverLetterSubmitted),
    status: input.status ?? "Saved",
    jobDescription: {
      ...input.jobDescription,
      title: input.role,
      company: input.company,
      location,
      sourceUrl: jobUrl || undefined,
      capturedAt: input.jobDescription.capturedAt ?? timestamp,
    },
    fieldAnswers: input.fieldAnswers ?? [],
    submissionSnapshot: input.submissionSnapshot,
    cvDocumentVersionId: input.cvDocumentVersionId,
    coverDocumentVersionId: input.coverDocumentVersionId,
    salaryExpectation,
    createdAt: input.created_at ?? timestamp,
    updatedAt: timestamp,
  };
}

function mergeApplication(existing: Application, patch: Partial<ApplicationInput>): Application {
  const updatedTimestamp = nowIso();
  const nextCompany = patch.company ?? existing.company;
  const nextRole = patch.role ?? existing.role;
  const nextLocation = patch.location ?? existing.location;
  const nextJobUrl = patch.job_url ?? existing.job_url;
  const nextSalary =
    patch.salary_expectation ?? patch.salaryExpectation ?? existing.salary_expectation;

  const updated: Application = {
    ...existing,
    company: nextCompany,
    role: nextRole,
    location: nextLocation,
    job_url: nextJobUrl,
    candidateName: patch.candidateName ?? existing.candidateName,
    candidateEmail: patch.candidateEmail ?? existing.candidateEmail,
    contactPerson: patch.contactPerson ?? existing.contactPerson,
    sourcePlatform: patch.sourcePlatform ?? existing.sourcePlatform ?? "",
    cvSubmitted: patch.cvSubmitted ?? existing.cvSubmitted ?? false,
    coverLetterSubmitted: patch.coverLetterSubmitted ?? existing.coverLetterSubmitted ?? false,
    status: patch.status ?? existing.status,
    salary_expectation: nextSalary,
    applied_date: patch.applied_date ?? existing.applied_date,
    notes: patch.notes ?? existing.notes,
    updated_at: updatedTimestamp,
    jobDescription: patch.jobDescription
      ? {
          ...existing.jobDescription,
          ...patch.jobDescription,
          title: nextRole,
          company: nextCompany,
          location: nextLocation,
          sourceUrl: nextJobUrl || undefined,
          capturedAt: patch.jobDescription.capturedAt ?? existing.jobDescription.capturedAt,
        }
      : {
          ...existing.jobDescription,
          title: nextRole,
          company: nextCompany,
          location: nextLocation,
          sourceUrl: nextJobUrl || undefined,
        },
    fieldAnswers: patch.fieldAnswers ?? existing.fieldAnswers,
    submissionSnapshot: patch.submissionSnapshot ?? existing.submissionSnapshot,
    cvDocumentVersionId: patch.cvDocumentVersionId ?? existing.cvDocumentVersionId,
    coverDocumentVersionId: patch.coverDocumentVersionId ?? existing.coverDocumentVersionId,
    salaryExpectation: nextSalary,
    updatedAt: updatedTimestamp,
  };

  return updated;
}

function normalizeApplication(raw: LegacyApplicationRecord): Application {
  const timestamp = nowIso();
  const status: ApplicationStatus = raw.status ?? "Saved";
  const role = raw.role?.trim() || raw.jobDescription?.title?.trim() || "Unknown role";
  const company = raw.company?.trim() || raw.jobDescription?.company?.trim() || "Unknown company";
  const location = raw.location?.trim() || raw.jobDescription?.location?.trim() || "";
  const jobUrl = raw.job_url?.trim() || raw.jobDescription?.sourceUrl?.trim() || "";
  const salaryExpectation = raw.salary_expectation ?? raw.salaryExpectation ?? "";
  const createdAt = raw.created_at ?? raw.createdAt ?? timestamp;
  const updatedAt = raw.updated_at ?? raw.updatedAt ?? createdAt;

  return {
    id: raw.id ?? crypto.randomUUID(),
    company,
    role,
    location,
    job_url: jobUrl,
    status,
    salary_expectation: salaryExpectation,
    applied_date: raw.applied_date ?? "",
    notes: raw.notes ?? "",
    created_at: createdAt,
    updated_at: updatedAt,
    candidateName: raw.candidateName ?? "",
    candidateEmail: raw.candidateEmail ?? "",
    contactPerson: raw.contactPerson ?? "",
    sourcePlatform: raw.sourcePlatform ?? "",
    cvSubmitted: raw.cvSubmitted ?? false,
    coverLetterSubmitted: raw.coverLetterSubmitted ?? false,
    jobDescription: {
      title: role,
      company,
      location,
      description: raw.jobDescription?.description ?? "",
      sourceUrl: jobUrl || undefined,
      capturedAt: raw.jobDescription?.capturedAt ?? createdAt,
    },
    fieldAnswers: raw.fieldAnswers ?? [],
    submissionSnapshot: raw.submissionSnapshot,
    cvDocumentVersionId: raw.cvDocumentVersionId,
    coverDocumentVersionId: raw.coverDocumentVersionId,
    salaryExpectation,
    createdAt,
    updatedAt,
  };
}

async function hydrateSelection(application: Application): Promise<Application> {
  const [selected, submissionSnapshot, interviewRounds] = await Promise.all([
    documentRepository.getSelectedVersionIds(application.id),
    submissionSnapshotRepository.getByApplicationId(application.id),
    interviewRoundRepository.listByApplicationId(application.id),
  ]);

  return {
    ...application,
    submissionSnapshot: submissionSnapshot ?? application.submissionSnapshot,
    cvDocumentVersionId: selected.cvDocumentVersionId ?? application.cvDocumentVersionId,
    coverDocumentVersionId: selected.coverDocumentVersionId ?? application.coverDocumentVersionId,
    interviewRounds,
  };
}

export class ApplicationRepository {
  async list(): Promise<Application[]> {
    const store = await readStore();
    const hydrated = await Promise.all(
      store.applications.map((application) => hydrateSelection(application)),
    );
    return hydrated.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  }

  async getById(id: string): Promise<Application | null> {
    const store = await readStore();
    const application = store.applications.find((app) => app.id === id);
    return application ? hydrateSelection(application) : null;
  }

  async create(input: ApplicationInput): Promise<Application> {
    const store = await readStore();
    const application = createApplication(input);
    store.applications.push(application);
    await writeStore(store);

    await documentRepository.setForApplication(
      application.id,
      [input.cvDocumentVersionId, input.coverDocumentVersionId].filter(Boolean) as string[],
    );

    return hydrateSelection(application);
  }

  async update(id: string, patch: Partial<ApplicationInput>): Promise<Application | null> {
    const store = await readStore();
    const index = store.applications.findIndex((app) => app.id === id);

    if (index < 0) return null;

    const current = store.applications[index];
    const updated = mergeApplication(current, patch);
    store.applications[index] = updated;
    await writeStore(store);

    await documentRepository.setForApplication(
      id,
      [updated.cvDocumentVersionId, updated.coverDocumentVersionId].filter(Boolean) as string[],
    );

    return hydrateSelection(updated);
  }

  async transitionStatus(id: string, nextStatus: ApplicationStatus): Promise<Application | null> {
    const store = await readStore();
    const index = store.applications.findIndex((app) => app.id === id);

    if (index < 0) return null;

    const current = store.applications[index];
    if (current.status === nextStatus) {
      return current;
    }

    if (!APPLICATION_STATUS_FLOW[current.status].includes(nextStatus)) {
      throw new Error(`Invalid status transition from ${current.status} to ${nextStatus}`);
    }

    const updatedTimestamp = nowIso();
    const updated = {
      ...current,
      status: nextStatus,
      updated_at: updatedTimestamp,
      updatedAt: updatedTimestamp,
    };

    store.applications[index] = updated;
    await writeStore(store);
    return updated;
  }
}

export const applicationRepository = new ApplicationRepository();
