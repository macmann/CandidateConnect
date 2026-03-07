"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Application,
  DebriefArtifact,
  InterviewRound,
  InterviewMode,
  InterviewRoundStatus,
  InterviewRoundType,
  Interviewer,
  PrepArtifact,
  RoundDebrief,
} from "@/lib/domain/application";

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

const timezoneOptions =
  typeof Intl !== "undefined" && "supportedValuesOf" in Intl
    ? Intl.supportedValuesOf("timeZone")
    : ["UTC"];

function getRoundTabLabel(round: InterviewRound) {
  return `Round ${round.round_index} - ${round.round_type}`;
}

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


function getPrepSections(text: string) {
  const normalized = text ?? "";
  const lines = normalized.split(/\r?\n/);
  const sections: Record<"prep_notes" | "questions" | "cheat_sheet", string[]> = {
    prep_notes: [],
    questions: [],
    cheat_sheet: [],
  };
  let active: keyof typeof sections = "prep_notes";

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes("question")) {
      active = "questions";
      continue;
    }
    if (lower.includes("cheat") || lower.includes("summary") || lower.includes("key take")) {
      active = "cheat_sheet";
      continue;
    }
    sections[active].push(line);
  }

  return {
    prep_notes: sections.prep_notes.join("\n").trim() || normalized,
    questions:
      sections.questions.join("\n").trim() || "Generate this tab to view questions and sample answers.",
    cheat_sheet:
      sections.cheat_sheet.join("\n").trim() || "Generate this tab to view your last-minute cheat sheet.",
  };
}

function renderPrepSection(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => (
      <p key={`${line}-${index}`} className="text-xs text-zinc-700">
        {line.startsWith("-") || line.startsWith("•") ? `• ${line.replace(/^[-•]\s*/, "")}` : line}
      </p>
    ));
}

function isLikelyUrl(value?: string) {
  if (!value) return false;
  return /^https?:\/\//i.test(value.trim());
}

export default function ApplicationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [application, setApplication] = useState<Application | null>(null);
  const [rounds, setRounds] = useState<InterviewRound[]>([]);
  const [interviewers, setInterviewers] = useState<Interviewer[]>([]);
  const [roundPeople, setRoundPeople] = useState<Record<string, Interviewer[]>>({});
  const [prepByRound, setPrepByRound] = useState<Record<string, PrepArtifact[]>>({});
  const [debriefByRound, setDebriefByRound] = useState<Record<string, RoundDebrief[]>>({});
  const [debriefArtifactsByRound, setDebriefArtifactsByRound] = useState<
    Record<string, DebriefArtifact[]>
  >({});
  const [error, setError] = useState<string | null>(null);

  const [roundType, setRoundType] = useState<InterviewRoundType>("Recruiter");
  const [datetime, setDatetime] = useState("");
  const [timezone, setTimezone] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  );
  const [mode, setMode] = useState<InterviewMode>("Online");
  const [location, setLocation] = useState("");
  const [purpose, setPurpose] = useState("");
  const [selectedInterviewerIds, setSelectedInterviewerIds] = useState<string[]>([]);

  const [personName, setPersonName] = useState("");
  const [personTitle, setPersonTitle] = useState("");
  const [personDepartment, setPersonDepartment] = useState("");
  const [personLinkedinUrl, setPersonLinkedinUrl] = useState("");
  const [personNotes, setPersonNotes] = useState("");

  const [prepTone, setPrepTone] = useState<"concise" | "detailed">("concise");
  const [prepLength, setPrepLength] = useState<"short" | "full">("short");

  const [debrief, setDebrief] = useState<Record<string, Record<string, string>>>({});
  const [reminderDraftByRound, setReminderDraftByRound] = useState<Record<string, string>>({});
  const [newTaskByRound, setNewTaskByRound] = useState<Record<string, string>>({});
  const [roundEdits, setRoundEdits] = useState<Record<string, RoundEditableFields>>({});
  const [roundSaveState, setRoundSaveState] = useState<
    Record<string, { saving: boolean; message?: string; error?: string }>
  >({});
  const [copiedState, setCopiedState] = useState<Record<string, string>>({});
  const [activeRoundId, setActiveRoundId] = useState<string | null>(null);
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [editRoundModalId, setEditRoundModalId] = useState<string | null>(null);
  const [activePrepTabByRound, setActivePrepTabByRound] = useState<Record<string, "prep_notes" | "questions" | "cheat_sheet">>({});

  function resetAddRoundModal() {
    setShowAddRoundModal(false);
    setDatetime("");
    setLocation("");
    setPurpose("");
    setSelectedInterviewerIds([]);
    setPersonName("");
    setPersonTitle("");
    setPersonDepartment("");
    setPersonLinkedinUrl("");
    setPersonNotes("");
  }

  const load = useCallback(async () => {
    const [applicationRes, roundsRes, interviewerRes] = await Promise.all([
      fetch(`/api/applications/${id}`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/interview-rounds`, { cache: "no-store" }),
      fetch(`/api/applications/${id}/interviewers`, { cache: "no-store" }),
    ]);

    const appData = await applicationRes.json();
    if (!applicationRes.ok) {
      setError(appData.error ?? "Failed to load");
      return;
    }

    setApplication(appData.application);
    const roundsData = await roundsRes.json();
    const interviewersData = await interviewerRes.json();
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

    const people: Record<string, Interviewer[]> = {};
    const preps: Record<string, PrepArtifact[]> = {};
    const debriefs: Record<string, RoundDebrief[]> = {};
    const debriefArtifacts: Record<string, DebriefArtifact[]> = {};
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
        debriefs[round.id] = debriefData.debriefs ?? [];
        debriefArtifacts[round.id] = debriefData.artifacts ?? [];
      }),
    );

    setRoundPeople(people);
    setPrepByRound(preps);
    setDebriefByRound(debriefs);
    setDebriefArtifactsByRound(debriefArtifacts);
    setDebrief((current) => {
      const next = { ...current };
      for (const round of loadedRounds) {
        if (next[round.id]) continue;
        const latestDebrief = debriefs[round.id]?.[debriefs[round.id].length - 1];
        if (!latestDebrief) continue;
        next[round.id] = {
          raw_notes: latestDebrief.raw_notes,
          questions_asked: latestDebrief.structured_fields.questions_asked,
          went_well: latestDebrief.structured_fields.went_well,
          went_badly: latestDebrief.structured_fields.went_badly,
          to_improve: latestDebrief.structured_fields.to_improve,
          follow_up_tasks: latestDebrief.structured_fields.follow_up_tasks,
        };
      }
      return next;
    });
    setReminderDraftByRound((current) => {
      const next = { ...current };
      for (const round of loadedRounds) {
        if (next[round.id] !== undefined) continue;
        const latestDebrief = debriefs[round.id]?.[debriefs[round.id].length - 1];
        next[round.id] = toDatetimeLocalValue(latestDebrief?.structured_fields.follow_up_reminder_at);
      }
      return next;
    });
    setError(null);
  }, [id]);

  async function copyToClipboard(roundId: string, field: string, value: string) {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    const key = `${roundId}:${field}`;
    setCopiedState((current) => ({ ...current, [key]: "Copied" }));
    window.setTimeout(() => {
      setCopiedState((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }, 1500);
  }

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  useEffect(() => {
    if (rounds.length === 0) {
      setActiveRoundId(null);
      return;
    }

    if (!activeRoundId || !rounds.some((round) => round.id === activeRoundId)) {
      setActiveRoundId(rounds[0].id);
    }
  }, [activeRoundId, rounds]);

  const isSubmitted = useMemo(() => Boolean(application?.submissionSnapshot), [application]);
  const editModalRound = rounds.find((round) => round.id === editRoundModalId) ?? null;
  const editModalRoundState = editModalRound ? roundEdits[editModalRound.id] ?? getRoundEditableState(editModalRound) : null;

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
        notes: "",
      }),
    });
    if (!response.ok) return setError("Failed to create round");

    const roundData = await response.json();
    const newRoundId = (roundData.round as InterviewRound | undefined)?.id;
    if (newRoundId && selectedInterviewerIds.length > 0) {
      const assignResponse = await fetch(
        `/api/applications/${id}/interview-rounds/${newRoundId}/interviewers`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interviewer_ids: selectedInterviewerIds }),
        },
      );

      if (!assignResponse.ok) {
        return setError("Round created, but assigning interviewers failed. Please retry.");
      }
    }

    resetAddRoundModal();
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

  async function createInterviewerForRound() {
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
    if (!response.ok) {
      setError("Failed to create interviewer");
      return;
    }

    const data = await response.json();
    const interviewer = data.interviewer as Interviewer;
    if (interviewer?.id) {
      setSelectedInterviewerIds((current) =>
        current.includes(interviewer.id) ? current : [...current, interviewer.id],
      );
    }
    setPersonName("");
    setPersonTitle("");
    setPersonDepartment("");
    setPersonLinkedinUrl("");
    setPersonNotes("");
    await load();
  }

  function toggleRoundInterviewer(interviewerId: string) {
    setSelectedInterviewerIds((current) =>
      current.includes(interviewerId)
        ? current.filter((id) => id !== interviewerId)
        : [...current, interviewerId],
    );
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

  async function deleteRound(roundId: string) {
    const response = await fetch(`/api/applications/${id}/interview-rounds/${roundId}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      setError("Failed to delete round");
      return;
    }
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
      mode: edits.mode ? (edits.mode as InterviewMode) : undefined,
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
    const latestDebrief = debriefByRound[roundId]?.[debriefByRound[roundId].length - 1];
    await fetch(`/api/applications/${id}/interview-rounds/${roundId}/debrief`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        follow_up_reminder_at: latestDebrief?.structured_fields.follow_up_reminder_at ?? "",
        follow_up_reminder_completed:
          latestDebrief?.structured_fields.follow_up_reminder_completed ?? false,
        take_home_checklist: latestDebrief?.structured_fields.take_home_checklist ?? [],
      }),
    });
    await load();
  }

  async function patchDebriefTracking(roundId: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/applications/${id}/interview-rounds/${roundId}/debrief`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      setError("Save a debrief entry before editing reminders or take-home tasks.");
      return;
    }
    await load();
  }

  if (!application) return <main className="mx-auto max-w-5xl p-6">Loading…</main>;

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-6 px-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {application.company} — {application.role}
          </h1>
          <p className="text-sm text-zinc-500">Interview command center</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded bg-zinc-900 px-3 py-2 text-sm text-white"
            onClick={() => setShowAddRoundModal(true)}
          >
            Add Round
          </button>
          <Link href="/applications" className="rounded border px-3 py-2 text-sm">
            Back
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-semibold">Interview rounds timeline</h2>
          <button className="rounded border px-2 py-1 text-xs" onClick={moveToNextRound}>
            Move to next round
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {rounds.map((round) => (
            <button
              key={round.id}
              type="button"
              className={`rounded border px-3 py-1 text-sm ${activeRoundId === round.id ? "bg-zinc-900 text-white" : "bg-white"}`}
              onClick={() => setActiveRoundId(round.id)}
            >
              {getRoundTabLabel(round)}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-3">
          {rounds.filter((round) => round.id === activeRoundId).map((round) => {
            const prep = prepByRound[round.id] ?? [];
            const debriefEntries = debriefByRound[round.id] ?? [];
            const latestDebrief = debriefEntries[debriefEntries.length - 1];
            const checklist = latestDebrief?.structured_fields.take_home_checklist ?? [];
            const pinned = prep.find((item) => item.pinned) ?? prep[0];
            const latestDebriefArtifact =
              debriefArtifactsByRound[round.id]?.[debriefArtifactsByRound[round.id].length - 1];
            return (
              <article key={round.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="grid gap-3 md:grid-cols-[2fr_1fr]">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{getRoundTabLabel(round)}</p>
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
                      <button
                        className="rounded border px-2 py-1 text-xs"
                        type="button"
                        onClick={() => setEditRoundModalId(round.id)}
                      >
                        Edit round
                      </button>
                      <button
                        className="rounded border border-red-200 px-2 py-1 text-xs text-red-700"
                        type="button"
                        onClick={() => deleteRound(round.id)}
                      >
                        Delete
                      </button>
                    </div>
                    <p className="text-sm text-zinc-700">Mode: {round.mode || "TBD"}</p>
                    <p className="text-sm text-zinc-700">
                      Meeting Link / Location:{" "}
                      {isLikelyUrl(round.location_or_link) ? (
                        <a
                          className="font-medium text-blue-600 underline"
                          href={round.location_or_link}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Meeting Link
                        </a>
                      ) : (
                        round.location_or_link || "TBD"
                      )}
                    </p>
                    <p className="text-sm text-zinc-700">Purpose: {round.purpose || "TBD"}</p>
                    <p className="text-xs text-zinc-500">
                      Reminder: 1 hour before the meeting via in-app notification and email (email configuration will be added later).
                    </p>
                    <p className="text-xs text-zinc-500">
                      Follow-up reminder:{" "}
                      {latestDebrief?.structured_fields.follow_up_reminder_at
                        ? `${new Date(latestDebrief.structured_fields.follow_up_reminder_at).toLocaleString()}${latestDebrief.structured_fields.follow_up_reminder_completed ? " (complete)" : " (pending)"}`
                        : "Not set"}
                      {" · "}Take-home tasks: {checklist.filter((item) => item.checked).length}/{checklist.length}
                    </p>
                  </div>
                  <aside className="rounded-lg border bg-zinc-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">People in this round</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(roundPeople[round.id] ?? []).length === 0 && (
                        <p className="text-xs text-zinc-500">No one linked yet</p>
                      )}
                      {(roundPeople[round.id] ?? []).map((person) => (
                        <span key={person.id} className="rounded border bg-white px-2 py-1 text-[11px]">
                          {person.name}
                        </span>
                      ))}
                    </div>
                  </aside>
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
                      Generate AI prep
                    </button>
                  </div>
                  {pinned ? (
                    <>
                      {pinned.warning && (
                        <p className="mb-2 text-xs text-amber-700">{pinned.warning}</p>
                      )}
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-600">
                        Prepare for the Round
                      </p>
                      <div className="mb-2 grid gap-2 sm:grid-cols-3">
                        {[
                          ["prep_notes", "Things to prepare and key points"],
                          ["questions", "Questions and sample answers from interviewer profile"],
                          ["cheat_sheet", "Cheat sheet for last minute"],
                        ].map(([key, label]) => (
                          <button
                            key={key}
                            type="button"
                            className={`rounded border px-2 py-1 text-xs ${
                              (activePrepTabByRound[round.id] ?? "prep_notes") === key
                                ? "bg-zinc-900 text-white"
                                : "bg-white"
                            }`}
                            onClick={() =>
                              setActivePrepTabByRound((current) => ({
                                ...current,
                                [round.id]: key as "prep_notes" | "questions" | "cheat_sheet",
                              }))
                            }
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="max-h-72 space-y-2 overflow-auto rounded border bg-white p-3">
                        {renderPrepSection(
                          getPrepSections(pinned.generated_text)[
                            activePrepTabByRound[round.id] ?? "prep_notes"
                          ],
                        )}
                      </div>
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
                    <p className="text-xs text-zinc-500">No prep yet. Generate to see preparation, questions, and last-minute cheat sheet tabs.</p>
                  )}
                </div>

                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium">
                    Post-round debrief
                  </summary>
                  <div className="mt-2 grid gap-2">
                    {debriefEntries.length > 0 && (
                      <p className="text-xs text-zinc-500">
                        Saved debrief entries: {debriefEntries.length}
                      </p>
                    )}
                    <div className="grid gap-2 rounded border p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Follow-up reminder
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          type="datetime-local"
                          className="rounded border p-2 text-sm"
                          value={reminderDraftByRound[round.id] ?? ""}
                          onChange={(e) =>
                            setReminderDraftByRound((current) => ({
                              ...current,
                              [round.id]: e.target.value,
                            }))
                          }
                        />
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() =>
                            patchDebriefTracking(round.id, {
                              follow_up_reminder_at: reminderDraftByRound[round.id]
                                ? new Date(reminderDraftByRound[round.id]).toISOString()
                                : "",
                            })
                          }
                          type="button"
                        >
                          Save reminder
                        </button>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={Boolean(
                              latestDebrief?.structured_fields.follow_up_reminder_completed,
                            )}
                            onChange={(e) =>
                              patchDebriefTracking(round.id, {
                                follow_up_reminder_completed: e.target.checked,
                              })
                            }
                          />
                          Reminder complete
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-2 rounded border p-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Take-home checklist
                      </p>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded border p-2 text-sm"
                          placeholder="Add a task"
                          value={newTaskByRound[round.id] ?? ""}
                          onChange={(e) =>
                            setNewTaskByRound((current) => ({ ...current, [round.id]: e.target.value }))
                          }
                        />
                        <button
                          className="rounded border px-2 py-1 text-xs"
                          onClick={() => {
                            const label = (newTaskByRound[round.id] ?? "").trim();
                            if (!label) return;
                            const nextChecklist = [
                              ...checklist,
                              { id: crypto.randomUUID(), label, checked: false },
                            ];
                            setNewTaskByRound((current) => ({ ...current, [round.id]: "" }));
                            patchDebriefTracking(round.id, { take_home_checklist: nextChecklist });
                          }}
                          type="button"
                        >
                          Add
                        </button>
                      </div>
                      <div className="space-y-1">
                        {checklist.map((item) => (
                          <div key={item.id} className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={item.checked}
                                onChange={(e) =>
                                  patchDebriefTracking(round.id, {
                                    take_home_checklist: checklist.map((task) =>
                                      task.id === item.id ? { ...task, checked: e.target.checked } : task,
                                    ),
                                  })
                                }
                              />
                              {item.label}
                            </label>
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() =>
                                patchDebriefTracking(round.id, {
                                  take_home_checklist: checklist.filter((task) => task.id !== item.id),
                                })
                              }
                              type="button"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        {checklist.length === 0 && (
                          <p className="text-xs text-zinc-500">No take-home tasks yet.</p>
                        )}
                      </div>
                    </div>

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
                    <p className="text-xs text-zinc-500">
                      Paste interviewer email notes above to generate interview tips and a round plan.
                    </p>
                    <button
                      className="rounded border px-2 py-1 text-xs"
                      onClick={() => saveDebrief(round.id)}
                      type="button"
                    >
                      Generate summary + improvement plan
                    </button>

                    {latestDebriefArtifact ? (
                      <div className="mt-3 grid gap-2 rounded border bg-zinc-50 p-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Generated summary
                          </p>
                          <pre className="whitespace-pre-wrap text-xs">
                            {latestDebriefArtifact.generated_summary}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                            Improvement suggestions
                          </p>
                          <pre className="whitespace-pre-wrap text-xs">
                            {latestDebriefArtifact.improvements}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                              Next round focus
                            </p>
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() =>
                                copyToClipboard(
                                  round.id,
                                  "next_round_focus",
                                  latestDebriefArtifact.next_round_focus,
                                )
                              }
                              type="button"
                            >
                              {copiedState[`${round.id}:next_round_focus`] ?? "Copy"}
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap text-xs">
                            {latestDebriefArtifact.next_round_focus}
                          </pre>
                        </div>
                        <div>
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                              Thank-you email draft
                            </p>
                            <button
                              className="rounded border px-2 py-1 text-xs"
                              onClick={() =>
                                copyToClipboard(
                                  round.id,
                                  "thank_you_email",
                                  latestDebriefArtifact.thank_you_email,
                                )
                              }
                              type="button"
                            >
                              {copiedState[`${round.id}:thank_you_email`] ?? "Copy"}
                            </button>
                          </div>
                          <pre className="whitespace-pre-wrap text-xs">
                            {latestDebriefArtifact.thank_you_email}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500">No generated debrief artifact yet.</p>
                    )}
                  </div>
                </details>
              </article>
            );
          })}
        </div>
      </section>

      {showAddRoundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add interview round</h3>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={resetAddRoundModal}
              >
                Close
              </button>
            </div>
            <form onSubmit={createRound} className="grid gap-2 md:grid-cols-2">
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
              <select
                className="rounded border p-2"
                value={mode}
                onChange={(e) => setMode(e.target.value as InterviewMode)}
              >
                <option value="Online">Online</option>
                <option value="Onsite">Onsite</option>
                <option value="Phone">Phone</option>
              </select>
              <input
                type="datetime-local"
                className="rounded border p-2"
                value={datetime}
                onChange={(e) => setDatetime(e.target.value)}
              />
              <select
                className="rounded border p-2"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {timezoneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <input
                className="rounded border p-2 md:col-span-2"
                placeholder="Location / meeting link"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
              <textarea
                className="rounded border p-2 md:col-span-2"
                rows={3}
                placeholder="Purpose / goals (2-3 lines)"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
              <div className="rounded border p-3 md:col-span-2">
                <p className="text-sm font-medium">Interviewers for this round</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {interviewers.map((person) => (
                    <button
                      key={person.id}
                      type="button"
                      className={`rounded border px-2 py-1 text-xs ${selectedInterviewerIds.includes(person.id) ? "bg-zinc-900 text-white" : ""}`}
                      onClick={() => toggleRoundInterviewer(person.id)}
                    >
                      {person.name}
                    </button>
                  ))}
                </div>
                {interviewers.length === 0 && (
                  <p className="mt-2 text-xs text-zinc-500">
                    No interviewers yet. Add one below and it will be pre-selected.
                  </p>
                )}
              </div>
              <div className="rounded border p-3 md:col-span-2">
                <p className="text-sm font-medium">Add interviewer</p>
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="Name (or Unknown interviewer)"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                  />
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="Title / role"
                    value={personTitle}
                    onChange={(e) => setPersonTitle(e.target.value)}
                  />
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="Department (optional)"
                    value={personDepartment}
                    onChange={(e) => setPersonDepartment(e.target.value)}
                  />
                  <input
                    className="rounded border p-2 text-sm"
                    placeholder="LinkedIn URL"
                    value={personLinkedinUrl}
                    onChange={(e) => setPersonLinkedinUrl(e.target.value)}
                  />
                  <textarea
                    className="rounded border p-2 text-sm md:col-span-2"
                    placeholder="Notes / vibe / what to ask"
                    value={personNotes}
                    onChange={(e) => setPersonNotes(e.target.value)}
                  />
                  <button
                    type="button"
                    className="rounded border px-3 py-2 text-sm md:col-span-2"
                    onClick={() => {
                      void createInterviewerForRound();
                    }}
                  >
                    Add interviewer to this round
                  </button>
                </div>
              </div>
              <button className="rounded bg-black px-3 py-2 text-white md:col-span-2">Add round</button>
            </form>
          </div>
        </div>
      )}

      {editModalRound && editModalRoundState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit interview round</h3>
              <button
                type="button"
                className="rounded border px-2 py-1 text-xs"
                onClick={() => setEditRoundModalId(null)}
              >
                Close
              </button>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <input
                type="datetime-local"
                className="rounded border p-2 text-sm"
                value={editModalRoundState.scheduled_at}
                onChange={(e) => updateRoundEdit(editModalRound.id, "scheduled_at", e.target.value)}
              />
              <select
                className="rounded border p-2 text-sm"
                value={editModalRoundState.timezone}
                onChange={(e) => updateRoundEdit(editModalRound.id, "timezone", e.target.value)}
              >
                {timezoneOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <select
                className="rounded border p-2 text-sm"
                value={editModalRoundState.mode}
                onChange={(e) => updateRoundEdit(editModalRound.id, "mode", e.target.value)}
              >
                <option value="">Select mode</option>
                <option value="Online">Online</option>
                <option value="Onsite">Onsite</option>
                <option value="Phone">Phone</option>
              </select>
              <select
                className="rounded border p-2 text-sm"
                value={editModalRoundState.round_type}
                onChange={(e) => updateRoundEdit(editModalRound.id, "round_type", e.target.value)}
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
                value={editModalRoundState.location_or_link}
                onChange={(e) => updateRoundEdit(editModalRound.id, "location_or_link", e.target.value)}
              />
              <textarea
                className="rounded border p-2 text-sm md:col-span-2"
                placeholder="Purpose / goals (2-3 lines)"
                rows={3}
                value={editModalRoundState.purpose}
                onChange={(e) => updateRoundEdit(editModalRound.id, "purpose", e.target.value)}
              />
              <textarea
                className="rounded border p-2 text-sm md:col-span-2"
                placeholder="Notes"
                value={editModalRoundState.notes}
                onChange={(e) => updateRoundEdit(editModalRound.id, "notes", e.target.value)}
              />
              <div className="md:col-span-2">
                <p className="text-sm font-medium">Link interviewers</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {interviewers.map((person) => (
                    <button
                      key={person.id}
                      className={`rounded border px-2 py-1 text-xs ${(roundPeople[editModalRound.id] ?? []).some((r) => r.id === person.id) ? "bg-zinc-900 text-white" : ""}`}
                      onClick={() => toggleInterviewer(editModalRound.id, person.id)}
                      type="button"
                    >
                      {person.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <button
                  className="rounded bg-black px-3 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => saveRoundChanges(editModalRound.id)}
                  disabled={roundSaveState[editModalRound.id]?.saving}
                  type="button"
                >
                  {roundSaveState[editModalRound.id]?.saving ? "Saving…" : "Save round changes"}
                </button>
                {roundSaveState[editModalRound.id]?.message && (
                  <p className="mt-1 text-xs text-emerald-700">{roundSaveState[editModalRound.id]?.message}</p>
                )}
                {roundSaveState[editModalRound.id]?.error && (
                  <p className="mt-1 text-xs text-red-700">{roundSaveState[editModalRound.id]?.error}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
