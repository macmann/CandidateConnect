"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { DocumentVersion } from "@/lib/domain/application";

interface ProfileState {
  name: string;
  email: string;
  cvBase: string;
  cvVersionsBaseNotes: string;
  coverLetterBase: string;
  defaultCvDocumentVersionId: string;
  defaultCoverDocumentVersionId: string;
}

const emptyProfile: ProfileState = {
  name: "",
  email: "",
  cvBase: "",
  cvVersionsBaseNotes: "",
  coverLetterBase: "",
  defaultCvDocumentVersionId: "",
  defaultCoverDocumentVersionId: "",
};

export function ProfileWorkspace() {
  const [profile, setProfile] = useState<ProfileState>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [uploadingType, setUploadingType] = useState<"CV" | "Cover" | null>(null);

  const cvVersions = useMemo(() => versions.filter((item) => item.type === "CV"), [versions]);
  const coverVersions = useMemo(() => versions.filter((item) => item.type === "Cover"), [versions]);

  async function loadVersions() {
    const response = await fetch("/api/document-versions", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to load document versions");
      return;
    }

    setVersions(data.versions ?? []);
  }

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
      defaultCvDocumentVersionId: data.profile?.defaultCvDocumentVersionId ?? "",
      defaultCoverDocumentVersionId: data.profile?.defaultCoverDocumentVersionId ?? "",
    });
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    loadProfile();
    loadVersions();
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

  async function uploadDocumentVersion(type: "CV" | "Cover", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingType(type);
    setMessage(null);

    const uploadForm = new FormData();
    uploadForm.set("file", file);

    const uploadResponse = await fetch("/api/uploads", {
      method: "POST",
      body: uploadForm,
    });
    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      setError(uploadData.error ?? "Upload failed");
      setUploadingType(null);
      return;
    }

    const label = `${file.name} (${new Date().toLocaleDateString()})`;
    const createResponse = await fetch("/api/document-versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        label,
        fileUrl: uploadData.url,
      }),
    });

    const createData = await createResponse.json();
    if (!createResponse.ok) {
      setError(createData.error ?? "Failed to create document version");
      setUploadingType(null);
      return;
    }

    const newVersion = createData.version as DocumentVersion;
    if (type === "CV") {
      setProfile((prev) => ({ ...prev, defaultCvDocumentVersionId: newVersion.id }));
    } else {
      setProfile((prev) => ({ ...prev, defaultCoverDocumentVersionId: newVersion.id }));
    }

    await loadVersions();
    setError(null);
    setMessage(`${type === "CV" ? "CV" : "Cover letter"} uploaded as a new version.`);
    setUploadingType(null);
    event.target.value = "";
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Profile</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          My base profile
        </h1>
        <p className="mt-3 text-sm text-slate-600 md:text-base">
          Upload CV and cover-letter versions here, keep multiple versions, and choose defaults
          to auto-attach while creating job applications.
        </p>
      </section>

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-2 md:grid-cols-2">
          <input
            placeholder="Your name (optional)"
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

        <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 md:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">
            Upload CV (new version)
            <input
              type="file"
              className="mt-1 block w-full rounded border bg-white p-2 text-sm"
              onChange={(event) => uploadDocumentVersion("CV", event)}
              disabled={uploadingType !== null}
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Upload Cover Letter (new version)
            <input
              type="file"
              className="mt-1 block w-full rounded border bg-white p-2 text-sm"
              onChange={(event) => uploadDocumentVersion("Cover", event)}
              disabled={uploadingType !== null}
            />
          </label>

          <select
            className="rounded border p-2 text-sm"
            value={profile.defaultCvDocumentVersionId}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, defaultCvDocumentVersionId: event.target.value }))
            }
          >
            <option value="">Default CV version</option>
            {cvVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>

          <select
            className="rounded border p-2 text-sm"
            value={profile.defaultCoverDocumentVersionId}
            onChange={(event) =>
              setProfile((prev) => ({ ...prev, defaultCoverDocumentVersionId: event.target.value }))
            }
          >
            <option value="">Default cover letter version</option>
            {coverVersions.map((version) => (
              <option key={version.id} value={version.id}>
                {version.label}
              </option>
            ))}
          </select>
        </div>

        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white" type="submit" disabled={loading}>
          Save profile
        </button>
      </form>

      {uploadingType && (
        <p className="rounded border border-sky-300 bg-sky-50 p-3 text-sky-700">
          Uploading {uploadingType === "CV" ? "CV" : "cover letter"}...
        </p>
      )}
      {message && <p className="rounded border border-emerald-300 bg-emerald-50 p-3 text-emerald-700">{message}</p>}
      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}
    </main>
  );
}

export default function ProfilePage() {
  return <ProfileWorkspace />;
}
