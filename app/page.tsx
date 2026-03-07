"use client";

import { useEffect, useMemo, useState } from "react";
import { Application, ApplicationStatus } from "@/lib/domain/application";
import Link from "next/link";

const statuses: Array<ApplicationStatus | "All"> = ["All", "Saved", "Applied", "Interview", "Offer", "Rejected"];

export default function HomePage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "All">("All");
  const [companyFilter, setCompanyFilter] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function loadAll() {
    const appRes = await fetch("/api/applications", { cache: "no-store" });

    const appJson = await appRes.json();

    if (!appRes.ok) {
      setError(appJson.error ?? "Failed to load workspace");
      return;
    }

    const loadedApps = appJson.applications ?? [];
    setApplications(loadedApps);
    setError(null);
  }

  useEffect(() => {
    loadAll();
  }, []);


  const filteredForDashboard = useMemo(() => {
    return applications.filter((application) => {
      const statusMatch = statusFilter === "All" || application.status === statusFilter;
      const companyMatch =
        !companyFilter || application.company.toLowerCase().includes(companyFilter.toLowerCase());
      return statusMatch && companyMatch;
    });
  }, [applications, statusFilter, companyFilter]);



  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">CandidateConnect</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Unified job search workspace</h1>
        <p className="mt-2 text-sm text-slate-600">Track your applications in one dashboard, then use the header navigation to jump to Applications and Profile.</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input className="rounded border p-2 text-sm" placeholder="Filter by company" value={companyFilter} onChange={(event) => setCompanyFilter(event.target.value)} />
          <select className="rounded border p-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "All")}>
            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          <Link href="/applications" className="rounded border px-3 py-2 text-sm">Open applications workspace</Link>
          <Link href="/applications" className="rounded bg-slate-900 px-3 py-2 text-sm text-white">Make new application</Link>
        </div>
        <div className="space-y-3">
          {filteredForDashboard.map((application) => (
            <div key={application.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
              <div>
                <p className="font-medium">{application.role} · {application.company}</p>
                <p className="text-xs text-slate-500">Status: {application.status}</p>
              </div>
              <Link href={`/applications/${application.id}`} className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm">
                View details
              </Link>
            </div>
          ))}
          {filteredForDashboard.length === 0 && (
            <p className="rounded border border-dashed border-slate-300 p-4 text-sm text-slate-600">
              No applications match your filters.
            </p>
          )}
        </div>
      </section>
      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </main>
  );
}
