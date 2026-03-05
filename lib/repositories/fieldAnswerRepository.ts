import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { FieldAnswer } from "@/lib/domain/application";

interface FieldAnswerStore {
  answers: FieldAnswer[];
}

interface UpsertFieldAnswerInput {
  application_id: string;
  question: string;
  ai_draft: string;
  final_answer?: string;
  snapshot_id?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "field-answers.json");

const defaultStore: FieldAnswerStore = { answers: [] };

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<FieldAnswerStore> {
  await ensureStore();
  const content = await readFile(DATA_FILE, "utf-8");

  try {
    const parsed = JSON.parse(content) as FieldAnswerStore;
    return {
      answers: Array.isArray(parsed.answers) ? parsed.answers : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: FieldAnswerStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowIso() {
  return new Date().toISOString();
}

export class FieldAnswerRepository {
  async listByApplicationId(applicationId: string): Promise<FieldAnswer[]> {
    const store = await readStore();
    return store.answers
      .filter((answer) => answer.application_id === applicationId)
      .sort((a, b) => a.created_at.localeCompare(b.created_at));
  }

  async upsertMany(entries: UpsertFieldAnswerInput[]): Promise<FieldAnswer[]> {
    const store = await readStore();

    const answers = entries
      .map((entry) => {
        const question = entry.question.trim();
        if (!question) {
          return null;
        }

        const existingIndex = store.answers.findIndex(
          (item) =>
            item.application_id === entry.application_id &&
            item.question.toLowerCase() === question.toLowerCase(),
        );

        const timestamp = nowIso();

        if (existingIndex >= 0) {
          const existing = store.answers[existingIndex];
          const updated: FieldAnswer = {
            ...existing,
            ai_draft: entry.ai_draft,
            final_answer: entry.final_answer ?? existing.final_answer,
            snapshot_id: entry.snapshot_id ?? existing.snapshot_id,
            locked_at: existing.locked_at,
            updated_at: timestamp,
          };
          store.answers[existingIndex] = updated;
          return updated;
        }

        const created: FieldAnswer = {
          id: crypto.randomUUID(),
          application_id: entry.application_id,
          question,
          ai_draft: entry.ai_draft,
          final_answer: entry.final_answer ?? "",
          snapshot_id: entry.snapshot_id,
          created_at: timestamp,
          updated_at: timestamp,
        };

        store.answers.push(created);
        return created;
      })
      .filter((answer): answer is FieldAnswer => answer !== null);

    await writeStore(store);
    return answers;
  }

  async lockByApplicationId(applicationId: string): Promise<void> {
    const store = await readStore();
    const timestamp = nowIso();

    store.answers = store.answers.map((answer) =>
      answer.application_id === applicationId ? { ...answer, locked_at: answer.locked_at ?? timestamp } : answer,
    );

    await writeStore(store);
  }

  async saveFinalAnswers(
    applicationId: string,
    updates: Array<{ question: string; final_answer: string }>,
  ): Promise<FieldAnswer[]> {
    const store = await readStore();
    const timestamp = nowIso();
    const result: FieldAnswer[] = [];

    for (const update of updates) {
      const question = update.question.trim();
      if (!question) continue;

      const existingIndex = store.answers.findIndex(
        (item) =>
          item.application_id === applicationId &&
          item.question.toLowerCase() === question.toLowerCase(),
      );

      if (existingIndex < 0) continue;

      const updated: FieldAnswer = {
        ...store.answers[existingIndex],
        final_answer: update.final_answer,
        updated_at: timestamp,
      };

      store.answers[existingIndex] = updated;
      result.push(updated);
    }

    await writeStore(store);
    return result;
  }
}

export const fieldAnswerRepository = new FieldAnswerRepository();
