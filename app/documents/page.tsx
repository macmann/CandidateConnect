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
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Documents</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Document versions
        </h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">
          Versions are immutable after creation. Edit cover letters by creating a new version with
          a new label.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-medium">Create new document version</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <select
            className="rounded-lg border border-slate-300 p-2"
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
            className="rounded-lg border border-slate-300 p-2"
            placeholder="Version label (e.g. Data Engineer v2)"
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />
        </div>
        {form.type === "CV" ? (
          <input
            className="w-full rounded-lg border border-slate-300 p-2"
            placeholder="CV file URL"
            value={form.fileUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, fileUrl: event.target.value }))}
          />
        ) : (
          <textarea
            className="min-h-40 w-full rounded-lg border border-slate-300 p-2"
            placeholder="Cover letter text"
            value={form.text}
            onChange={(event) => setForm((prev) => ({ ...prev, text: event.target.value }))}
          />
        )}
        <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800">
          Save version
        </button>
      </form>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">CV versions</h2>
          <ul className="space-y-2">
            {cvVersions.map((version) => (
              <li key={version.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                <p className="font-medium">{version.label}</p>
                <p className="text-slate-500">{new Date(version.createdAt).toLocaleString()}</p>
                {version.fileUrl && (
                  <a
                    href={version.fileUrl}
                    className="text-sky-600 hover:underline"
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

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium">Cover letter versions</h2>
          <ul className="space-y-2">
            {coverVersions.map((version) => (
              <li key={version.id} className="rounded-xl border border-slate-100 p-3 text-sm">
                <p className="font-medium">{version.label}</p>
                <p className="text-slate-500">{new Date(version.createdAt).toLocaleString()}</p>
                {version.text && (
                  <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-slate-700">
                    {version.text}
                  </p>
                )}
                <button
                  type="button"
                  className="mt-2 rounded-lg border border-slate-300 bg-slate-50 px-2 py-1 text-xs transition hover:bg-slate-100"
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
