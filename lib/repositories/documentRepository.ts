import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { ApplicationDocument, DocumentType, DocumentVersion } from "@/lib/domain/application";

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

export class DocumentRepository {
  async listVersions(type?: DocumentType): Promise<DocumentVersion[]> {
    const store = await readStore();
    const versions = type
      ? store.documentVersions.filter((version) => version.type === type)
      : store.documentVersions;
    return versions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async createVersion(input: CreateDocumentVersionInput): Promise<DocumentVersion> {
    if (!input.label?.trim()) {
      throw new Error("label is required");
    }

    if (!input.fileUrl?.trim() && !input.text?.trim()) {
      throw new Error("Either fileUrl or text is required");
    }

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

  async getById(id: string): Promise<DocumentVersion | null> {
    const store = await readStore();
    return store.documentVersions.find((version) => version.id === id) ?? null;
  }

  async setForApplication(applicationId: string, versionIds: string[]): Promise<void> {
    const store = await readStore();
    const validVersions = store.documentVersions.filter((version) =>
      versionIds.includes(version.id),
    );
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
  }

  async getSelectedVersionIds(applicationId: string): Promise<{
    cvDocumentVersionId?: string;
    coverDocumentVersionId?: string;
  }> {
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
}

export const documentRepository = new DocumentRepository();
