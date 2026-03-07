"use client";

import { FormEvent, useEffect, useState } from "react";

interface ProfileState {
  name: string;
  email: string;
  cvBase: string;
  cvVersionsBaseNotes: string;
  coverLetterBase: string;
}

const emptyProfile: ProfileState = {
  name: "",
  email: "",
  cvBase: "",
  cvVersionsBaseNotes: "",
  coverLetterBase: "",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    const response = await fetch("/api/profile", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to load profile");
      setLoading(false);
      return;
    }

    setProfile({
      name: data.profile?.name ?? "",
      email: data.profile?.email ?? "",
      cvBase: data.profile?.cvBase ?? "",
      cvVersionsBaseNotes: data.profile?.cvVersionsBaseNotes ?? "",
      coverLetterBase: data.profile?.coverLetterBase ?? "",
    });
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const data = await response.json();

    if (!response.ok) {
      setError(data.error ?? "Failed to save profile");
      setMessage(null);
      return;
    }

    setError(null);
    setMessage("Profile saved.");
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          My base profile
        </h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">
          Store your one-user base CV and cover letter here. AI customization for each application
          will use this profile and that application&apos;s job description.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            required
            placeholder="Your name"
            className="rounded border p-2"
            value={profile.name}
            onChange={(event) => setProfile((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            required
            type="email"
            placeholder="Your email"
            className="rounded border p-2"
            value={profile.email}
            onChange={(event) => setProfile((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>

        <textarea
          required
          placeholder="Base CV text"
          className="min-h-48 rounded border p-2"
          value={profile.cvBase}
          onChange={(event) => setProfile((prev) => ({ ...prev, cvBase: event.target.value }))}
        />

        <textarea
          placeholder="CV versions notes (optional)"
          className="min-h-24 rounded border p-2"
          value={profile.cvVersionsBaseNotes}
          onChange={(event) =>
            setProfile((prev) => ({ ...prev, cvVersionsBaseNotes: event.target.value }))
          }
        />

        <textarea
          required
          placeholder="Base cover letter"
          className="min-h-40 rounded border p-2"
          value={profile.coverLetterBase}
          onChange={(event) =>
            setProfile((prev) => ({ ...prev, coverLetterBase: event.target.value }))
          }
        />

        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit" disabled={loading}>
          Save profile
        </button>
      </form>

      {message && <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-emerald-700">{message}</p>}
      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}
    </main>
  );
}
