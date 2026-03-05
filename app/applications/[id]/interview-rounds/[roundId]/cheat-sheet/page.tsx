"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Application, InterviewRound, PrepArtifact } from "@/lib/domain/application";

type QAItem = { question: string; answer: string };

function linesFromMarkdown(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractSectionLines(text: string, keywords: string[], max: number) {
  const lines = linesFromMarkdown(text);
  const start = lines.findIndex((line) => keywords.some((keyword) => line.toLowerCase().includes(keyword)));
  const source = start >= 0 ? lines.slice(start + 1, start + 22) : lines;
  return source
    .filter((line) => /^(-|\*|\d+\.)\s+/.test(line))
    .map((line) => line.replace(/^(-|\*|\d+\.)\s+/, "").trim())
    .filter((line) => line.length > 0)
    .slice(0, max);
}

function extractLikelyQuestions(text: string) {
  const bulletQuestions = extractSectionLines(text, ["likely questions", "questions you", "evaluation"], 12)
    .filter((line) => line.includes("?"))
    .slice(0, 5);

  return bulletQuestions.map((question) => ({
    question,
    answer: "Use a concise STAR response with one measurable outcome.",
  }));
}

function sectionText(title: string, items: string[]) {
  return `${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

export default function InterviewCheatSheetPage() {
  const params = useParams<{ id: string; roundId: string }>();
  const id = params.id;
  const roundId = params.roundId;

  const [application, setApplication] = useState<Application | null>(null);
  const [round, setRound] = useState<InterviewRound | null>(null);
  const [artifact, setArtifact] = useState<PrepArtifact | null>(null);
  const [copyState, setCopyState] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const [appRes, roundRes, prepRes] = await Promise.all([
        fetch(`/api/applications/${id}`, { cache: "no-store" }),
        fetch(`/api/applications/${id}/interview-rounds`, { cache: "no-store" }),
        fetch(`/api/applications/${id}/interview-rounds/${roundId}/prep-pack`, { cache: "no-store" }),
      ]);

      if (!appRes.ok || !roundRes.ok || !prepRes.ok) {
        setError("Unable to load cheat sheet data.");
        return;
      }

      const appData = await appRes.json();
      const roundData = await roundRes.json();
      const prepData = await prepRes.json();

      setApplication(appData.application ?? null);
      const selectedRound = (roundData.rounds ?? []).find((item: InterviewRound) => item.id === roundId) ?? null;
      setRound(selectedRound);

      const artifacts: PrepArtifact[] = prepData.artifacts ?? [];
      setArtifact(artifacts.find((item) => item.pinned) ?? artifacts[0] ?? null);
      setError(null);
    }

    if (id && roundId) load();
  }, [id, roundId]);

  const generatedText = artifact?.generated_text ?? "";

  const sellingPoints = useMemo(() => {
    const parsed = extractSectionLines(generatedText, ["selling points", "key requirements", "cheat sheet"], 3);
    return parsed.length
      ? parsed
      : [
          "Role-aligned execution with measurable outcomes",
          "Clear communication under pressure",
          "Strong cross-functional collaboration",
        ];
  }, [generatedText]);

  const stories = useMemo(() => {
    const parsed = extractSectionLines(generatedText, ["stories", "matching stories", "cheat sheet"], 3);
    return parsed.length
      ? parsed
      : [
          "Shipped a high-impact project ahead of deadline with adoption gains.",
          "Resolved a delivery blocker by aligning stakeholders and reducing cycle time.",
          "Improved a key metric through process and tooling optimization.",
        ];
  }, [generatedText]);

  const questionsToAsk = useMemo(() => {
    const parsed = extractSectionLines(generatedText, ["questions you should ask", "questions to ask"], 5);
    return parsed.length
      ? parsed
      : [
          "What does success look like in the first 90 days?",
          "Which outcomes matter most for this role scope?",
          "How does the team make trade-off decisions?",
          "Where does this role create the highest leverage?",
          "What are the next steps and timeline?",
        ];
  }, [generatedText]);

  const likelyQuestions = useMemo<QAItem[]>(() => {
    const parsed = extractLikelyQuestions(generatedText);
    return parsed.length
      ? parsed
      : [
          {
            question: "Tell me about yourself and why this role?",
            answer: "Connect your background to this role with one quantified win.",
          },
          {
            question: "Why this company?",
            answer: "Map their mission and product context to your strengths.",
          },
          {
            question: "Describe a difficult project and the outcome.",
            answer: "Use STAR: challenge, action, and measurable result.",
          },
          {
            question: "How do you prioritize under pressure?",
            answer: "Explain your framework and one trade-off example.",
          },
          {
            question: "What are your growth goals?",
            answer: "Show ambition aligned with team and business impact.",
          },
        ];
  }, [generatedText]);

  async function copySection(key: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState((current) => ({ ...current, [key]: "Copied" }));
      setTimeout(() => setCopyState((current) => ({ ...current, [key]: "" })), 1200);
    } catch {
      setCopyState((current) => ({ ...current, [key]: "Copy failed" }));
    }
  }

  if (error) return <main className="mx-auto max-w-3xl p-4 text-sm text-red-700">{error}</main>;
  if (!application || !round) return <main className="mx-auto max-w-3xl p-4">Loading cheat sheet…</main>;

  const reminders = [
    `Salary expectation: ${application.salary_expectation || "Confirm desired range before the interview."}`,
    "Start date: confirm your earliest available start date.",
    "Relocation: confirm onsite/remote expectations and relocation flexibility.",
  ];

  return (
    <main className="cheat-sheet-page mx-auto max-w-3xl px-4 py-4 sm:py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/applications/${id}`} className="rounded border px-3 py-1.5 text-sm">
          Back to rounds
        </Link>
        <button className="rounded bg-black px-3 py-1.5 text-sm text-white" type="button" onClick={() => window.print()}>
          Print
        </button>
      </div>

      <article className="rounded border bg-white p-4 text-sm sm:p-5 sm:text-[15px]">
        <h1 className="mb-3 text-xl font-semibold">Cheat Sheet</h1>

        <section className="mb-4 rounded bg-zinc-50 p-3">
          <p><strong>Company:</strong> {application.company}</p>
          <p><strong>Role:</strong> {application.role}</p>
          <p><strong>Round type:</strong> {round.round_type}</p>
          <p><strong>Time:</strong> {round.scheduled_at ? `${new Date(round.scheduled_at).toLocaleString()} ${round.timezone ?? ""}` : "TBD"}</p>
        </section>

        <section className="mb-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-semibold">3 selling points</h2>
            <button className="rounded border px-2 py-1 text-xs print:hidden" onClick={() => copySection("selling", sectionText("3 selling points", sellingPoints))}>
              Copy section {copyState.selling ? `• ${copyState.selling}` : ""}
            </button>
          </div>
          <ul className="list-disc space-y-1 pl-5">{sellingPoints.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="mb-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-semibold">3 best stories with outcomes</h2>
            <button className="rounded border px-2 py-1 text-xs print:hidden" onClick={() => copySection("stories", sectionText("3 best stories with outcomes", stories))}>
              Copy section {copyState.stories ? `• ${copyState.stories}` : ""}
            </button>
          </div>
          <ul className="list-disc space-y-1 pl-5">{stories.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="mb-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-semibold">5 questions to ask</h2>
            <button className="rounded border px-2 py-1 text-xs print:hidden" onClick={() => copySection("ask", sectionText("5 questions to ask", questionsToAsk))}>
              Copy section {copyState.ask ? `• ${copyState.ask}` : ""}
            </button>
          </div>
          <ul className="list-disc space-y-1 pl-5">{questionsToAsk.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>

        <section className="mb-4">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-semibold">5 likely questions + short answers</h2>
            <button
              className="rounded border px-2 py-1 text-xs print:hidden"
              onClick={() => copySection("likely", `5 likely questions + short answers\n${likelyQuestions.map((item) => `- ${item.question}\n  - ${item.answer}`).join("\n")}`)}
            >
              Copy section {copyState.likely ? `• ${copyState.likely}` : ""}
            </button>
          </div>
          <ul className="space-y-2">
            {likelyQuestions.map((item) => (
              <li key={item.question}>
                <p className="font-medium">{item.question}</p>
                <p className="text-zinc-700">{item.answer}</p>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <div className="mb-1 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Reminders</h2>
            <button className="rounded border px-2 py-1 text-xs print:hidden" onClick={() => copySection("reminders", sectionText("Reminders", reminders))}>
              Copy section {copyState.reminders ? `• ${copyState.reminders}` : ""}
            </button>
          </div>
          <ul className="list-disc space-y-1 pl-5">{reminders.map((item) => <li key={item}>{item}</li>)}</ul>
        </section>
      </article>

      <style jsx global>{`
        @media print {
          .cheat-sheet-page {
            max-width: 100%;
            padding: 0;
          }
          .cheat-sheet-page article {
            border: 0;
            border-radius: 0;
            padding: 0;
            font-size: 12px;
            line-height: 1.2;
          }
          .cheat-sheet-page section {
            margin-bottom: 8px !important;
            break-inside: avoid;
          }
          .print\\:hidden {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 10mm;
          }
        }
      `}</style>
    </main>
  );
}
