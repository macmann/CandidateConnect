"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Application, ApplicationStatus, DocumentVersion } from "@/lib/domain/application";
import { JobDescriptionSnapshot } from "@/lib/domain/jobDescriptionSnapshot";

type SortKey = "candidateName" | "company" | "status" | "updatedAt";

const statuses: ApplicationStatus[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

const emptyForm = {
  candidateName: "",
  candidateEmail: "",
  title: "",
  company: "",
  location: "",
  description: "",
  sourceUrl: "",
  jdRawText: "",
  cvDocumentVersionId: "",
  coverDocumentVersionId: "",
  salaryExpectation: "",
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentSnapshot, setCurrentSnapshot] = useState<JobDescriptionSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortAscending, setSortAscending] = useState(false);

  async function loadApplications() {
    setLoading(true);
    const response = await fetch("/api/applications", { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Failed to load applications");
      setLoading(false);
      return;
    }

    setApplications(data.applications ?? []);
    setError(null);
    setLoading(false);
  }

  async function loadDocumentVersions() {
    const response = await fetch("/api/document-versions", { cache: "no-store" });
    const data = await response.json();
    if (response.ok) {
      setDocumentVersions(data.versions ?? []);
    }
  }

  async function loadSnapshot(applicationId: string) {
    setSnapshotLoading(true);
    const response = await fetch(`/api/applications/${applicationId}/job-description-snapshot`, {
      cache: "no-store",
    });

    if (response.status === 404) {
      setCurrentSnapshot(null);
      setSnapshotLoading(false);
      return;
    }

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to load JD snapshot");
      setCurrentSnapshot(null);
      setSnapshotLoading(false);
      return;
    }

    setCurrentSnapshot(data.snapshot ?? null);
    setSnapshotLoading(false);
  }

  useEffect(() => {
    loadApplications();
    loadDocumentVersions();
  }, []);

  const sorted = useMemo(() => {
    return [...applications].sort((a, b) => {
      const left =
        sortKey === "company"
          ? a.jobDescription.company
          : sortKey === "updatedAt"
            ? a.updatedAt
            : a[sortKey];
      const right =
        sortKey === "company"
          ? b.jobDescription.company
          : sortKey === "updatedAt"
            ? b.updatedAt
            : b[sortKey];
      const value = String(left).localeCompare(String(right));
      return sortAscending ? value : -value;
    });
  }, [applications, sortKey, sortAscending]);

  const grouped = useMemo(() => {
    return statuses.reduce(
      (acc, status) => {
        acc[status] = applications.filter((app) => app.status === status);
        return acc;
      },
      {} as Record<ApplicationStatus, Application[]>,
    );
  }, [applications]);

  const cvVersions = useMemo(
    () => documentVersions.filter((version) => version.type === "CV"),
    [documentVersions],
  );
  const coverVersions = useMemo(
    () => documentVersions.filter((version) => version.type === "Cover"),
    [documentVersions],
  );

  async function startEdit(application: Application) {
    setEditingId(application.id);
    setForm({
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      title: application.jobDescription.title,
      company: application.jobDescription.company,
      location: application.jobDescription.location ?? "",
      description: application.jobDescription.description,
      sourceUrl: application.jobDescription.sourceUrl ?? "",
      jdRawText: "",
      cvDocumentVersionId: application.cvDocumentVersionId ?? "",
      coverDocumentVersionId: application.coverDocumentVersionId ?? "",
      salaryExpectation: application.salaryExpectation ?? "",
    });

    await loadSnapshot(application.id);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      candidateName: form.candidateName,
      candidateEmail: form.candidateEmail,
      jobDescription: {
        title: form.title,
        company: form.company,
        location: form.location,
        description: form.description,
        sourceUrl: form.sourceUrl,
      },
      cvDocumentVersionId: form.cvDocumentVersionId || undefined,
      coverDocumentVersionId: form.coverDocumentVersionId || undefined,
      salaryExpectation: form.salaryExpectation || undefined,
    };

    const response = await fetch(
      editingId ? `/api/applications/${editingId}` : "/api/applications",
      {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to save application");
      return;
    }

    const savedApplication = data.application as Application;
    if (!currentSnapshot && form.jdRawText.trim()) {
      const snapshotResponse = await fetch(
        `/api/applications/${savedApplication.id}/job-description-snapshot`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ raw_text: form.jdRawText }),
        },
      );

      const snapshotData = await snapshotResponse.json();
      if (!snapshotResponse.ok) {
        setError(snapshotData.error ?? "Failed to save JD snapshot");
        return;
      }

      setCurrentSnapshot(snapshotData.snapshot ?? null);
    }

    setForm(emptyForm);
    setEditingId(null);
    setError(null);
    await loadApplications();
  }

  async function onDrop(status: ApplicationStatus, appId: string) {
    const response = await fetch(`/api/applications/${appId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to update status");
      return;
    }

    await loadApplications();
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold">Applications</h1>
        <Link href="/documents" className="rounded border px-3 py-2 text-sm">
          Manage document versions
        </Link>
      </div>

      <form onSubmit={onSubmit} className="space-y-3 rounded border border-zinc-200 p-4">
        <h2 className="text-xl font-medium">{editingId ? "Edit" : "Create"} application</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input
            required
            placeholder="Candidate name"
            className="rounded border p-2"
            value={form.candidateName}
            onChange={(e) => setForm((f) => ({ ...f, candidateName: e.target.value }))}
          />
          <input
            required
            type="email"
            placeholder="Candidate email"
            className="rounded border p-2"
            value={form.candidateEmail}
            onChange={(e) => setForm((f) => ({ ...f, candidateEmail: e.target.value }))}
          />
          <input
            required
            placeholder="Role title"
            className="rounded border p-2"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            required
            placeholder="Company"
            className="rounded border p-2"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
          />
          <input
            placeholder="Location"
            className="rounded border p-2"
            value={form.location}
            onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
          />
          <input
            placeholder="Source URL"
            className="rounded border p-2"
            value={form.sourceUrl}
            onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
          />
          <select
            className="rounded border p-2"
            value={form.cvDocumentVersionId}
            onChange={(e) => setForm((f) => ({ ...f, cvDocumentVersionId: e.target.value }))}
          >
            <option value="">Select CV version</option>
            {cvVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>
          <select
            className="rounded border p-2"
            value={form.coverDocumentVersionId}
            onChange={(e) => setForm((f) => ({ ...f, coverDocumentVersionId: e.target.value }))}
          >
            <option value="">Select cover letter version</option>
            {coverVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>
        </div>
        <input
          placeholder="Salary expectation"
          className="rounded border p-2 md:col-span-2"
          value={form.salaryExpectation}
          onChange={(e) => setForm((f) => ({ ...f, salaryExpectation: e.target.value }))}
        />
        <textarea
          required
          placeholder="Job description"
          className="min-h-28 rounded border p-2"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />

        {currentSnapshot ? (
          <div className="rounded border border-zinc-200 bg-zinc-50 p-3">
            <h3 className="mb-1 font-medium">JD snapshot (read-only)</h3>
            <p className="mb-2 text-xs text-zinc-500">
              Captured at {new Date(currentSnapshot.created_at).toLocaleString()}
            </p>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">
              {currentSnapshot.raw_text}
            </pre>
          </div>
        ) : (
          <textarea
            placeholder="Paste full job description text for immutable snapshot"
            className="min-h-36 rounded border p-2"
            value={form.jdRawText}
            onChange={(e) => setForm((f) => ({ ...f, jdRawText: e.target.value }))}
          />
        )}

        {snapshotLoading && <p className="text-sm text-zinc-500">Loading snapshot…</p>}

        <div className="flex gap-2">
          <button className="rounded bg-black px-4 py-2 text-white" type="submit">
            {editingId ? "Save changes" : "Create application"}
          </button>
          {editingId && (
            <button
              type="button"
              className="rounded border px-4 py-2"
              onClick={() => {
                setEditingId(null);
                setCurrentSnapshot(null);
                setForm(emptyForm);
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="rounded border border-zinc-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xl font-medium">List view</h2>
          <p className="text-sm text-zinc-500">Click headers to sort</p>
        </div>
        {loading ? (
          <p>Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr>
                  {[
                    ["candidateName", "Candidate"],
                    ["company", "Company"],
                    ["status", "Status"],
                    ["updatedAt", "Updated"],
                  ].map(([key, label]) => (
                    <th
                      key={key}
                      className="cursor-pointer border-b px-2 py-2"
                      onClick={() => {
                        const typedKey = key as SortKey;
                        if (typedKey === sortKey) setSortAscending((x) => !x);
                        else {
                          setSortKey(typedKey);
                          setSortAscending(true);
                        }
                      }}
                    >
                      {label}
                    </th>
                  ))}
                  <th className="border-b px-2 py-2">Documents</th>
                  <th className="border-b px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((application) => (
                  <tr key={application.id} className="border-b">
                    <td className="px-2 py-2">{application.candidateName}</td>
                    <td className="px-2 py-2">{application.jobDescription.company}</td>
                    <td className="px-2 py-2">{application.status}{application.submissionSnapshot ? " (Submitted)" : ""}</td>
                    <td className="px-2 py-2">
                      {new Date(application.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 text-xs text-zinc-600">
                      CV: {application.cvDocumentVersionId ? "Linked" : "—"}
                      <br />
                      Cover: {application.coverDocumentVersionId ? "Linked" : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <button
                          className="rounded border px-3 py-1 disabled:opacity-50"
                          onClick={() => startEdit(application)}
                          disabled={Boolean(application.submissionSnapshot)}
                        >
                          Edit
                        </button>
                        <Link href={`/applications/${application.id}`} className="rounded border px-3 py-1">
                          Answers
                        </Link>
                        {application.submissionSnapshot && (
                          <Link href={`/applications/${application.id}/pack`} className="rounded border px-3 py-1">
                            Pack
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-xl font-medium">Kanban by status</h2>
        <div className="grid gap-3 md:grid-cols-5">
          {statuses.map((status) => (
            <div
              key={status}
              className="min-h-40 rounded border border-zinc-200 bg-zinc-50 p-3"
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const appId = event.dataTransfer.getData("text/plain");
                if (appId) onDrop(status, appId);
              }}
            >
              <h3 className="mb-2 font-semibold">{status}</h3>
              <div className="space-y-2">
                {grouped[status].map((application) => (
                  <div
                    key={application.id}
                    draggable
                    onDragStart={(event) =>
                      event.dataTransfer.setData("text/plain", application.id)
                    }
                    className="cursor-grab rounded border bg-white p-2 text-sm"
                  >
                    <p className="font-medium">{application.candidateName}</p>
                    <p className="text-zinc-600">{application.jobDescription.title}</p>
                    <p className="text-zinc-500">{application.jobDescription.company}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
