"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Application, ApplicationStatus, DocumentVersion } from "@/lib/domain/application";
import { JobDescriptionSnapshot } from "@/lib/domain/jobDescriptionSnapshot";

type SortKey = "company" | "location" | "status" | "updated_at";
type ViewMode = "kanban" | "list";

const statuses: ApplicationStatus[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

const emptyForm = {
  role: "",
  company: "",
  location: "",
  contactPerson: "",
  contactEmail: "",
  sourcePlatform: "",
  job_url: "",
  applied_date: "",
  salary_expectation: "",
  cvSubmitted: false,
  coverLetterSubmitted: false,
  notes: "",
  description: "",
  jdRawText: "",
  cvDocumentVersionId: "",
  coverDocumentVersionId: "",
  status: "Saved" as ApplicationStatus,
};

function dateKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function ApplicationsWorkspace() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentSnapshot, setCurrentSnapshot] = useState<JobDescriptionSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortAscending, setSortAscending] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("kanban");

  const [listStatusFilter, setListStatusFilter] = useState<"All" | ApplicationStatus>("All");
  const [listRangeStart, setListRangeStart] = useState("");
  const [listRangeEnd, setListRangeEnd] = useState("");
  const [listCompanyFilter, setListCompanyFilter] = useState("");

  const [kanbanStatusFilter, setKanbanStatusFilter] = useState<"All" | ApplicationStatus>("All");
  const [kanbanRangeStart, setKanbanRangeStart] = useState("");
  const [kanbanRangeEnd, setKanbanRangeEnd] = useState("");

  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

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
        sortKey === "company" ? a.company : sortKey === "updated_at" ? a.updated_at : a[sortKey];
      const right =
        sortKey === "company" ? b.company : sortKey === "updated_at" ? b.updated_at : b[sortKey];
      const value = String(left).localeCompare(String(right));
      return sortAscending ? value : -value;
    });
  }, [applications, sortKey, sortAscending]);

  const listFiltered = useMemo(() => {
    return sorted.filter((application) => {
      const matchesStatus = listStatusFilter === "All" || application.status === listStatusFilter;
      const day = dateKey(application.applied_date || application.updated_at);
      const matchesStart = !listRangeStart || (day && day >= listRangeStart);
      const matchesEnd = !listRangeEnd || (day && day <= listRangeEnd);
      const matchesCompany =
        !listCompanyFilter ||
        application.company.toLowerCase().includes(listCompanyFilter.toLowerCase()) ||
        application.role.toLowerCase().includes(listCompanyFilter.toLowerCase());
      return matchesStatus && matchesStart && matchesEnd && matchesCompany;
    });
  }, [sorted, listStatusFilter, listRangeStart, listRangeEnd, listCompanyFilter]);

  const kanbanFiltered = useMemo(() => {
    return applications.filter((application) => {
      const matchesStatus =
        kanbanStatusFilter === "All" || application.status === kanbanStatusFilter;
      const day = dateKey(application.applied_date || application.updated_at);
      const matchesStart = !kanbanRangeStart || (day && day >= kanbanRangeStart);
      const matchesEnd = !kanbanRangeEnd || (day && day <= kanbanRangeEnd);
      return matchesStatus && matchesStart && matchesEnd;
    });
  }, [applications, kanbanStatusFilter, kanbanRangeStart, kanbanRangeEnd]);

  const grouped = useMemo(() => {
    return statuses.reduce(
      (acc, status) => {
        acc[status] = kanbanFiltered.filter((app) => app.status === status);
        return acc;
      },
      {} as Record<ApplicationStatus, Application[]>,
    );
  }, [kanbanFiltered]);

  const cvVersions = useMemo(
    () => documentVersions.filter((version) => version.type === "CV"),
    [documentVersions],
  );
  const coverVersions = useMemo(
    () => documentVersions.filter((version) => version.type === "Cover"),
    [documentVersions],
  );

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = yesterdayDate.toISOString().slice(0, 10);

  const todayCount = applications.filter(
    (application) => dateKey(application.applied_date || application.updated_at) === todayKey,
  ).length;
  const yesterdayCount = applications.filter(
    (application) => dateKey(application.applied_date || application.updated_at) === yesterdayKey,
  ).length;

  async function startEdit(application: Application) {
    setEditingId(application.id);
    setIsDialogOpen(true);
    setForm({
      role: application.role,
      company: application.company,
      location: application.location ?? "",
      contactPerson: application.contactPerson ?? "",
      contactEmail: application.candidateEmail ?? "",
      sourcePlatform: application.sourcePlatform ?? "",
      job_url: application.job_url ?? "",
      applied_date: application.applied_date ? application.applied_date.slice(0, 10) : "",
      salary_expectation: application.salary_expectation ?? "",
      cvSubmitted: application.cvSubmitted ?? false,
      coverLetterSubmitted: application.coverLetterSubmitted ?? false,
      notes: application.notes ?? "",
      description: application.jobDescription.description,
      jdRawText: "",
      cvDocumentVersionId: application.cvDocumentVersionId ?? "",
      coverDocumentVersionId: application.coverDocumentVersionId ?? "",
      status: application.status,
    });

    await loadSnapshot(application.id);
  }

  function closeDialog() {
    setIsDialogOpen(false);
    setEditingId(null);
    setCurrentSnapshot(null);
    setForm(emptyForm);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const payload = {
      candidateName: "Me",
      candidateEmail: form.contactEmail,
      contactPerson: form.contactPerson,
      sourcePlatform: form.sourcePlatform,
      company: form.company,
      role: form.role,
      location: form.location,
      job_url: form.job_url,
      salary_expectation: form.salary_expectation || "",
      status: form.status,
      applied_date: form.applied_date,
      notes: form.notes || "",
      cvSubmitted: form.cvSubmitted,
      coverLetterSubmitted: form.coverLetterSubmitted,
      jobDescription: {
        title: form.role,
        company: form.company,
        location: form.location,
        description: form.description,
        sourceUrl: form.job_url,
      },
      cvDocumentVersionId: form.cvDocumentVersionId || undefined,
      coverDocumentVersionId: form.coverDocumentVersionId || undefined,
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

    closeDialog();
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

  async function customizeDocument(applicationId: string, kind: "CV" | "Cover") {
    setGeneratingFor(`${applicationId}:${kind}`);
    const response = await fetch(`/api/applications/${applicationId}/documents/customize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind }),
    });
    const data = await response.json();
    setGeneratingFor(null);
    if (!response.ok) {
      setError(data.error ?? `Failed to generate ${kind}`);
      return;
    }

    await Promise.all([loadApplications(), loadDocumentVersions()]);
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Applications</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
              Applications dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">Today: {todayCount} · Yesterday: {yesterdayCount}</p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            onClick={() => setIsDialogOpen(true)}
          >
            Create Application
          </button>
        </div>
      </section>

      {isDialogOpen && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <form onSubmit={onSubmit} className="space-y-3">
            <h2 className="text-xl font-medium">{editingId ? "Edit" : "Create"} application</h2>
            <div className="grid gap-2 md:grid-cols-2">
              <input required placeholder="Position Name" className="rounded border p-2" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} />
              <input required placeholder="Company Name" className="rounded border p-2" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} />
              <textarea required placeholder="Job description" className="min-h-24 rounded border p-2 md:col-span-2" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              <input placeholder="Contact person (optional)" className="rounded border p-2" value={form.contactPerson} onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))} />
              <input type="email" placeholder="Contact Email (optional)" className="rounded border p-2" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
              <input placeholder="Source Platform (optional)" className="rounded border p-2" value={form.sourcePlatform} onChange={(e) => setForm((f) => ({ ...f, sourcePlatform: e.target.value }))} />
              <input type="url" placeholder="Job URL (optional)" className="rounded border p-2" value={form.job_url} onChange={(e) => setForm((f) => ({ ...f, job_url: e.target.value }))} />
              <input required type="date" className="rounded border p-2" value={form.applied_date} onChange={(e) => setForm((f) => ({ ...f, applied_date: e.target.value }))} />
              <input placeholder="Expected Salary" className="rounded border p-2" value={form.salary_expectation} onChange={(e) => setForm((f) => ({ ...f, salary_expectation: e.target.value }))} />
              <select className="rounded border p-2" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ApplicationStatus }))}>
                {statuses.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 rounded border p-2 text-sm">
                <input type="checkbox" checked={form.cvSubmitted} onChange={(e) => setForm((f) => ({ ...f, cvSubmitted: e.target.checked }))} />
                CV Submitted
              </label>
              <label className="flex items-center gap-2 rounded border p-2 text-sm">
                <input type="checkbox" checked={form.coverLetterSubmitted} onChange={(e) => setForm((f) => ({ ...f, coverLetterSubmitted: e.target.checked }))} />
                Cover letter submitted
              </label>
              <select className="rounded border p-2" value={form.cvDocumentVersionId} onChange={(e) => setForm((f) => ({ ...f, cvDocumentVersionId: e.target.value }))}>
                <option value="">Select CV version</option>
                {cvVersions.map((version) => (
                  <option key={version.id} value={version.id}>{version.label}</option>
                ))}
              </select>
              <select className="rounded border p-2" value={form.coverDocumentVersionId} onChange={(e) => setForm((f) => ({ ...f, coverDocumentVersionId: e.target.value }))}>
                <option value="">Select cover letter version</option>
                {coverVersions.map((version) => (
                  <option key={version.id} value={version.id}>{version.label}</option>
                ))}
              </select>
              <textarea placeholder="Comments & Notes" className="min-h-24 rounded border p-2 md:col-span-2" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>

            {currentSnapshot ? (
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <h3 className="mb-1 font-medium">JD snapshot (read-only)</h3>
                <p className="mb-2 text-xs text-slate-500">Captured at {new Date(currentSnapshot.created_at).toLocaleString()}</p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm">{currentSnapshot.raw_text}</pre>
              </div>
            ) : (
              <textarea placeholder="Paste full job description text for immutable snapshot" className="min-h-36 w-full rounded border p-2" value={form.jdRawText} onChange={(e) => setForm((f) => ({ ...f, jdRawText: e.target.value }))} />
            )}

            {snapshotLoading && <p className="text-sm text-slate-500">Loading snapshot…</p>}

            <div className="flex gap-2">
              <button className="rounded-lg bg-slate-900 px-4 py-2 text-white transition hover:bg-slate-800" type="submit">Save application</button>
              <button type="button" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 transition hover:bg-slate-50" onClick={closeDialog}>
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={`rounded-lg px-3 py-2 text-sm ${viewMode === "kanban" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Application Kanban board
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={`rounded-lg px-3 py-2 text-sm ${viewMode === "list" ? "bg-slate-900 text-white" : "border border-slate-300 bg-white"}`}
          >
            Application list view
          </button>
        </div>

        {viewMode === "list" ? (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <select className="rounded border p-2 text-sm" value={listStatusFilter} onChange={(event) => setListStatusFilter(event.target.value as "All" | ApplicationStatus)}>
                <option value="All">All statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input type="text" placeholder="Filter by company or role" className="rounded border p-2 text-sm" value={listCompanyFilter} onChange={(event) => setListCompanyFilter(event.target.value)} />
              <input type="date" className="rounded border p-2 text-sm" value={listRangeStart} onChange={(event) => setListRangeStart(event.target.value)} />
              <input type="date" className="rounded border p-2 text-sm" value={listRangeEnd} onChange={(event) => setListRangeEnd(event.target.value)} />
            </div>

            {loading ? <p>Loading…</p> : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      {[ ["company", "Company"], ["location", "Location"], ["status", "Status"], ["updated_at", "Updated"] ].map(([key, label]) => (
                        <th key={key} className="cursor-pointer border-b px-2 py-2" onClick={() => {
                          const typedKey = key as SortKey;
                          if (typedKey === sortKey) setSortAscending((x) => !x);
                          else { setSortKey(typedKey); setSortAscending(true); }
                        }}>{label}</th>
                      ))}
                      <th className="border-b px-2 py-2">Details</th>
                      <th className="border-b px-2 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listFiltered.map((application) => (
                      <tr key={application.id} className="border-b">
                        <td className="px-2 py-2">{application.company}</td>
                        <td className="px-2 py-2">{application.location || "—"}</td>
                        <td className="px-2 py-2">{application.status}{application.submissionSnapshot ? " (Completed)" : ""}</td>
                        <td className="px-2 py-2">{new Date(application.updated_at).toLocaleString()}</td>
                        <td className="px-2 py-2 text-xs text-slate-600">
                          {application.role}<br />
                          Contact: {application.contactPerson || "—"}<br />
                          Email: {application.candidateEmail || "—"}<br />
                          Source: {application.sourcePlatform || "—"}<br />
                          {application.job_url ? <a href={application.job_url} className="text-sky-600 underline">Job link</a> : "No job URL"}<br />
                          Applied: {application.applied_date || "—"}<br />
                          Salary: {application.salary_expectation || "—"}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm" onClick={() => startEdit(application)} disabled={Boolean(application.submissionSnapshot)}>Edit</button>
                            <Link href={`/applications/${application.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm">Application tab</Link>
                            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm" onClick={() => customizeDocument(application.id, "CV")} disabled={Boolean(generatingFor)}>Generate customized CV</button>
                            <button className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm" onClick={() => customizeDocument(application.id, "Cover")} disabled={Boolean(generatingFor)}>Generate cover letter</button>
                            {application.submissionSnapshot && <Link href={`/applications/${application.id}/pack`} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm">Pack</Link>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <select className="rounded border p-2 text-sm" value={kanbanStatusFilter} onChange={(event) => setKanbanStatusFilter(event.target.value as "All" | ApplicationStatus)}>
                <option value="All">All statuses</option>
                {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <input type="date" className="rounded border p-2 text-sm" value={kanbanRangeStart} onChange={(event) => setKanbanRangeStart(event.target.value)} />
              <input type="date" className="rounded border p-2 text-sm" value={kanbanRangeEnd} onChange={(event) => setKanbanRangeEnd(event.target.value)} />
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              {statuses.map((status) => (
                <div key={status} className="min-h-40 rounded border border-slate-200 bg-slate-50 p-3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => {
                  const appId = event.dataTransfer.getData("text/plain");
                  if (appId) onDrop(status, appId);
                }}>
                  <h3 className="mb-2 font-semibold">{status}</h3>
                  <div className="space-y-2">
                    {grouped[status].map((application) => (
                      <div key={application.id} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", application.id)} className="cursor-grab rounded border bg-white p-2 text-sm">
                        <p className="font-medium">{application.company}</p>
                        <p className="text-slate-600">{application.role}</p>
                        <p className="text-slate-500">{application.applied_date || "Not applied"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

export default function ApplicationsPage() {
  return <ApplicationsWorkspace />;
}
