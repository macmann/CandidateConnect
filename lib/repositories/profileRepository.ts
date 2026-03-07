import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { UserProfile, UserProfileInput } from "@/lib/domain/profile";
import { isNeonHttpConfigured, neonHttpQuery } from "@/lib/db/neonHttp";

interface ProfileStore {
  profile: UserProfile;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "profile.json");
const PRIMARY_PROFILE_ID = "00000000-0000-0000-0000-000000000001";

const defaultStore: ProfileStore = {
  profile: {
    name: "",
    email: "",
    cvBase: "",
    cvVersionsBaseNotes: "",
    coverLetterBase: "",
    defaultCvDocumentVersionId: undefined,
    defaultCoverDocumentVersionId: undefined,
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

type ProfileRow = {
  candidate_name: string;
  candidate_email: string;
  cv_base: string;
  cv_versions_base_notes: string;
  cover_letter_base: string;
  default_cv_document_version_id?: string | null;
  default_cover_document_version_id?: string | null;
  updated_at: string;
};

async function ensureNeonProfileColumns(): Promise<void> {
  if (!isNeonHttpConfigured()) return;

  await neonHttpQuery(
    `ALTER TABLE profiles
     ADD COLUMN IF NOT EXISTS default_cv_document_version_id uuid,
     ADD COLUMN IF NOT EXISTS default_cover_document_version_id uuid`,
  );
}

function mapRowToProfile(row: ProfileRow | undefined): UserProfile {
  if (!row) {
    return defaultStore.profile;
  }

  return {
    name: row.candidate_name ?? "",
    email: row.candidate_email ?? "",
    cvBase: row.cv_base ?? "",
    cvVersionsBaseNotes: row.cv_versions_base_notes ?? "",
    coverLetterBase: row.cover_letter_base ?? "",
    defaultCvDocumentVersionId: row.default_cv_document_version_id ?? undefined,
    defaultCoverDocumentVersionId: row.default_cover_document_version_id ?? undefined,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export class ProfileRepository {
  async get(): Promise<UserProfile> {
    if (!isNeonHttpConfigured()) {
      const store = await readStore();
      return store.profile;
    }

    await ensureNeonProfileColumns();

    const rows = await neonHttpQuery<ProfileRow>(
      `SELECT candidate_name, candidate_email, cv_base, cv_versions_base_notes, cover_letter_base,
              default_cv_document_version_id, default_cover_document_version_id, updated_at
       FROM profiles
       WHERE id = $1
       LIMIT 1`,
      [PRIMARY_PROFILE_ID],
    );

    return mapRowToProfile(rows[0]);
  }

  async save(input: UserProfileInput): Promise<UserProfile> {
    const profile: UserProfile = {
      name: input.name.trim(),
      email: input.email.trim(),
      cvBase: input.cvBase.trim(),
      cvVersionsBaseNotes: input.cvVersionsBaseNotes?.trim() ?? "",
      coverLetterBase: input.coverLetterBase.trim(),
      defaultCvDocumentVersionId: input.defaultCvDocumentVersionId?.trim() || undefined,
      defaultCoverDocumentVersionId: input.defaultCoverDocumentVersionId?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    if (!isNeonHttpConfigured()) {
      await writeStore({ profile });
      return profile;
    }

    await ensureNeonProfileColumns();

    await neonHttpQuery(
      `INSERT INTO profiles (
          id,
          candidate_name,
          candidate_email,
          cv_base,
          cv_versions_base_notes,
          cover_letter_base,
          default_cv_document_version_id,
          default_cover_document_version_id,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          candidate_name = EXCLUDED.candidate_name,
          candidate_email = EXCLUDED.candidate_email,
          cv_base = EXCLUDED.cv_base,
          cv_versions_base_notes = EXCLUDED.cv_versions_base_notes,
          cover_letter_base = EXCLUDED.cover_letter_base,
          default_cv_document_version_id = EXCLUDED.default_cv_document_version_id,
          default_cover_document_version_id = EXCLUDED.default_cover_document_version_id,
          updated_at = EXCLUDED.updated_at`,
      [
        PRIMARY_PROFILE_ID,
        profile.name,
        profile.email,
        profile.cvBase,
        profile.cvVersionsBaseNotes,
        profile.coverLetterBase,
        profile.defaultCvDocumentVersionId ?? null,
        profile.defaultCoverDocumentVersionId ?? null,
        profile.updatedAt,
      ],
    );

    return profile;
  }
}

export const profileRepository = new ProfileRepository();
