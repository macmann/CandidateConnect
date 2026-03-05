import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { InterviewRound, InterviewRoundInput } from "@/lib/domain/application";

interface InterviewRoundStore {
  rounds: InterviewRound[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "interview-rounds.json");
const defaultStore: InterviewRoundStore = { rounds: [] };

function nowIso() {
  return new Date().toISOString();
}

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<InterviewRoundStore> {
  await ensureStore();
  try {
    const content = await readFile(DATA_FILE, "utf-8");
    const parsed = JSON.parse(content) as InterviewRoundStore;
    return {
      rounds: Array.isArray(parsed.rounds) ? parsed.rounds : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: InterviewRoundStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function createRound(applicationId: string, input: InterviewRoundInput, roundIndex: number): InterviewRound {
  return {
    id: crypto.randomUUID(),
    application_id: applicationId,
    round_index: roundIndex,
    round_type: input.round_type,
    scheduled_at: input.scheduled_at || undefined,
    timezone: input.timezone || undefined,
    mode: input.mode,
    location_or_link: input.location_or_link || undefined,
    purpose: input.purpose || undefined,
    status: input.status ?? "Scheduled",
    notes: input.notes ?? "",
    created_at: nowIso(),
  };
}

export class InterviewRoundRepository {
  async listByApplicationId(applicationId: string): Promise<InterviewRound[]> {
    const store = await readStore();
    return store.rounds
      .filter((round) => round.application_id === applicationId)
      .sort((a, b) => a.round_index - b.round_index || a.created_at.localeCompare(b.created_at));
  }

  async getById(applicationId: string, roundId: string): Promise<InterviewRound | null> {
    const store = await readStore();
    return store.rounds.find((round) => round.id === roundId && round.application_id === applicationId) ?? null;
  }

  async create(applicationId: string, input: InterviewRoundInput): Promise<InterviewRound> {
    const store = await readStore();
    const maxRound = store.rounds
      .filter((round) => round.application_id === applicationId)
      .reduce((max, round) => Math.max(max, round.round_index), 0);
    const round = createRound(applicationId, input, maxRound + 1);
    store.rounds.push(round);
    await writeStore(store);
    return round;
  }

  async update(applicationId: string, roundId: string, patch: Partial<InterviewRoundInput>): Promise<InterviewRound | null> {
    const store = await readStore();
    const index = store.rounds.findIndex(
      (round) => round.id === roundId && round.application_id === applicationId,
    );

    if (index < 0) return null;

    const current = store.rounds[index];
    const updated: InterviewRound = {
      ...current,
      round_type: patch.round_type ?? current.round_type,
      scheduled_at: patch.scheduled_at !== undefined ? patch.scheduled_at || undefined : current.scheduled_at,
      timezone: patch.timezone !== undefined ? patch.timezone || undefined : current.timezone,
      mode: patch.mode !== undefined ? patch.mode : current.mode,
      location_or_link:
        patch.location_or_link !== undefined ? patch.location_or_link || undefined : current.location_or_link,
      purpose: patch.purpose !== undefined ? patch.purpose || undefined : current.purpose,
      status: patch.status ?? current.status,
      notes: patch.notes ?? current.notes,
    };

    store.rounds[index] = updated;
    await writeStore(store);
    return updated;
  }

  async delete(applicationId: string, roundId: string): Promise<boolean> {
    const store = await readStore();
    const initialLength = store.rounds.length;
    store.rounds = store.rounds.filter(
      (round) => !(round.id === roundId && round.application_id === applicationId),
    );

    if (store.rounds.length === initialLength) {
      return false;
    }

    await writeStore(store);
    return true;
  }
}

export const interviewRoundRepository = new InterviewRoundRepository();
