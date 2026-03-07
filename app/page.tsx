"use client";

import { useState } from "react";
import { ApplicationsWorkspace } from "@/app/applications/page";
import { DocumentsWorkspace } from "@/app/documents/page";
import { ProfileWorkspace } from "@/app/profile/page";

type TabKey = "profile" | "applications" | "analytics";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Workspace</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          CandidateConnect
        </h1>
        <p className="mt-3 max-w-3xl text-base text-slate-600 md:text-lg">
          Use tabs to manage your profile data (including CV/cover letter versions) and your job
          applications with status and location tracking.
        </p>
      </section>

      <div className="flex flex-wrap gap-2">
        {[
          ["profile", "My Profile"],
          ["applications", "Applications"],
          ["analytics", "Analytics"],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key as TabKey)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === key
                ? "bg-slate-900 text-white"
                : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <div className="space-y-6">
          <ProfileWorkspace />
          <DocumentsWorkspace />
        </div>
      )}

      {activeTab === "applications" && <ApplicationsWorkspace />}

      {activeTab === "analytics" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          Analytics is intentionally deferred for now.
        </section>
      )}
    </div>
  );
}
