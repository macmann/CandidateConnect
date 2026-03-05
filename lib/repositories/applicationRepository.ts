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

interface ApplicationStore {
  applications: Application[];
}

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
    const parsed = JSON.parse(content) as ApplicationStore;
    return {
      applications: Array.isArray(parsed.applications) ? parsed.applications : [],
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
  return {
    id: crypto.randomUUID(),
    candidateName: input.candidateName,
    candidateEmail: input.candidateEmail,
    status: input.status ?? "Saved",
    jobDescription: {
      ...input.jobDescription,
      capturedAt: input.jobDescription.capturedAt ?? timestamp,
    },
    fieldAnswers: input.fieldAnswers ?? [],
    submissionSnapshot: input.submissionSnapshot,
    cvDocumentVersionId: input.cvDocumentVersionId,
    coverDocumentVersionId: input.coverDocumentVersionId,
    salaryExpectation: input.salaryExpectation,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function mergeApplication(existing: Application, patch: Partial<ApplicationInput>): Application {
  const updated: Application = {
    ...existing,
    candidateName: patch.candidateName ?? existing.candidateName,
    candidateEmail: patch.candidateEmail ?? existing.candidateEmail,
    status: patch.status ?? existing.status,
    jobDescription: patch.jobDescription
      ? {
          ...existing.jobDescription,
          ...patch.jobDescription,
          capturedAt: patch.jobDescription.capturedAt ?? existing.jobDescription.capturedAt,
        }
      : existing.jobDescription,
    fieldAnswers: patch.fieldAnswers ?? existing.fieldAnswers,
    submissionSnapshot: patch.submissionSnapshot ?? existing.submissionSnapshot,
    cvDocumentVersionId: patch.cvDocumentVersionId ?? existing.cvDocumentVersionId,
    coverDocumentVersionId: patch.coverDocumentVersionId ?? existing.coverDocumentVersionId,
    salaryExpectation: patch.salaryExpectation ?? existing.salaryExpectation,
    updatedAt: nowIso(),
  };

  return updated;
}

async function hydrateSelection(application: Application): Promise<Application> {
  const [selected, submissionSnapshot] = await Promise.all([
    documentRepository.getSelectedVersionIds(application.id),
    submissionSnapshotRepository.getByApplicationId(application.id),
  ]);

  return {
    ...application,
    submissionSnapshot: submissionSnapshot ?? application.submissionSnapshot,
    cvDocumentVersionId: selected.cvDocumentVersionId ?? application.cvDocumentVersionId,
    coverDocumentVersionId: selected.coverDocumentVersionId ?? application.coverDocumentVersionId,
  };
}

export class ApplicationRepository {
  async list(): Promise<Application[]> {
    const store = await readStore();
    const hydrated = await Promise.all(
      store.applications.map((application) => hydrateSelection(application)),
    );
    return hydrated.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
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

    const updated = {
      ...current,
      status: nextStatus,
      updatedAt: nowIso(),
    };

    store.applications[index] = updated;
    await writeStore(store);
    return updated;
  }
}

export const applicationRepository = new ApplicationRepository();
