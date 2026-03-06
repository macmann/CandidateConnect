import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DebriefArtifact, PrepArtifact, RoundDebrief } from "@/lib/domain/application";

interface PrepStore {
  prepArtifacts: PrepArtifact[];
  debriefs: RoundDebrief[];
  debriefArtifacts: DebriefArtifact[];
}

function normalizeDebrief(debrief: RoundDebrief): RoundDebrief {
  return {
    ...debrief,
    structured_fields: {
      ...debrief.structured_fields,
      follow_up_reminder_at: debrief.structured_fields.follow_up_reminder_at,
      follow_up_reminder_completed: Boolean(
        debrief.structured_fields.follow_up_reminder_completed,
      ),
      take_home_checklist: Array.isArray(debrief.structured_fields.take_home_checklist)
        ? debrief.structured_fields.take_home_checklist
            .filter((item) => item && typeof item.id === "string" && typeof item.label === "string")
            .map((item) => ({
              id: item.id,
              label: item.label,
              checked: Boolean(item.checked),
            }))
        : [],
    },
  };
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
      debriefs: Array.isArray(parsed.debriefs)
        ? parsed.debriefs.map((debrief) => normalizeDebrief(debrief))
        : [],
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
    const debrief: RoundDebrief = normalizeDebrief({
      ...input,
      id: crypto.randomUUID(),
      created_at: nowIso(),
    });
    store.debriefs.push(debrief);
    await writeStore(store);
    return debrief;
  }

  async patchLatestDebriefTracking(
    roundId: string,
    updates: {
      follow_up_reminder_at?: string;
      follow_up_reminder_completed?: boolean;
      take_home_checklist?: RoundDebrief["structured_fields"]["take_home_checklist"];
    },
  ): Promise<RoundDebrief | null> {
    const store = await readStore();
    let latestIndex = -1;
    for (let i = store.debriefs.length - 1; i >= 0; i -= 1) {
      if (store.debriefs[i].round_id === roundId) {
        latestIndex = i;
        break;
      }
    }

    if (latestIndex < 0) return null;

    const current = normalizeDebrief(store.debriefs[latestIndex]);
    const next: RoundDebrief = {
      ...current,
      structured_fields: {
        ...current.structured_fields,
        ...(updates.follow_up_reminder_at !== undefined
          ? { follow_up_reminder_at: updates.follow_up_reminder_at }
          : {}),
        ...(updates.follow_up_reminder_completed !== undefined
          ? { follow_up_reminder_completed: updates.follow_up_reminder_completed }
          : {}),
        ...(updates.take_home_checklist !== undefined
          ? { take_home_checklist: updates.take_home_checklist }
          : {}),
      },
    };

    store.debriefs[latestIndex] = normalizeDebrief(next);
    await writeStore(store);
    return store.debriefs[latestIndex];
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
    return store.debriefs.filter((d) => d.round_id === roundId).map((debrief) => normalizeDebrief(debrief));
  }

  async listDebriefArtifacts(roundId: string): Promise<DebriefArtifact[]> {
    const store = await readStore();
    return store.debriefArtifacts.filter((d) => d.round_id === roundId);
  }
}

export const prepRepository = new PrepRepository();
