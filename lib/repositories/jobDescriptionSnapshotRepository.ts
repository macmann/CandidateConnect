import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  JobDescriptionSnapshot,
  JobDescriptionSnapshotInput,
} from "@/lib/domain/jobDescriptionSnapshot";

interface JobDescriptionSnapshotStore {
  snapshots: JobDescriptionSnapshot[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "job-description-snapshots.json");

const defaultStore: JobDescriptionSnapshotStore = { snapshots: [] };

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<JobDescriptionSnapshotStore> {
  await ensureStore();
  const content = await readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(content) as JobDescriptionSnapshotStore;
    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: JobDescriptionSnapshotStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowIso() {
  return new Date().toISOString();
}

function createSnapshot(input: JobDescriptionSnapshotInput): JobDescriptionSnapshot {
  return {
    application_id: input.application_id,
    raw_text: input.raw_text,
    created_at: nowIso(),
  };
}

export class JobDescriptionSnapshotRepository {
  async getByApplicationId(applicationId: string): Promise<JobDescriptionSnapshot | null> {
    const store = await readStore();
    return store.snapshots.find((snapshot) => snapshot.application_id === applicationId) ?? null;
  }

  async create(input: JobDescriptionSnapshotInput): Promise<JobDescriptionSnapshot> {
    const store = await readStore();
    const snapshot = createSnapshot(input);
    store.snapshots.push(snapshot);
    await writeStore(store);
    return snapshot;
  }

  async updateRawText(
    applicationId: string,
    rawText: string,
  ): Promise<JobDescriptionSnapshot | null> {
    const store = await readStore();
    const index = store.snapshots.findIndex((snapshot) => snapshot.application_id === applicationId);

    if (index < 0) return null;

    const updated = {
      ...store.snapshots[index],
      raw_text: rawText,
    };

    store.snapshots[index] = updated;
    await writeStore(store);
    return updated;
  }

  async deleteByApplicationId(applicationId: string): Promise<boolean> {
    const store = await readStore();
    const before = store.snapshots.length;
    store.snapshots = store.snapshots.filter((snapshot) => snapshot.application_id !== applicationId);
    const removed = before !== store.snapshots.length;

    if (removed) {
      await writeStore(store);
    }

    return removed;
  }
}

export const jobDescriptionSnapshotRepository = new JobDescriptionSnapshotRepository();
