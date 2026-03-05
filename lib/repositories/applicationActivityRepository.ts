import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface ApplicationActivity {
  id: string;
  application_id: string;
  message: string;
  created_at: string;
}

interface ActivityStore {
  activities: ApplicationActivity[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "application-activity.json");
const defaultStore: ActivityStore = { activities: [] };

const nowIso = () => new Date().toISOString();

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<ActivityStore> {
  await ensureStore();
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8")) as ActivityStore;
    return { activities: Array.isArray(parsed.activities) ? parsed.activities : [] };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: ActivityStore) {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export class ApplicationActivityRepository {
  async list(applicationId: string): Promise<ApplicationActivity[]> {
    const store = await readStore();
    return store.activities
      .filter((item) => item.application_id === applicationId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async create(applicationId: string, message: string): Promise<ApplicationActivity> {
    const store = await readStore();
    const item: ApplicationActivity = {
      id: crypto.randomUUID(),
      application_id: applicationId,
      message,
      created_at: nowIso(),
    };
    store.activities.push(item);
    await writeStore(store);
    return item;
  }
}

export const applicationActivityRepository = new ApplicationActivityRepository();
