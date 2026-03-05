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

const interviewRoundTypes: InterviewRoundType[] = [
  "Recruiter Screen",
  "Hiring Manager",
  "Technical",
  "System Design",
  "Panel",
  "Take-home",
  "Final",
  "Other",
];

const interviewStatuses: InterviewRoundStatus[] = ["Planned", "Scheduled", "Completed", "Cancelled"];

const emptyRoundForm = {
  round_type: "Recruiter Screen" as InterviewRoundType,
  scheduled_at: "",
  status: "Planned" as InterviewRoundStatus,
  notes: "",
};

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [snapshot, setSnapshot] = useState<JobDescriptionSnapshot | null>(null);
  const [answers, setAnswers] = useState<FieldAnswer[]>([]);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [roundForm, setRoundForm] = useState(emptyRoundForm);
  const [questionBlock, setQuestionBlock] = useState("");
  const [tone, setTone] = useState("professional");
  const [salaryExpectation, setSalaryExpectation] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<Record<string, "copied" | "error">>({});

  const copyText = useCallback(async (key: string, text: string) => {
    if (!text.trim()) return;

    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback((current) => ({ ...current, [key]: "copied" }));
    } catch {
      setCopyFeedback((current) => ({ ...current, [key]: "error" }));
    }

    setTimeout(() => {
      setCopyFeedback((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }, 1800);
  }, []);

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
    setSalaryExpectation(applicationData.application?.salaryExpectation ?? "");

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

  async function saveRound(event: FormEvent) {
    event.preventDefault();

    const payload = {
      round_type: roundForm.round_type,
      scheduled_at: roundForm.scheduled_at ? new Date(roundForm.scheduled_at).toISOString() : "",
      status: roundForm.status,
      notes: roundForm.notes,
    };

    const response = await fetch(
      editingRoundId
        ? `/api/applications/${id}/interview-rounds/${editingRoundId}`
        : `/api/applications/${id}/interview-rounds`,
      {
        method: editingRoundId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    if (!response.ok) {
      setError(data.error ?? "Failed to save interview round");
      return;
    }

    await loadAll();
    setRoundForm(emptyRoundForm);
    setEditingRoundId(null);
  }

  function startEditRound(round: InterviewRound) {
    setEditingRoundId(round.id);
    setRoundForm({
      round_type: round.round_type,
      scheduled_at: round.scheduled_at ? round.scheduled_at.slice(0, 16) : "",
      status: round.status,
      notes: round.notes,
    });
  }

  async function removeRound(roundId: string) {
    const response = await fetch(`/api/applications/${id}/interview-rounds/${roundId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = await response.json();
      setError(data.error ?? "Failed to delete interview round");
      return;
    }

    await loadAll();
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

      <section className="rounded border p-4">
        <h2 className="text-lg font-medium">Interview progression</h2>
        {rounds.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-600">No interview rounds tracked yet.</p>
        ) : (
          <ol className="mt-3 space-y-2 border-l pl-4">
            {rounds.map((round) => (
              <li key={round.id} className="relative rounded border p-3 text-sm">
                <span className="absolute -left-[22px] top-4 h-2.5 w-2.5 rounded-full bg-black" />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{round.round_type}</p>
                  <p className="text-xs text-zinc-600">{round.status}</p>
                </div>
                <p className="mt-1 text-xs text-zinc-600">
                  {round.scheduled_at ? new Date(round.scheduled_at).toLocaleString() : "Not scheduled"}
                </p>
                {round.notes && <p className="mt-2 whitespace-pre-wrap">{round.notes}</p>}
                <div className="mt-2 flex gap-2">
                  <button className="rounded border px-2 py-1 text-xs" type="button" onClick={() => startEditRound(round)}>
                    Edit
                  </button>
                  <button
                    className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                    type="button"
                    onClick={() => removeRound(round.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}

        <form onSubmit={saveRound} className="mt-4 grid gap-2 rounded border p-3 md:grid-cols-2">
          <select
            className="rounded border p-2"
            value={roundForm.round_type}
            onChange={(event) => setRoundForm((current) => ({ ...current, round_type: event.target.value as InterviewRoundType }))}
          >
            {interviewRoundTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            className="rounded border p-2"
            value={roundForm.status}
            onChange={(event) => setRoundForm((current) => ({ ...current, status: event.target.value as InterviewRoundStatus }))}
          >
            {interviewStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="rounded border p-2"
            value={roundForm.scheduled_at}
            onChange={(event) => setRoundForm((current) => ({ ...current, scheduled_at: event.target.value }))}
          />
          <input
            className="rounded border p-2"
            placeholder="Round notes"
            value={roundForm.notes}
            onChange={(event) => setRoundForm((current) => ({ ...current, notes: event.target.value }))}
          />
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="rounded bg-black px-3 py-2 text-sm text-white">
              {editingRoundId ? "Update round" : "Add round"}
            </button>
            {editingRoundId && (
              <button
                type="button"
                className="rounded border px-3 py-2 text-sm"
                onClick={() => {
                  setEditingRoundId(null);
                  setRoundForm(emptyRoundForm);
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
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
              <div className="flex justify-end">
                <button
                  className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                  type="button"
                  onClick={() => copyText(`draft-${answer.id}`, answer.ai_draft ?? "")}
                  disabled={!answer.ai_draft?.trim()}
                >
                  {copyFeedback[`draft-${answer.id}`] === "copied"
                    ? "Copied"
                    : copyFeedback[`draft-${answer.id}`] === "error"
                      ? "Copy failed"
                      : "Copy draft"}
                </button>
              </div>
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
              <div className="flex justify-end">
                <button
                  className="rounded border px-3 py-1 text-xs disabled:opacity-50"
                  type="button"
                  onClick={() => copyText(`final-${answer.id}`, answer.final_answer ?? "")}
                  disabled={!answer.final_answer?.trim()}
                >
                  {copyFeedback[`final-${answer.id}`] === "copied"
                    ? "Copied"
                    : copyFeedback[`final-${answer.id}`] === "error"
                      ? "Copy failed"
                      : "Copy final"}
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
