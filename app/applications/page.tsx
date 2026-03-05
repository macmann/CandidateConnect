"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Application, ApplicationStatus } from "@/lib/domain/application";

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
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  useEffect(() => {
    loadApplications();
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

  function startEdit(application: Application) {
    setEditingId(application.id);
    setForm({
      candidateName: application.candidateName,
      candidateEmail: application.candidateEmail,
      title: application.jobDescription.title,
      company: application.jobDescription.company,
      location: application.jobDescription.location ?? "",
      description: application.jobDescription.description,
      sourceUrl: application.jobDescription.sourceUrl ?? "",
    });
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
      <h1 className="text-3xl font-semibold">Applications</h1>

      <form onSubmit={onSubmit} className="grid gap-3 rounded border border-zinc-200 p-4">
        <h2 className="text-xl font-medium">{editingId ? "Edit" : "Create"} application</h2>
        <div className="grid gap-3 md:grid-cols-2">
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
        </div>
        <textarea
          required
          placeholder="Job description"
          className="min-h-28 rounded border p-2"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
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
                  <th className="border-b px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((application) => (
                  <tr key={application.id} className="border-b">
                    <td className="px-2 py-2">{application.candidateName}</td>
                    <td className="px-2 py-2">{application.jobDescription.company}</td>
                    <td className="px-2 py-2">{application.status}</td>
                    <td className="px-2 py-2">
                      {new Date(application.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        className="rounded border px-3 py-1"
                        onClick={() => startEdit(application)}
                      >
                        Edit
                      </button>
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
