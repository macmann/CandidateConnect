"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Application,
  FieldAnswer,
  InterviewRound,
  InterviewRoundStatus,
  InterviewRoundType,
} from "@/lib/domain/application";
import { JobDescriptionSnapshot } from "@/lib/domain/jobDescriptionSnapshot";

const roundTypes: InterviewRoundType[] = [
  "Recruiter Screen",
  "Hiring Manager",
  "Technical",
  "System Design",
  "Panel",
  "Take-home",
  "Final",
  "Other",
];

const roundStatuses: InterviewRoundStatus[] = ["Planned", "Scheduled", "Completed", "Cancelled"];

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [snapshot, setSnapshot] = useState<JobDescriptionSnapshot | null>(null);
  const [answers, setAnswers] = useState<FieldAnswer[]>([]);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [questionBlock, setQuestionBlock] = useState("");
  const [tone, setTone] = useState("professional");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [roundType, setRoundType] = useState<InterviewRoundType>("Recruiter Screen");
  const [roundDateTime, setRoundDateTime] = useState("");
  const [roundNotes, setRoundNotes] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);

    const [applicationRes, snapshotRes, answersRes, roundsRes] = await Promise.all([
      fetch(`/api/applications/${id}`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/job-description-snapshot`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/answers`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/interview-rounds`, { cache: "no-store" }),
    ]);

    const applicationData = await applicationRes.json();
    if (!applicationRes.ok) {
      setError(applicationData.error ?? "Failed to load application");
      setLoading(false);
      return;
    }

    setApplication(applicationData.application ?? null);
    setSalaryExpectation(applicationData.application?.salary_expectation ?? "");

    if (snapshotRes.ok) {
      const snapshotData = await snapshotRes.json();
      setSnapshot(snapshotData.snapshot ?? null);
    }

    const answersData = await answersRes.json();
    if (answersRes.ok) {
      setAnswers(answersData.answers ?? []);
    }

    const roundsData = await roundsRes.json();
    if (roundsRes.ok) {
      setRounds(roundsData.rounds ?? []);
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
      body: JSON.stringify({ salary_expectation: salaryExpectation }),
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
      body: JSON.stringify({ salary_expectation: salaryExpectation }),
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

  async function copyText(idToCopy: string, text: string) {
    if (!text.trim()) return;
    await navigator.clipboard.writeText(text);
    setCopiedId(idToCopy);
    setTimeout(() => setCopiedId((current) => (current === idToCopy ? null : current)), 1200);
  }

  async function createRound(event: FormEvent) {
    event.preventDefault();

    const response = await fetch(`/api/applications/${id}/interview-rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        round_type: roundType,
        scheduled_at: roundDateTime ? new Date(roundDateTime).toISOString() : "",
        notes: roundNotes,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to create interview round");
      return;
    }

    setRounds((current) => [...current, data.round]);
    setRoundDateTime("");
    setRoundNotes("");
  }

  async function changeRoundStatus(roundId: string, status: InterviewRoundStatus) {
    const response = await fetch(`/api/applications/${id}/interview-rounds/${roundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) return;
    const data = await response.json();
    setRounds((current) => current.map((round) => (round.id === roundId ? data.round : round)));
  }

  async function removeRound(roundId: string) {
    const response = await fetch(`/api/applications/${id}/interview-rounds/${roundId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setRounds((current) => current.filter((round) => round.id !== roundId));
    }
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
        <h1 className="text-2xl font-semibold">Application workspace</h1>
        <div className="flex gap-2">
          {isSubmitted && (
            <Link href={`/applications/${application.id}/pack`} className="rounded border px-3 py-2 text-sm hover:bg-zinc-50">
              View application pack
            </Link>
          )}
          <Link href="/applications" className="rounded border px-3 py-2 text-sm hover:bg-zinc-50">
            Back to applications
          </Link>
        </div>
      </div>

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm shadow-sm md:grid-cols-2">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Company</p>
          <p className="font-semibold">{application.company}</p>
          <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">Role</p>
          <p>{application.role}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">Pipeline status</p>
          <p>{application.status}</p>
          {application.submissionSnapshot && (
            <p className="mt-2 text-emerald-700">
              Submitted at {new Date(application.submissionSnapshot.submitted_at).toLocaleString()} (frozen)
            </p>
          )}
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium">Compensation</h2>
        <input
          className="w-full rounded-lg border border-zinc-300 p-2"
          value={salaryExpectation}
          onChange={(event) => setSalaryExpectation(event.target.value)}
          disabled={isSubmitted || saving}
          placeholder="Salary expectation (required before submit)"
        />
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Interview rounds</h2>
          <span className="text-xs text-zinc-500">Structured timeline for this role</span>
        </div>

        <form onSubmit={createRound} className="grid gap-2 rounded-lg bg-zinc-50 p-3 md:grid-cols-4">
          <select
            className="rounded border border-zinc-300 p-2"
            value={roundType}
            onChange={(event) => setRoundType(event.target.value as InterviewRoundType)}
          >
            {roundTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="rounded border border-zinc-300 p-2"
            value={roundDateTime}
            onChange={(event) => setRoundDateTime(event.target.value)}
          />
          <input
            className="rounded border border-zinc-300 p-2 md:col-span-2"
            placeholder="Round notes"
            value={roundNotes}
            onChange={(event) => setRoundNotes(event.target.value)}
          />
          <button className="rounded bg-zinc-900 px-3 py-2 text-sm text-white md:col-span-4" type="submit">
            Add interview round
          </button>
        </form>

        {rounds.length === 0 ? (
          <p className="rounded border border-dashed p-3 text-sm text-zinc-500">No rounds yet.</p>
        ) : (
          rounds.map((round) => (
            <div key={round.id} className="flex flex-wrap items-center gap-2 rounded border border-zinc-200 p-3 text-sm">
              <p className="min-w-40 font-medium">{round.round_type}</p>
              <p className="min-w-44 text-zinc-600">
                {round.scheduled_at ? new Date(round.scheduled_at).toLocaleString() : "Not scheduled"}
              </p>
              <select
                className="rounded border border-zinc-300 p-1"
                value={round.status}
                onChange={(event) => changeRoundStatus(round.id, event.target.value as InterviewRoundStatus)}
              >
                {roundStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <p className="flex-1 text-zinc-600">{round.notes || "No notes"}</p>
              <button className="rounded border px-2 py-1 text-xs" onClick={() => removeRound(round.id)} type="button">
                Delete
              </button>
            </div>
          ))
        )}
      </section>

      <form onSubmit={onGenerate} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-medium">Generate drafts</h2>
        <select
          className="w-full rounded-lg border border-zinc-300 p-2"
          value={tone}
          onChange={(event) => setTone(event.target.value)}
          disabled={isSubmitted}
        >
          <option value="professional">Professional</option>
          <option value="concise">Concise</option>
          <option value="confident">Confident</option>
          <option value="friendly">Friendly</option>
        </select>
        <textarea
          className="min-h-36 w-full rounded-lg border border-zinc-300 p-2"
          placeholder="Paste one or multiple application questions"
          value={questionBlock}
          onChange={(event) => setQuestionBlock(event.target.value)}
          disabled={isSubmitted}
        />
        <button className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50" disabled={!canGenerate || saving || isSubmitted}>
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
              Mark submitted
            </button>
          </div>
        </div>

        {answers.length === 0 ? (
          <p className="rounded border p-4 text-sm text-zinc-600">No generated answers yet.</p>
        ) : (
          answers.map((answer) => (
            <article key={answer.id} className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
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

              <div className="rounded bg-zinc-50 p-3">
                <p className="mb-2 text-xs font-medium text-zinc-600">AI draft</p>
                <div className="whitespace-pre-wrap text-sm">{answer.ai_draft}</div>
                <button
                  type="button"
                  className="mt-2 rounded border px-2 py-1 text-xs"
                  onClick={() => copyText(`${answer.id}-draft`, answer.ai_draft)}
                  disabled={!answer.ai_draft.trim()}
                >
                  {copiedId === `${answer.id}-draft` ? "Copied" : "Copy draft"}
                </button>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-zinc-600">Final answer</p>
                <textarea
                  className="min-h-28 w-full rounded-lg border border-zinc-300 p-2"
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
                <button
                  type="button"
                  className="mt-2 rounded border px-2 py-1 text-xs"
                  onClick={() => copyText(`${answer.id}-final`, answer.final_answer)}
                  disabled={!answer.final_answer.trim()}
                >
                  {copiedId === `${answer.id}-final` ? "Copied" : "Copy final"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
