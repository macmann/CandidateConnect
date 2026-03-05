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

function createRound(applicationId: string, input: InterviewRoundInput): InterviewRound {
  return {
    id: crypto.randomUUID(),
    application_id: applicationId,
    round_type: input.round_type,
    scheduled_at: input.scheduled_at ?? "",
    status: input.status ?? "Planned",
    notes: input.notes ?? "",
    created_at: nowIso(),
  };
}

export class InterviewRoundRepository {
  async listByApplicationId(applicationId: string): Promise<InterviewRound[]> {
    const store = await readStore();
    return store.rounds
      .filter((round) => round.application_id === applicationId)
      .sort((a, b) => {
        const left = a.scheduled_at || a.created_at;
        const right = b.scheduled_at || b.created_at;
        return left.localeCompare(right);
      });
  }

  async create(applicationId: string, input: InterviewRoundInput): Promise<InterviewRound> {
    const store = await readStore();
    const round = createRound(applicationId, input);
    store.rounds.push(round);
    await writeStore(store);
    return round;
  }

  async update(
    applicationId: string,
    roundId: string,
    patch: Partial<InterviewRoundInput>,
  ): Promise<InterviewRound | null> {
    const store = await readStore();
    const index = store.rounds.findIndex(
      (round) => round.id === roundId && round.application_id === applicationId,
    );

    if (index < 0) return null;

    const current = store.rounds[index];
    const updated: InterviewRound = {
      ...current,
      round_type: patch.round_type ?? current.round_type,
      scheduled_at: patch.scheduled_at ?? current.scheduled_at,
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
