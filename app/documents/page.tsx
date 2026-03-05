"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { DocumentVersion } from "@/lib/domain/application";

type DocumentFormState = {
  type: "CV" | "Cover";
  label: string;
  fileUrl: string;
  text: string;
};

const emptyForm: DocumentFormState = {
  type: "CV",
  label: "",
  fileUrl: "",
  text: "",
};

export default function DocumentsPage() {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [form, setForm] = useState<DocumentFormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  async function loadVersions() {
    const response = await fetch("/api/document-versions", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Failed to load versions");
      return;
    }

    setVersions(data.versions ?? []);
    setError(null);
  }

  useEffect(() => {
    loadVersions();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/document-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to create version");
      return;
    }

    setForm({ ...emptyForm, type: form.type });
    await loadVersions();
  }

  const cvVersions = useMemo(() => versions.filter((version) => version.type === "CV"), [versions]);
  const coverVersions = useMemo(
    () => versions.filter((version) => version.type === "Cover"),
    [versions],
  );

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <h1 className="text-3xl font-semibold">Document versions</h1>
      <p className="text-sm text-zinc-600">
        Versions are immutable after creation. Edit cover letters by creating a new version with a
        new label.
      </p>

      <form onSubmit={onSubmit} className="space-y-3 rounded border border-zinc-200 p-4">
        <h2 className="text-lg font-medium">Create new document version</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="rounded border p-2"
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value as "CV" | "Cover" }))
            }
          >
            <option value="CV">CV</option>
            <option value="Cover">Cover Letter</option>
          </select>
          <input
            required
            className="rounded border p-2"
            placeholder="Version label (e.g. Data Engineer v2)"
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />
        </div>
        {form.type === "CV" ? (
          <input
            className="w-full rounded border p-2"
            placeholder="CV file URL"
            value={form.fileUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
          />
        ) : (
          <textarea
            className="min-h-40 w-full rounded border p-2"
            placeholder="Cover letter text"
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
          />
        )}
        <button type="submit" className="rounded bg-black px-4 py-2 text-white">
          Save version
        </button>
      </form>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded border border-zinc-200 p-4">
          <h2 className="mb-3 text-lg font-medium">CV versions</h2>
          <ul className="space-y-2">
            {cvVersions.map((version) => (
              <li key={version.id} className="rounded border border-zinc-100 p-2 text-sm">
                <p className="font-medium">{version.label}</p>
                <p className="text-zinc-500">{new Date(version.createdAt).toLocaleString()}</p>
                {version.fileUrl && (
                  <a
                    href={version.fileUrl}
                    className="text-blue-600 hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {version.fileUrl}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border border-zinc-200 p-4">
          <h2 className="mb-3 text-lg font-medium">Cover letter versions</h2>
          <ul className="space-y-2">
            {coverVersions.map((version) => (
              <li key={version.id} className="rounded border border-zinc-100 p-2 text-sm">
                <p className="font-medium">{version.label}</p>
                <p className="text-zinc-500">{new Date(version.createdAt).toLocaleString()}</p>
                {version.text && (
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-zinc-700">
                    {version.text}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 rounded border px-2 py-1 text-xs"
                  onClick={() =>
                    setForm({
                      type: "Cover",
                      label: `${version.label} (edited)`,
                      fileUrl: "",
                      text: version.text ?? "",
                    })
                  }
                >
                  Edit as new version
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
