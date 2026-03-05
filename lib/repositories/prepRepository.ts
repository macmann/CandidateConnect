import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DebriefArtifact, PrepArtifact, RoundDebrief } from "@/lib/domain/application";

interface PrepStore {
  prepArtifacts: PrepArtifact[];
  debriefs: RoundDebrief[];
  debriefArtifacts: DebriefArtifact[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "prep-artifacts.json");
const defaultStore: PrepStore = { prepArtifacts: [], debriefs: [], debriefArtifacts: [] };
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
    return store.prepArtifacts.filter((p) => p.round_id === roundId).sort((a,b)=>b.version-a.version);
  }

  async createPrep(input: Omit<PrepArtifact, "id" | "created_at" | "version">): Promise<PrepArtifact> {
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

  async saveDebriefArtifact(input: Omit<DebriefArtifact, "id" | "created_at">): Promise<DebriefArtifact> {
    const store = await readStore();
    const artifact: DebriefArtifact = { ...input, id: crypto.randomUUID(), created_at: nowIso() };
    store.debriefArtifacts.push(artifact);
    await writeStore(store);
    return artifact;
  }

  async listDebriefs(roundId: string): Promise<RoundDebrief[]> {
    const store = await readStore();
    return store.debriefs.filter((d) => d.round_id === roundId);
  }

  async listDebriefArtifacts(roundId: string): Promise<DebriefArtifact[]> {
    const store = await readStore();
    return store.debriefArtifacts.filter((d) => d.round_id === roundId);
  }
}

export const prepRepository = new PrepRepository();
