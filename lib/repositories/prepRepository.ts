import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DebriefArtifact,
  PrepArtifact,
  RoundDebrief,
  RoundTaskList,
  TakeHomeChecklistItem,
} from "@/lib/domain/application";

interface PrepStore {
  prepArtifacts: PrepArtifact[];
  debriefs: RoundDebrief[];
  debriefArtifacts: DebriefArtifact[];
  taskLists: RoundTaskList[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "prep-artifacts.json");
const defaultStore: PrepStore = {
  prepArtifacts: [],
  debriefs: [],
  debriefArtifacts: [],
  taskLists: [],
};
const nowIso = () => new Date().toISOString();

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<PrepStore> {
  await ensureStore();
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8")) as PrepStore;
    return {
      prepArtifacts: Array.isArray(parsed.prepArtifacts) ? parsed.prepArtifacts : [],
      debriefs: Array.isArray(parsed.debriefs) ? parsed.debriefs : [],
      debriefArtifacts: Array.isArray(parsed.debriefArtifacts) ? parsed.debriefArtifacts : [],
      taskLists: Array.isArray(parsed.taskLists) ? parsed.taskLists : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: PrepStore) {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export class PrepRepository {
  async listPrep(roundId: string): Promise<PrepArtifact[]> {
    const store = await readStore();
    return store.prepArtifacts
      .filter((p) => p.round_id === roundId)
      .sort((a, b) => b.version - a.version);
  }

  async createPrep(
    input: Omit<PrepArtifact, "id" | "created_at" | "version">,
  ): Promise<PrepArtifact> {
    const store = await readStore();
    const current = store.prepArtifacts.filter((p) => p.round_id === input.round_id);
    const artifact: PrepArtifact = {
      ...input,
      id: crypto.randomUUID(),
      version: (current[0]?.version ?? 0) + 1,
      created_at: nowIso(),
    };
    store.prepArtifacts.push(artifact);
    await writeStore(store);
    return artifact;
  }

  async pin(roundId: string, artifactId: string): Promise<void> {
    const store = await readStore();
    store.prepArtifacts = store.prepArtifacts.map((item) =>
      item.round_id === roundId ? { ...item, pinned: item.id === artifactId } : item,
    );
    await writeStore(store);
  }

  async saveDebrief(input: Omit<RoundDebrief, "id" | "created_at">): Promise<RoundDebrief> {
    const store = await readStore();
    const debrief: RoundDebrief = { ...input, id: crypto.randomUUID(), created_at: nowIso() };
    store.debriefs.push(debrief);
    await writeStore(store);
    return debrief;
  }

  async saveDebriefArtifact(
    input: Omit<DebriefArtifact, "id" | "created_at">,
  ): Promise<DebriefArtifact> {
    const store = await readStore();
    const artifact: DebriefArtifact = { ...input, id: crypto.randomUUID(), created_at: nowIso() };
    store.debriefArtifacts.push(artifact);
    await writeStore(store);
    return artifact;
  }

  async listDebriefs(roundId: string): Promise<RoundDebrief[]> {
    const store = await readStore();
    return store.debriefs
      .filter((debrief) => debrief.round_id === roundId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async listDebriefArtifacts(roundId: string): Promise<DebriefArtifact[]> {
    const store = await readStore();
    return store.debriefArtifacts
      .filter((artifact) => artifact.round_id === roundId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  async getTaskList(roundId: string): Promise<RoundTaskList | null> {
    const store = await readStore();
    return store.taskLists.find((taskList) => taskList.round_id === roundId) ?? null;
  }

  async upsertTaskList(input: {
    round_id: string;
    follow_up_reminder_at?: string;
    take_home_items: Array<Pick<TakeHomeChecklistItem, "id" | "text" | "completed">>;
  }): Promise<RoundTaskList> {
    const store = await readStore();
    const existing = store.taskLists.find((taskList) => taskList.round_id === input.round_id);
    if (existing) {
      existing.follow_up_reminder_at = input.follow_up_reminder_at;
      existing.take_home_items = input.take_home_items;
      existing.updated_at = nowIso();
      await writeStore(store);
      return existing;
    }

    const created: RoundTaskList = {
      id: crypto.randomUUID(),
      round_id: input.round_id,
      follow_up_reminder_at: input.follow_up_reminder_at,
      take_home_items: input.take_home_items,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    store.taskLists.push(created);
    await writeStore(store);
    return created;
  }
}

export const prepRepository = new PrepRepository();
