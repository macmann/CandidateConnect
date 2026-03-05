import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Interviewer, RoundInterviewer } from "@/lib/domain/application";

interface InterviewerStore {
  interviewers: Interviewer[];
  roundInterviewers: RoundInterviewer[];
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "interviewers.json");
const defaultStore: InterviewerStore = { interviewers: [], roundInterviewers: [] };

const nowIso = () => new Date().toISOString();

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf8");
  }
}

async function readStore(): Promise<InterviewerStore> {
  await ensureStore();
  try {
    const parsed = JSON.parse(await readFile(DATA_FILE, "utf8")) as InterviewerStore;
    return {
      interviewers: Array.isArray(parsed.interviewers) ? parsed.interviewers : [],
      roundInterviewers: Array.isArray(parsed.roundInterviewers) ? parsed.roundInterviewers : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: InterviewerStore) {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf8");
}

export class InterviewerRepository {
  async listByUser(userId: string): Promise<Interviewer[]> {
    const store = await readStore();
    return store.interviewers.filter((i) => i.user_id === userId);
  }

  async create(input: Omit<Interviewer, "id" | "created_at">): Promise<Interviewer> {
    const store = await readStore();
    const interviewer: Interviewer = { ...input, id: crypto.randomUUID(), created_at: nowIso() };
    store.interviewers.push(interviewer);
    await writeStore(store);
    return interviewer;
  }

  async listForRound(roundId: string): Promise<Interviewer[]> {
    const store = await readStore();
    const ids = store.roundInterviewers.filter((r) => r.round_id === roundId).map((r) => r.interviewer_id);
    return store.interviewers.filter((i) => ids.includes(i.id));
  }

  async listLinkedToApplication(userId: string, roundIds: string[]): Promise<Interviewer[]> {
    if (!roundIds.length) return [];

    const store = await readStore();
    const roundIdSet = new Set(roundIds);
    const linkedIds = new Set(
      store.roundInterviewers
        .filter((item) => roundIdSet.has(item.round_id))
        .map((item) => item.interviewer_id),
    );

    return store.interviewers.filter((interviewer) => interviewer.user_id === userId && linkedIds.has(interviewer.id));
  }

  async setRoundInterviewers(roundId: string, interviewerIds: string[]): Promise<void> {
    const store = await readStore();
    store.roundInterviewers = store.roundInterviewers.filter((item) => item.round_id !== roundId);
    const unique = [...new Set(interviewerIds)];
    for (const interviewer_id of unique) {
      store.roundInterviewers.push({ round_id: roundId, interviewer_id });
    }
    await writeStore(store);
  }
}

export const interviewerRepository = new InterviewerRepository();
