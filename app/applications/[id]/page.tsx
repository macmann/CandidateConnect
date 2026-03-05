"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Application, FieldAnswer } from "@/lib/domain/application";
import { JobDescriptionSnapshot } from "@/lib/domain/jobDescriptionSnapshot";

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [snapshot, setSnapshot] = useState<JobDescriptionSnapshot | null>(null);
  const [answers, setAnswers] = useState<FieldAnswer[]>([]);
  const [questionBlock, setQuestionBlock] = useState("");
  const [tone, setTone] = useState("professional");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const [applicationRes, snapshotRes, answersRes] = await Promise.all([
      fetch(`/api/applications/${id}`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/job-description-snapshot`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/answers`, { cache: "no-store" }),
    ]);

    const applicationData = await applicationRes.json();
    if (!applicationRes.ok) {
      setError(applicationData.error ?? "Failed to load application");
      setLoading(false);
      return;
    }

    setApplication(applicationData.application ?? null);
    setSalaryExpectation(applicationData.application?.salaryExpectation ?? "");

    if (snapshotRes.ok) {
      const snapshotData = await snapshotRes.json();
      setSnapshot(snapshotData.snapshot ?? null);
    }

    const answersData = await answersRes.json();
    if (answersRes.ok) {
      setAnswers(answersData.answers ?? []);
    }

    setError(null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    if (id) {
      loadAll();
    }
  }, [id, loadAll]);

  const canGenerate = useMemo(() => questionBlock.trim().length > 0, [questionBlock]);
  const isSubmitted = Boolean(application?.submissionSnapshot);

  async function onGenerate(event: FormEvent) {
    event.preventDefault();
    if (!canGenerate || isSubmitted) return;

    setSaving(true);
    const response = await fetch(`/api/applications/${id}/answers/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_block: questionBlock,
        tone,
        snapshot_id: snapshot?.created_at,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to generate drafts");
      setSaving(false);
      return;
    }

    setAnswers(data.answers ?? []);
    setError(null);
    setSaving(false);
  }

  async function regenerateQuestion(question: string) {
    if (isSubmitted) return;
    setSaving(true);
    const response = await fetch(`/api/applications/${id}/answers/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_block: question,
        tone,
        snapshot_id: snapshot?.created_at,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to regenerate draft");
      setSaving(false);
      return;
    }

    setAnswers(data.answers ?? []);
    setSaving(false);
  }

  async function saveFinalAnswers() {
    if (isSubmitted) return;
    setSaving(true);
    const response = await fetch(`/api/applications/${id}/answers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: answers.map((answer) => ({
          question: answer.question,
          final_answer: answer.final_answer,
        })),
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to save final answers");
      setSaving(false);
      return;
    }

    const salaryResponse = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salaryExpectation }),
    });

    const salaryData = await salaryResponse.json();
    if (!salaryResponse.ok) {
      setError(salaryData.error ?? "Failed to save salary expectation");
      setSaving(false);
      return;
    }

    setApplication(salaryData.application ?? application);
    setAnswers(data.answers ?? []);
    setError(null);
    setSaving(false);
  }

  async function submitApplication() {
    setSaving(true);
    const salaryResponse = await fetch(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salaryExpectation }),
    });

    if (!salaryResponse.ok) {
      const salaryData = await salaryResponse.json();
      setError(salaryData.error ?? "Failed to save salary expectation");
      setSaving(false);
      return;
    }

    const response = await fetch(`/api/applications/${id}/submit`, { method: "POST" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to submit application");
      setSaving(false);
      return;
    }

    setApplication(data.application ?? null);
    setError(null);
    setSaving(false);
  }

  if (loading) {
    return <main className="mx-auto max-w-5xl px-6 py-10">Loading…</main>;
  }

  if (!application) {
    return <main className="mx-auto max-w-5xl px-6 py-10">Application not found.</main>;
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-5 px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Application answer workflow</h1>
        <div className="flex gap-2">
          {isSubmitted && (
            <Link href={`/applications/${application.id}/pack`} className="rounded border px-3 py-2 text-sm">
              View application pack
            </Link>
          )}
          <Link href="/applications" className="rounded border px-3 py-2 text-sm">
            Back to applications
          </Link>
        </div>
      </div>

      <section className="rounded border p-4 text-sm">
        <p className="font-medium">{application.candidateName}</p>
        <p className="text-zinc-600">
          {application.jobDescription.title} at {application.jobDescription.company}
        </p>
        {application.submissionSnapshot && (
          <p className="mt-1 text-emerald-700">
            Submitted at {new Date(application.submissionSnapshot.submitted_at).toLocaleString()} (frozen)
          </p>
        )}
      </section>

      <section className="space-y-2 rounded border p-4">
        <h2 className="text-lg font-medium">Compensation</h2>
        <input
          className="w-full rounded border p-2"
          value={salaryExpectation}
          onChange={(event) => setSalaryExpectation(event.target.value)}
          disabled={isSubmitted || saving}
          placeholder="Salary expectation (required before submit)"
        />
      </section>

      <form onSubmit={onGenerate} className="space-y-3 rounded border p-4">
        <h2 className="text-lg font-medium">Generate drafts</h2>
        <input
          className="w-full rounded border p-2"
          value={tone}
          onChange={(event) => setTone(event.target.value)}
          placeholder="Tone (e.g. professional, concise, confident)"
          disabled={isSubmitted}
        />
        <textarea
          className="min-h-36 w-full rounded border p-2"
          placeholder="Paste one or multiple application questions"
          value={questionBlock}
          onChange={(event) => setQuestionBlock(event.target.value)}
          disabled={isSubmitted}
        />
        <button className="rounded bg-black px-4 py-2 text-white disabled:opacity-50" disabled={!canGenerate || saving || isSubmitted}>
          {saving ? "Working…" : "Generate drafts"}
        </button>
      </form>

      {error && <p className="rounded border border-red-300 bg-red-50 p-3 text-red-700">{error}</p>}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Question answers</h2>
          <div className="flex gap-2">
            <button className="rounded border px-3 py-2 text-sm" onClick={saveFinalAnswers} disabled={saving || isSubmitted}>
              Save final answers
            </button>
            <button className="rounded bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50" onClick={submitApplication} disabled={saving || isSubmitted}>
              Submit application
            </button>
          </div>
        </div>

        {answers.length === 0 ? (
          <p className="rounded border p-4 text-sm text-zinc-600">No generated answers yet.</p>
        ) : (
          answers.map((answer) => (
            <article key={answer.id} className="space-y-2 rounded border p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium">{answer.question}</h3>
                <button
                  className="rounded border px-3 py-1 text-xs"
                  onClick={() => regenerateQuestion(answer.question)}
                  type="button"
                  disabled={isSubmitted}
                >
                  Regenerate
                </button>
              </div>
              <div className="whitespace-pre-wrap rounded bg-zinc-50 p-3 text-sm">{answer.ai_draft}</div>
              <textarea
                className="min-h-28 w-full rounded border p-2"
                value={answer.final_answer}
                onChange={(event) =>
                  setAnswers((current) =>
                    current.map((item) =>
                      item.id === answer.id ? { ...item, final_answer: event.target.value } : item,
                    ),
                  )
                }
                placeholder="Edit final answer before saving"
                disabled={isSubmitted}
              />
            </article>
          ))
        )}
      </section>
    </main>
  );
}
