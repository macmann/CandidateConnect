import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { SubmissionSnapshot } from "@/lib/domain/application";

interface SubmissionSnapshotStore {
  snapshots: SubmissionSnapshot[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "submission-snapshots.json");

const defaultStore: SubmissionSnapshotStore = { snapshots: [] };

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<SubmissionSnapshotStore> {
  await ensureStore();
  const content = await readFile(DATA_FILE, "utf-8");

  try {
    const parsed = JSON.parse(content) as SubmissionSnapshotStore;
    return {
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: SubmissionSnapshotStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowIso(): string {
  return new Date().toISOString();
}

export class SubmissionSnapshotRepository {
  async getByApplicationId(applicationId: string): Promise<SubmissionSnapshot | null> {
    const store = await readStore();
    return store.snapshots.find((snapshot) => snapshot.application_id === applicationId) ?? null;
  }

  async create(
    input: Omit<SubmissionSnapshot, "id" | "submitted_at">,
  ): Promise<SubmissionSnapshot> {
    const store = await readStore();
    const created: SubmissionSnapshot = {
      ...input,
      id: crypto.randomUUID(),
      submitted_at: nowIso(),
    };

    store.snapshots.push(created);
    await writeStore(store);
    return created;
  }
}

export const submissionSnapshotRepository = new SubmissionSnapshotRepository();
