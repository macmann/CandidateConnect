import { GoogleGenAI } from "@google/genai";
import { PrepArtifact } from "@/lib/domain/application";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { fieldAnswerRepository } from "@/lib/repositories/fieldAnswerRepository";
import { interviewerRepository } from "@/lib/repositories/interviewerRepository";
import { interviewRoundRepository } from "@/lib/repositories/interviewRoundRepository";
import { jobDescriptionSnapshotRepository } from "@/lib/repositories/jobDescriptionSnapshotRepository";
import { prepRepository } from "@/lib/repositories/prepRepository";
import { submissionSnapshotRepository } from "@/lib/repositories/submissionSnapshotRepository";

interface GeneratePrepInput {
  applicationId: string;
  roundId: string;
  tone: "concise" | "detailed";
  length: "short" | "full";
}

export class InterviewPrepService {
  async list(roundId: string) {
    return prepRepository.listPrep(roundId);
  }

  async pin(roundId: string, artifactId: string) {
    return prepRepository.pin(roundId, artifactId);
  }

  async generate(input: GeneratePrepInput): Promise<PrepArtifact> {
    const application = await applicationRepository.getById(input.applicationId);
    const round = await interviewRoundRepository.getById(input.applicationId, input.roundId);
    if (!application || !round) throw new Error("Application or round not found");

    const submission = await submissionSnapshotRepository.getByApplicationId(input.applicationId);
    const sourceMode = submission ? "submitted snapshot" : "current draft";
    const snapshotWarning = submission ? undefined : "Not submitted yet - generated from currently selected docs.";

    const cvVersionId = submission?.cv_version_id ?? application.cvDocumentVersionId;
    const coverVersionId = submission?.cover_version_id ?? application.coverDocumentVersionId;

    const [jdSnapshot, cv, cover, interviewers, fieldAnswers] = await Promise.all([
      jobDescriptionSnapshotRepository.getByApplicationId(input.applicationId),
      cvVersionId ? documentRepository.getById(cvVersionId) : null,
      coverVersionId ? documentRepository.getById(coverVersionId) : null,
      interviewerRepository.listForRound(input.roundId),
      fieldAnswerRepository.listByApplicationId(input.applicationId),
    ]);

    const lockedFieldAnswers = submission
      ? fieldAnswers.filter((answer) => submission.field_answer_refs.includes(answer.id))
      : [];

    const lockedFieldAnswersText = lockedFieldAnswers.length
      ? lockedFieldAnswers
          .map(
            (answer) =>
              `- Q: ${answer.question}\n  A: ${answer.final_answer || answer.ai_draft || "(no answer provided)"}`,
          )
          .join("\n")
      : "None";

    let generatedText = this.fallbackPack(application.company, application.role, round.round_type, input.tone, interviewers.map((i) => i.notes || "").join("\n"));

    if (process.env.GOOGLE_GENAI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
        const prompt = [
          "Create an interview prep pack with headings and bullet points.",
          `Source mode: ${sourceMode}.`,
          `Tone: ${input.tone}. Length: ${input.length}.`,
          "Sections required: likely evaluation areas, key requirements with matching stories, 8-12 likely questions, suggested answer bullets anchored to CV/submitted claims, 5 strong questions to ask, risks/gaps and mitigation, salary positioning notes when relevant, and a 1-page cheat-sheet at end.",
          `Round type: ${round.round_type}. Round index: ${round.round_index}.`,
          `Interviewer notes: ${interviewers.map((i) => `${i.name}: ${i.notes || "n/a"}`).join("\n") || "None"}`,
          `JD Snapshot:\n${jdSnapshot?.raw_text ?? application.jobDescription.description}`,
          `CV text:\n${cv?.text ?? ""}`,
          `Cover text:\n${cover?.text ?? ""}`,
          `Salary expectation:\n${submission?.salary_expectation ?? application.salary_expectation}`,
          `Locked field answers:\n${lockedFieldAnswersText}`,
          `Application notes:\n${application.notes}`,
        ].join("\n\n");

        const response = await ai.models.generateContent({ model: "gemini-1.5-flash", contents: prompt });
        if (response.text?.trim()) {
          generatedText = response.text;
        }
      } catch (error) {
        console.error("Prep generation failed", error);
      }
    }

    return prepRepository.createPrep({
      round_id: round.id,
      generated_text: generatedText,
      pinned: false,
      tone: input.tone,
      length: input.length,
      warning: snapshotWarning,
    });
  }

  private fallbackPack(company: string, role: string, roundType: string, tone: string, interviewerNotes: string): string {
    return `# Interview Prep Pack\n\n## Context\n- Company: ${company}\n- Role: ${role}\n- Round: ${roundType}\n- Tone: ${tone}\n\n## What this round likely evaluates\n- Role fundamentals and communication clarity\n- Evidence-backed impact examples\n- Collaboration and decision making\n\n## Likely questions\n1. Tell me about yourself and why this role.\n2. Why ${company}?\n3. Describe a difficult project and outcome.\n4. How do you prioritize under pressure?\n5. A key technical/domain question relevant to ${role}.\n6. How do you handle stakeholder disagreement?\n7. What are your growth goals?\n8. Why should we hire you?\n\n## 5 Questions you should ask\n- What does success in the first 90 days look like?\n- What are the team's biggest current challenges?\n- How is performance measured for this role?\n- How does this role partner cross-functionally?\n- What are the next steps and timeline?\n\n## Risks and mitigation\n- Risk: vague examples → Mitigation: use STAR with metrics.\n- Risk: weak role alignment → Mitigation: map stories to JD keywords.\n\n## Interviewer notes to weave in\n${interviewerNotes || "- No interviewer notes yet."}\n\n## Cheat Sheet\n- 3 selling points: domain fit, execution speed, measurable outcomes.\n- 3 stories: challenge, action, metric result.\n- Reminder: confirm salary range and start date expectations.`;
  }
}

export const interviewPrepService = new InterviewPrepService();
