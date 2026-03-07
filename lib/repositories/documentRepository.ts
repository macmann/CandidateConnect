import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ApplicationDocument, DocumentType, DocumentVersion } from "@/lib/domain/application";
import { isNeonHttpConfigured, neonHttpQuery } from "@/lib/db/neonHttp";

interface DocumentStore {
  documentVersions: DocumentVersion[];
  applicationDocuments: ApplicationDocument[];
}

interface CreateDocumentVersionInput {
  type: DocumentType;
  label: string;
  fileUrl?: string;
  text?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "documents.json");

const defaultStore: DocumentStore = {
  documentVersions: [],
  applicationDocuments: [],
};

async function ensureStore(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    await readFile(DATA_FILE, "utf-8");
  } catch {
    await writeFile(DATA_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  }
}

async function readStore(): Promise<DocumentStore> {
  await ensureStore();
  const content = await readFile(DATA_FILE, "utf-8");

  try {
    const parsed = JSON.parse(content) as DocumentStore;
    return {
      documentVersions: Array.isArray(parsed.documentVersions) ? parsed.documentVersions : [],
      applicationDocuments: Array.isArray(parsed.applicationDocuments)
        ? parsed.applicationDocuments
        : [],
    };
  } catch {
    return defaultStore;
  }
}

async function writeStore(store: DocumentStore): Promise<void> {
  await ensureStore();
  await writeFile(DATA_FILE, JSON.stringify(store, null, 2), "utf-8");
}

function nowIso() {
  return new Date().toISOString();
}

type DocumentVersionRow = {
  id: string;
  kind: DocumentType;
  label: string;
  file_url?: string | null;
  text?: string | null;
  created_at: string;
};

type SelectedVersionRow = {
  kind: DocumentType;
  document_version_id: string;
};

function mapRowToVersion(row: DocumentVersionRow): DocumentVersion {
  return {
    id: row.id,
    type: row.kind,
    label: row.label,
    fileUrl: row.file_url ?? undefined,
    text: row.text ?? undefined,
    createdAt: row.created_at,
  };
}

export class DocumentRepository {
  async listVersions(type?: DocumentType): Promise<DocumentVersion[]> {
    if (!isNeonHttpConfigured()) {
      const store = await readStore();
      const versions = type
        ? store.documentVersions.filter((version) => version.type === type)
        : store.documentVersions;
      return versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }

    const rows = type
      ? await neonHttpQuery<DocumentVersionRow>(
          `SELECT id, kind, label, file_url, text, created_at
           FROM document_versions
           WHERE kind = $1
           ORDER BY created_at DESC`,
          [type],
        )
      : await neonHttpQuery<DocumentVersionRow>(
          `SELECT id, kind, label, file_url, text, created_at
           FROM document_versions
           ORDER BY created_at DESC`,
        );

    return rows.map(mapRowToVersion);
  }

  async createVersion(input: CreateDocumentVersionInput): Promise<DocumentVersion> {
    if (!input.label?.trim()) {
      throw new Error("label is required");
    }

    if (!input.fileUrl?.trim() && !input.text?.trim()) {
      throw new Error("Either fileUrl or text is required");
    }

    if (!isNeonHttpConfigured()) {
      const store = await readStore();
      const version: DocumentVersion = {
        id: crypto.randomUUID(),
        type: input.type,
        label: input.label.trim(),
        fileUrl: input.fileUrl?.trim() || undefined,
        text: input.text?.trim() || undefined,
        createdAt: nowIso(),
      };

      store.documentVersions.push(version);
      await writeStore(store);
      return version;
    }

    const rows = await neonHttpQuery<DocumentVersionRow>(
      `INSERT INTO document_versions (kind, label, file_url, text, source)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, kind, label, file_url, text, created_at`,
      [input.type, input.label.trim(), input.fileUrl?.trim() || null, input.text?.trim() || null, "manual"],
    );

    return mapRowToVersion(rows[0]);
  }

  async getById(id: string): Promise<DocumentVersion | null> {
    if (!isNeonHttpConfigured()) {
      const store = await readStore();
      return store.documentVersions.find((version) => version.id === id) ?? null;
    }

    const rows = await neonHttpQuery<DocumentVersionRow>(
      `SELECT id, kind, label, file_url, text, created_at
       FROM document_versions
       WHERE id = $1
       LIMIT 1`,
      [id],
    );

    return rows[0] ? mapRowToVersion(rows[0]) : null;
  }

  async setForApplication(applicationId: string, versionIds: string[]): Promise<void> {
    if (!isNeonHttpConfigured()) {
      const store = await readStore();
      const validVersions = store.documentVersions.filter((version) => versionIds.includes(version.id));
      const uniqueByType = new Map<DocumentType, string>();

      for (const version of validVersions) {
        uniqueByType.set(version.type, version.id);
      }

      store.applicationDocuments = store.applicationDocuments.filter(
        (link) => link.applicationId !== applicationId,
      );

      uniqueByType.forEach((documentVersionId) => {
        store.applicationDocuments.push({ applicationId, documentVersionId });
      });

      await writeStore(store);
      return;
    }

    await neonHttpQuery(`DELETE FROM application_documents WHERE application_id = $1`, [applicationId]);

    if (versionIds.length === 0) {
      return;
    }

    const versionRows = await neonHttpQuery<{ id: string; kind: DocumentType }>(
      `SELECT id, kind
       FROM document_versions
       WHERE id = ANY($1::uuid[])`,
      [versionIds],
    );

    const uniqueByType = new Map<DocumentType, string>();
    for (const row of versionRows) {
      uniqueByType.set(row.kind, row.id);
    }

    for (const [kind, documentVersionId] of uniqueByType.entries()) {
      await neonHttpQuery(
        `INSERT INTO application_documents (application_id, document_type, document_version_id)
         VALUES ($1, $2, $3)`,
        [applicationId, kind, documentVersionId],
      );
    }
  }

  async getSelectedVersionIds(applicationId: string): Promise<{
    cvDocumentVersionId?: string;
    coverDocumentVersionId?: string;
  }> {
    if (!isNeonHttpConfigured()) {
      const store = await readStore();
      const links = store.applicationDocuments.filter((link) => link.applicationId === applicationId);

      let cvDocumentVersionId: string | undefined;
      let coverDocumentVersionId: string | undefined;

      for (const link of links) {
        const version = store.documentVersions.find((item) => item.id === link.documentVersionId);
        if (!version) continue;

        if (version.type === "CV") {
          cvDocumentVersionId = version.id;
        } else if (version.type === "Cover") {
          coverDocumentVersionId = version.id;
        }
      }

      return { cvDocumentVersionId, coverDocumentVersionId };
    }

    const rows = await neonHttpQuery<SelectedVersionRow>(
      `SELECT document_type AS kind, document_version_id
       FROM application_documents
       WHERE application_id = $1`,
      [applicationId],
    );

    let cvDocumentVersionId: string | undefined;
    let coverDocumentVersionId: string | undefined;

    for (const row of rows) {
      if (row.kind === "CV") {
        cvDocumentVersionId = row.document_version_id;
      }

      if (row.kind === "Cover") {
        coverDocumentVersionId = row.document_version_id;
      }
    }

    return { cvDocumentVersionId, coverDocumentVersionId };
  }
}

export const documentRepository = new DocumentRepository();
