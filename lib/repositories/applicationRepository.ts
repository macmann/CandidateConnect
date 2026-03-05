import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import {
  APPLICATION_STATUS_FLOW,
  Application,
  ApplicationInput,
  ApplicationStatus,
} from "@/lib/domain/application";

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
    documents: input.documents ?? [],
    fieldAnswers: input.fieldAnswers ?? [],
    submissionSnapshot: input.submissionSnapshot,
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
    documents: patch.documents ?? existing.documents,
    submissionSnapshot: patch.submissionSnapshot ?? existing.submissionSnapshot,
    updatedAt: nowIso(),
  };

  return updated;
}

export class ApplicationRepository {
  async list(): Promise<Application[]> {
    const store = await readStore();
    return store.applications.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  async getById(id: string): Promise<Application | null> {
    const store = await readStore();
    return store.applications.find((app) => app.id === id) ?? null;
  }

  async create(input: ApplicationInput): Promise<Application> {
    const store = await readStore();
    const application = createApplication(input);
    store.applications.push(application);
    await writeStore(store);
    return application;
  }

  async update(id: string, patch: Partial<ApplicationInput>): Promise<Application | null> {
    const store = await readStore();
    const index = store.applications.findIndex((app) => app.id === id);

    if (index < 0) return null;

    const current = store.applications[index];
    const updated = mergeApplication(current, patch);
    store.applications[index] = updated;
    await writeStore(store);
    return updated;
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
