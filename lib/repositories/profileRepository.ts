import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { UserProfile, UserProfileInput } from "@/lib/domain/profile";

interface ProfileStore {
  profile: UserProfile;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "profile.json");

const defaultStore: ProfileStore = {
  profile: {
    name: "",
    email: "",
    cvBase: "",
    cvVersionsBaseNotes: "",
    coverLetterBase: "",
    updatedAt: new Date(0).toISOString(),
  },
};

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<ProfileStore> {
  await ensureStore();
  const content = await readFile(DATA_FILE, "utf-8");
  try {
    const parsed = JSON.parse(content) as Partial<ProfileStore>;
    return {
      profile: {
        ...defaultStore.profile,
        ...(parsed.profile ?? {}),
      },
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: ProfileStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export class ProfileRepository {
  async get(): Promise<UserProfile> {
    const store = await readStore();
    return store.profile;
  }

  async save(input: UserProfileInput): Promise<UserProfile> {
    const profile: UserProfile = {
      name: input.name.trim(),
      email: input.email.trim(),
      cvBase: input.cvBase.trim(),
      cvVersionsBaseNotes: input.cvVersionsBaseNotes?.trim() ?? "",
      coverLetterBase: input.coverLetterBase.trim(),
      updatedAt: new Date().toISOString(),
    };

    await writeStore({ profile });
    return profile;
  }
}

export const profileRepository = new ProfileRepository();
