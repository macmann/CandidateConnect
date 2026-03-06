"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Application,
  DebriefArtifact,
  InterviewRound,
  InterviewRoundStatus,
  InterviewRoundType,
  Interviewer,
  PrepArtifact,
  RoundTaskList,
} from "@/lib/domain/application";

type RoundDebriefPayload = {
  latestArtifact: DebriefArtifact | null;
  taskList: RoundTaskList | null;
};

type TaskListDraft = {
  follow_up_reminder_at: string;
  take_home_items: Array<{ id: string; text: string; completed: boolean }>;
  new_item_text: string;
};

type RoundEditableFields = {
  scheduled_at: string;
  timezone: string;
  mode: string;
  location_or_link: string;
  purpose: string;
  notes: string;
  round_type: InterviewRoundType;
};

const roundTypes: InterviewRoundType[] = [
  "Recruiter",
  "Hiring Manager",
  "Technical",
  "Case",
  "Panel",
  "Final",
];
const roundStatuses: InterviewRoundStatus[] = [
  "Scheduled",
  "Completed",
  "Passed",
  "Failed",
  "Cancelled",
];

function toDatetimeLocalValue(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getRoundEditableState(round: InterviewRound): RoundEditableFields {
  return {
    scheduled_at: toDatetimeLocalValue(round.scheduled_at),
    timezone: round.timezone ?? "",
    mode: round.mode ?? "",
    location_or_link: round.location_or_link ?? "",
    purpose: round.purpose ?? "",
    notes: round.notes ?? "",
    round_type: round.round_type,
  };
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [roundPeople, setRoundPeople] = useState<Record<string, Interviewer[]>>({});
  const [prepByRound, setPrepByRound] = useState<Record<string, PrepArtifact[]>>({});
  const [debriefByRound, setDebriefByRound] = useState<Record<string, RoundDebriefPayload>>({});
  const [taskDraftByRound, setTaskDraftByRound] = useState<Record<string, TaskListDraft>>({});
  const [activities, setActivities] = useState<
    Array<{ id: string; message: string; created_at: string }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  const [roundType, setRoundType] = useState<InterviewRoundType>("Recruiter");
  const [datetime, setDatetime] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [mode, setMode] = useState("Zoom");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");

  const [personName, setPersonName] = useState("");
  const [personTitle, setPersonTitle] = useState("");
  const [personDepartment, setPersonDepartment] = useState("");
  const [personLinkedinUrl, setPersonLinkedinUrl] = useState("");
  const [personNotes, setPersonNotes] = useState("");

  const [prepTone, setPrepTone] = useState<"concise" | "detailed">("concise");
  const [prepLength, setPrepLength] = useState<"short" | "full">("short");

  const [debrief, setDebrief] = useState<Record<string, Record<string, string>>>({});
  const [roundEdits, setRoundEdits] = useState<Record<string, RoundEditableFields>>({});
  const [roundSaveState, setRoundSaveState] = useState<
    Record<string, { saving: boolean; message?: string; error?: string }>
  >({});

  const load = useCallback(async () => {
    const [applicationRes, roundsRes, interviewerRes, activityRes] = await Promise.all([
      fetch(`/api/applications/${id}`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/interview-rounds`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/interviewers`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/activity`, { cache: "no-store" }),
    ]);

    const appData = await applicationRes.json();
    if (!applicationRes.ok) {
      setError(appData.error ?? "Failed to load");
      return;
    }

    setApplication(appData.application);
    const roundsData = await roundsRes.json();
    const interviewersData = await interviewerRes.json();
    const activityData = await activityRes.json();
    const loadedRounds: InterviewRound[] = roundsData.rounds ?? [];
    setRounds(loadedRounds);
    setRoundEdits((current) => {
      const next = { ...current };
      for (const round of loadedRounds) {
        if (!next[round.id]) {
          next[round.id] = getRoundEditableState(round);
        }
      }
      return next;
    });
    setInterviewers(interviewersData.interviewers ?? []);
    setActivities(activityData.activities ?? []);

    const people: Record<string, Interviewer[]> = {};
    const preps: Record<string, PrepArtifact[]> = {};
    const debriefs: Record<string, RoundDebriefPayload> = {};
    await Promise.all(
      loadedRounds.map(async (round) => {
        const [peopleRes, prepRes, debriefRes] = await Promise.all([
          fetch(`/api/applications/${id}/interview-rounds/${round.id}/interviewers`, {
            cache: "no-store",
          }),
          fetch(`/api/applications/${id}/interview-rounds/${round.id}/prep-pack`, {
            cache: "no-store",
          }),
          fetch(`/api/applications/${id}/interview-rounds/${round.id}/debrief`, {
            cache: "no-store",
          }),
        ]);
        const peopleData = await peopleRes.json();
        const prepData = await prepRes.json();
        const debriefData = await debriefRes.json();
        people[round.id] = peopleData.interviewers ?? [];
        preps[round.id] = prepData.artifacts ?? [];
        debriefs[round.id] = {
          latestArtifact: debriefData.latestArtifact ?? null,
          taskList: debriefData.taskList ?? null,
        };
      }),
    );

    setRoundPeople(people);
    setPrepByRound(preps);
    setDebriefByRound(debriefs);
    setTaskDraftByRound((current) => {
      const next = { ...current };
      for (const round of loadedRounds) {
        const taskList = debriefs[round.id]?.taskList;
        next[round.id] = {
          follow_up_reminder_at: toDatetimeLocalValue(taskList?.follow_up_reminder_at),
          take_home_items: taskList?.take_home_items ?? [],
          new_item_text: current[round.id]?.new_item_text ?? "",
        };
      }
      return next;
    });
    setError(null);
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  const isSubmitted = useMemo(() => Boolean(application?.submissionSnapshot), [application]);

  async function createRound(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/applications/${id}/interview-rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        round_type: roundType,
        scheduled_at: datetime ? new Date(datetime).toISOString() : "",
        timezone,
        mode,
        location_or_link: location,
        purpose,
      }),
    });
    if (!response.ok) return setError("Failed to create round");
    setDatetime("");
    setLocation("");
    setPurpose("");
    await load();
  }

  async function moveToNextRound() {
    await fetch(`/api/applications/${id}/interview-rounds`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "next" }),
    });
    await load();
  }

  async function createInterviewer(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/applications/${id}/interviewers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: personName || "Unknown interviewer",
        title: personTitle,
        department: personDepartment,
        linkedin_url: personLinkedinUrl,
        notes: personNotes,
      }),
    });
    if (!response.ok) return;
    setPersonName("");
    setPersonTitle("");
    setPersonDepartment("");
    setPersonLinkedinUrl("");
    setPersonNotes("");
    await load();
  }

  async function toggleInterviewer(roundId: string, interviewerId: string) {
    const current = roundPeople[roundId] ?? [];
    const has = current.some((item) => item.id === interviewerId);
    const nextIds = has
      ? current.filter((item) => item.id !== interviewerId).map((item) => item.id)
      : [...current.map((item) => item.id), interviewerId];

    await fetch(`/api/applications/${id}/interview-rounds/${roundId}/interviewers`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interviewer_ids: nextIds }),
    });
    await load();
  }

  async function updateRoundStatus(roundId: string, status: InterviewRoundStatus) {
    await fetch(`/api/applications/${id}/interview-rounds/${roundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function generatePrep(roundId: string) {
    await fetch(`/api/applications/${id}/interview-rounds/${roundId}/prep-pack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tone: prepTone, length: prepLength }),
    });
    await load();
  }

  function updateRoundEdit(roundId: string, field: keyof RoundEditableFields, value: string) {
    setRoundEdits((current) => ({
      ...current,
      [roundId]: {
        ...(current[roundId] ??
          getRoundEditableState(rounds.find((round) => round.id === roundId) as InterviewRound)),
        [field]: value,
      },
    }));
    setRoundSaveState((current) => ({ ...current, [roundId]: { saving: false } }));
  }

  async function saveRoundChanges(roundId: string) {
    const edits = roundEdits[roundId];
    if (!edits) return;

    const payload = {
      scheduled_at: edits.scheduled_at ? new Date(edits.scheduled_at).toISOString() : "",
      timezone: edits.timezone,
      mode: edits.mode,
      location_or_link: edits.location_or_link,
      purpose: edits.purpose,
      notes: edits.notes,
      round_type: edits.round_type,
    };

    const previousRound = rounds.find((round) => round.id === roundId);

    setRoundSaveState((current) => ({
      ...current,
      [roundId]: { saving: true, message: "Saving changes…" },
    }));
    setRounds((current) =>
      current.map((round) =>
        round.id === roundId
          ? { ...round, ...payload, scheduled_at: payload.scheduled_at || undefined }
          : round,
      ),
    );

    const response = await fetch(`/api/applications/${id}/interview-rounds/${roundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      setRoundSaveState((current) => ({
        ...current,
        [roundId]: { saving: false, error: "Failed to save round changes. Please retry." },
      }));
      if (previousRound) {
        setRounds((current) =>
          current.map((round) => (round.id === roundId ? previousRound : round)),
        );
      }
      return;
    }

    const data = await response.json();
    const updatedRound = data.round as InterviewRound;
    setRounds((current) => current.map((round) => (round.id === roundId ? updatedRound : round)));
    setRoundEdits((current) => ({ ...current, [roundId]: getRoundEditableState(updatedRound) }));
    setRoundSaveState((current) => ({
      ...current,
      [roundId]: { saving: false, message: "Round changes saved." },
    }));
  }

  async function pinPrep(roundId: string, artifactId: string) {
    await fetch(`/api/applications/${id}/interview-rounds/${roundId}/prep-pack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pin", artifact_id: artifactId }),
    });
    await load();
  }

  async function saveDebrief(roundId: string) {
    const values = debrief[roundId] ?? {};
    await fetch(`/api/applications/${id}/interview-rounds/${roundId}/debrief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    await load();
  }

  function updateTaskDraft(roundId: string, updater: (draft: TaskListDraft) => TaskListDraft) {
    setTaskDraftByRound((current) => {
      const existing = current[roundId] ?? {
        follow_up_reminder_at: "",
        take_home_items: [],
        new_item_text: "",
      };
      return { ...current, [roundId]: updater(existing) };
    });
  }

  function addChecklistItem(roundId: string) {
    updateTaskDraft(roundId, (draft) => {
      const text = draft.new_item_text.trim();
      if (!text) return draft;
      return {
        ...draft,
        take_home_items: [
          ...draft.take_home_items,
          { id: crypto.randomUUID(), text, completed: false },
        ],
        new_item_text: "",
      };
    });
  }

  function removeChecklistItem(roundId: string, itemId: string) {
    updateTaskDraft(roundId, (draft) => ({
      ...draft,
      take_home_items: draft.take_home_items.filter((item) => item.id !== itemId),
    }));
  }

  async function saveTaskList(roundId: string) {
    const draft = taskDraftByRound[roundId] ?? {
      follow_up_reminder_at: "",
      take_home_items: [],
      new_item_text: "",
    };
    await fetch(`/api/applications/${id}/interview-rounds/${roundId}/debrief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        follow_up_reminder_at: draft.follow_up_reminder_at
          ? new Date(draft.follow_up_reminder_at).toISOString()
          : "",
        take_home_items: draft.take_home_items,
      }),
    });
    await load();
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      setError("Could not copy to clipboard.");
    }
  }

  if (!application) return <main className="mx-auto max-w-5xl p-6">Loading…</main>;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            {application.company} — {application.role}
          </h1>
          <p className="text-sm text-zinc-500">Interview command center</p>
        </div>
        <Link href="/applications" className="rounded border px-3 py-2 text-sm">
          Back
        </Link>
      </div>

      <section className="rounded border p-4">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Interview rounds timeline</h2>
          <button className="rounded border px-2 py-1 text-xs" onClick={moveToNextRound}>
            Move to next round
          </button>
        </div>
        <form onSubmit={createRound} className="grid gap-2 md:grid-cols-3">
          <select
            className="rounded border p-2"
            value={roundType}
            onChange={(e) => setRoundType(e.target.value as InterviewRoundType)}
          >
            {roundTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <input
            type="datetime-local"
            className="rounded border p-2"
            value={datetime}
            onChange={(e) => setDatetime(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          />
          <select
            className="rounded border p-2"
            value={mode}
            onChange={(e) => setMode(e.target.value)}
          >
            <option>Zoom</option>
            <option>Onsite</option>
            <option>Phone</option>
          </select>
          <input
            className="rounded border p-2"
            placeholder="Location / meeting link"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Purpose / goals"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
          />
          <button className="rounded bg-black px-3 py-2 text-white md:col-span-3">Add round</button>
        </form>

        <div className="mt-3 space-y-3">
          {rounds.map((round) => {
            const prep = prepByRound[round.id] ?? [];
            const pinned = prep.find((item) => item.pinned) ?? prep[0];
            const edit = roundEdits[round.id] ?? getRoundEditableState(round);
            const saveState = roundSaveState[round.id];
            const latestDebriefArtifact = debriefByRound[round.id]?.latestArtifact;
            const taskDraft = taskDraftByRound[round.id] ?? {
              follow_up_reminder_at: "",
              take_home_items: [],
              new_item_text: "",
            };
            return (
              <article key={round.id} className="rounded border p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    Round {round.round_index}: {round.round_type}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {round.scheduled_at
                      ? new Date(round.scheduled_at).toLocaleString()
                      : "Date TBD"}{" "}
                    {round.timezone || ""}
                  </p>
                  <select
                    className="rounded border p-1"
                    value={round.status}
                    onChange={(e) =>
                      updateRoundStatus(round.id, e.target.value as InterviewRoundStatus)
                    }
                  >
                    {roundStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Link
                    href={`/applications/${id}/interview-rounds/${round.id}/cheat-sheet`}
                    className="rounded border border-zinc-900 px-2 py-1 text-xs font-medium text-zinc-900"
                  >
                    Cheat Sheet
                  </Link>
                </div>
                <p className="text-sm text-zinc-600">
                  Mode: {round.mode || "TBD"} · {round.location_or_link || "location TBD"}
                </p>
                <p className="text-sm">Purpose: {round.purpose || "TBD"}</p>

                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <input
                    type="datetime-local"
                    className="rounded border p-2 text-sm"
                    value={edit.scheduled_at}
                    onChange={(e) => updateRoundEdit(round.id, "scheduled_at", e.target.value)}
                  />
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="Timezone"
                    value={edit.timezone}
                    onChange={(e) => updateRoundEdit(round.id, "timezone", e.target.value)}
                  />
                  <select
                    className="rounded border p-2 text-sm"
                    value={edit.mode}
                    onChange={(e) => updateRoundEdit(round.id, "mode", e.target.value)}
                  >
                    <option value="">Select mode</option>
                    <option value="Zoom">Zoom</option>
                    <option value="Onsite">Onsite</option>
                    <option value="Phone">Phone</option>
                  </select>
                  <select
                    className="rounded border p-2 text-sm"
                    value={edit.round_type}
                    onChange={(e) => updateRoundEdit(round.id, "round_type", e.target.value)}
                  >
                    {roundTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded border p-2 text-sm md:col-span-2"
                    placeholder="Location / meeting link"
                    value={edit.location_or_link}
                    onChange={(e) => updateRoundEdit(round.id, "location_or_link", e.target.value)}
                  />
                  <input
                    className="rounded border p-2 text-sm md:col-span-2"
                    placeholder="Purpose"
                    value={edit.purpose}
                    onChange={(e) => updateRoundEdit(round.id, "purpose", e.target.value)}
                  />
                  <textarea
                    className="rounded border p-2 text-sm md:col-span-2"
                    placeholder="Notes"
                    value={edit.notes}
                    onChange={(e) => updateRoundEdit(round.id, "notes", e.target.value)}
                  />
                  <div className="md:col-span-2">
                    <button
                      className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => saveRoundChanges(round.id)}
                      disabled={saveState?.saving}
                      type="button"
                    >
                      {saveState?.saving ? "Saving…" : "Save round changes"}
                    </button>
                    {saveState?.message && (
                      <p className="mt-1 text-xs text-emerald-700">{saveState.message}</p>
                    )}
                    {saveState?.error && (
                      <p className="mt-1 text-xs text-red-700">{saveState.error}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <p className="text-sm font-medium">People in this round</p>
                  <p className="text-xs text-zinc-500">
                    {(roundPeople[round.id] ?? []).map((p) => p.name).join(", ") ||
                      "No one linked yet"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {interviewers.map((person) => (
                      <button
                        key={person.id}
                        className={`rounded border px-2 py-1 text-xs ${(roundPeople[round.id] ?? []).some((r) => r.id === person.id) ? "bg-zinc-900 text-white" : ""}`}
                        onClick={() => toggleInterviewer(round.id, person.id)}
                        type="button"
                      >
                        {person.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-3 rounded bg-zinc-50 p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <select
                      className="rounded border p-1 text-xs"
                      value={prepTone}
                      onChange={(e) => setPrepTone(e.target.value as "concise" | "detailed")}
                    >
                      <option value="concise">Concise</option>
                      <option value="detailed">Detailed</option>
                    </select>
                    <select
                      className="rounded border p-1 text-xs"
                      value={prepLength}
                      onChange={(e) => setPrepLength(e.target.value as "short" | "full")}
                    >
                      <option value="short">Short pack</option>
                      <option value="full">Full pack</option>
                    </select>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => generatePrep(round.id)}
                      type="button"
                    >
                      Generate Prep Pack
                    </button>
                  </div>
                  {pinned ? (
                    <>
                      {pinned.warning && (
                        <p className="mb-2 text-xs text-amber-700">{pinned.warning}</p>
                      )}
                      <pre className="max-h-72 overflow-auto whitespace-pre-wrap text-xs">
                        {pinned.generated_text}
                      </pre>
                      <div className="mt-2 flex gap-2">
                        {prep.map((item) => (
                          <button
                            key={item.id}
                            className="rounded border px-2 py-1 text-xs"
                            onClick={() => pinPrep(round.id, item.id)}
                            type="button"
                          >
                            Pin v{item.version}
                            {item.pinned ? " ✓" : ""}
                          </button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-xs text-zinc-500">No prep yet.</p>
                  )}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Post-round debrief
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {[
                      ["raw_notes", "Raw notes"],
                      ["questions_asked", "What questions were asked?"],
                      ["went_well", "What went well?"],
                      ["went_badly", "What went badly?"],
                      ["to_improve", "What to improve?"],
                      ["follow_up_tasks", "Follow-up tasks"],
                    ].map(([key, label]) => (
                      <textarea
                        key={key}
                        className="rounded border p-2 text-sm"
                        placeholder={label}
                        value={debrief[round.id]?.[key] ?? ""}
                        onChange={(e) =>
                          setDebrief((current) => ({
                            ...current,
                            [round.id]: { ...(current[round.id] ?? {}), [key]: e.target.value },
                          }))
                        }
                      />
                    ))}
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => saveDebrief(round.id)}
                      type="button"
                    >
                      Generate summary + improvement plan
                    </button>

                    {latestDebriefArtifact ? (
                      <div className="rounded border bg-zinc-50 p-3 text-sm">
                        <p className="font-medium">Latest debrief artifact</p>
                        <p className="mt-2 text-xs font-semibold uppercase text-zinc-500">
                          Summary
                        </p>
                        <p>{latestDebriefArtifact.generated_summary}</p>
                        <p className="mt-2 text-xs font-semibold uppercase text-zinc-500">
                          Improvements
                        </p>
                        <p>{latestDebriefArtifact.improvements}</p>
                        <p className="mt-2 text-xs font-semibold uppercase text-zinc-500">
                          Next-round focus
                        </p>
                        <p>{latestDebriefArtifact.next_round_focus}</p>
                        <div className="mt-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase text-zinc-500">
                              Thank-you email draft
                            </p>
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              type="button"
                              onClick={() => copyText(latestDebriefArtifact.thank_you_email)}
                            >
                              Copy
                            </button>
                          </div>
                          <pre className="mt-1 whitespace-pre-wrap rounded border bg-white p-2 text-xs">
                            {latestDebriefArtifact.thank_you_email}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No generated debrief artifact yet.</p>
                    )}

                    <div className="rounded border p-3">
                      <p className="text-sm font-medium">Post-round task tracker</p>
                      <label className="mt-2 block text-xs font-medium text-zinc-600">
                        Follow-up email reminder
                      </label>
                      <input
                        type="datetime-local"
                        className="mt-1 rounded border p-2 text-sm"
                        value={taskDraft.follow_up_reminder_at}
                        onChange={(event) =>
                          updateTaskDraft(round.id, (draft) => ({
                            ...draft,
                            follow_up_reminder_at: event.target.value,
                          }))
                        }
                      />

                      <p className="mt-3 text-xs font-medium text-zinc-600">
                        Take-home assignment checklist
                      </p>
                      <div className="mt-1 space-y-2">
                        {taskDraft.take_home_items.map((item) => (
                          <div key={item.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={(event) =>
                                updateTaskDraft(round.id, (draft) => ({
                                  ...draft,
                                  take_home_items: draft.take_home_items.map((draftItem) =>
                                    draftItem.id === item.id
                                      ? { ...draftItem, completed: event.target.checked }
                                      : draftItem,
                                  ),
                                }))
                              }
                            />
                            <span
                              className={
                                "flex-1 " + (item.completed ? "line-through text-zinc-500" : "")
                              }
                            >
                              {item.text}
                            </span>
                            <button
                              type="button"
                              className="rounded border px-2 py-0.5 text-[11px]"
                              onClick={() => removeChecklistItem(round.id, item.id)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mt-2 flex gap-2">
                        <input
                          className="flex-1 rounded border p-2 text-sm"
                          placeholder="Add checklist item"
                          value={taskDraft.new_item_text}
                          onChange={(event) =>
                            updateTaskDraft(round.id, (draft) => ({
                              ...draft,
                              new_item_text: event.target.value,
                            }))
                          }
                        />
                        <button
                          type="button"
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => addChecklistItem(round.id)}
                        >
                          Add
                        </button>
                      </div>

                      <button
                        type="button"
                        className="mt-3 rounded border px-2 py-1 text-xs"
                        onClick={() => saveTaskList(round.id)}
                      >
                        Save post-round tasks
                      </button>
                    </div>
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded border p-4">
        <h2 className="mb-2 font-semibold">Interviewer profiles</h2>
        <form onSubmit={createInterviewer} className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded border p-2"
            placeholder="Name (or Unknown interviewer)"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Title / role"
            value={personTitle}
            onChange={(e) => setPersonTitle(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Department (optional)"
            value={personDepartment}
            onChange={(e) => setPersonDepartment(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="LinkedIn URL"
            value={personLinkedinUrl}
            onChange={(e) => setPersonLinkedinUrl(e.target.value)}
          />
          <input
            className="rounded border p-2"
            placeholder="Notes / vibe / what to ask"
            value={personNotes}
            onChange={(e) => setPersonNotes(e.target.value)}
          />
          <button className="rounded bg-black px-3 py-2 text-white md:col-span-3">
            Add interviewer
          </button>
        </form>
      </section>

      <section className="rounded border p-4">
        <h2 className="font-semibold">Activity</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {activities.map((item) => (
            <li key={item.id}>
              • {item.message}{" "}
              <span className="text-zinc-500">({new Date(item.created_at).toLocaleString()})</span>
            </li>
          ))}
        </ul>
      </section>

      {isSubmitted && (
        <p className="text-xs text-zinc-500">
          Submission snapshot is frozen; prep uses submitted materials.
        </p>
      )}
      {error && (
        <p className="rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}
    </main>
  );
}
