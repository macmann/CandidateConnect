import { FieldAnswer } from "@/lib/domain/application";
import { GoogleGenAI } from "@google/genai";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { fieldAnswerRepository } from "@/lib/repositories/fieldAnswerRepository";
import { jobDescriptionSnapshotRepository } from "@/lib/repositories/jobDescriptionSnapshotRepository";

interface GenerateAnswersInput {
  applicationId: string;
  questionBlock: string;
  tone: string;
  snapshotId?: string;
}

function splitQuestions(questionBlock: string): string[] {
  const normalized = questionBlock
    .split(/\r?\n+/)
    .map((line) => line.replace(/^\s*(?:[-*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

  if (normalized.length > 1) {
    return normalized;
  }

  return questionBlock
    .split(/\?\s+/)
    .map((part, index, arr) => (index < arr.length - 1 ? `${part.trim()}?` : part.trim()))
    .filter(Boolean);
}

const FALLBACK_DRAFT_MESSAGE =
  "We couldn't generate an AI draft right now. Please review your profile highlights and draft a direct response tailored to this question.";

interface DraftGeneration {
  questionId: number;
  answer: string;
}

function parseDraftGenerations(text: string): DraftGeneration[] {
  const parsed = JSON.parse(text) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Model output is not an array");
  }

  return parsed.map((item) => {
    if (
      !item ||
      typeof item !== "object" ||
      typeof (item as DraftGeneration).questionId !== "number" ||
      typeof (item as DraftGeneration).answer !== "string"
    ) {
      throw new Error("Model output item has an invalid shape");
    }

    return {
      questionId: (item as DraftGeneration).questionId,
      answer: (item as DraftGeneration).answer.trim(),
    };
  });
}

async function generateDrafts(params: {
  questions: string[];
  tone: string;
  jobDescriptionText: string;
  profileText: string;
}): Promise<Map<number, string>> {
  if (!process.env.GOOGLE_GENAI_API_KEY) {
    throw new Error("GOOGLE_GENAI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
  const questionPayload = params.questions.map((question, index) => ({
    questionId: index,
    question,
  }));

  const prompt = [
    "You are writing job-application free-text responses.",
    "Return JSON only (no markdown, no commentary) as an array where each item has this exact shape:",
    '[{"questionId": number, "answer": string}]',
    "Rules:",
    "- Return exactly one answer per input question.",
    "- Keep each answer tied to its matching questionId.",
    "- Use the requested tone.",
    "- Make answers specific, concise, and evidence-oriented.",
    "- If context is missing, still provide a professional answer without inventing facts.",
    "",
    `Tone: ${params.tone}`,
    "",
    "Questions:",
    JSON.stringify(questionPayload, null, 2),
    "",
    "Job description snapshot raw text:",
    params.jobDescriptionText || "",
    "",
    "Candidate profile context from selected CV/Cover + applicant profile:",
    params.profileText || "",
  ].join("\n");

  const response = await ai.models.generateContent({
    model: "gemini-1.5-flash",
    contents: prompt,
  });

  const rawText = response.text;
  if (!rawText) {
    throw new Error("Model returned an empty response");
  }

  const drafts = parseDraftGenerations(rawText);
  if (drafts.length !== params.questions.length) {
    throw new Error("Model returned mismatched answer count");
  }

  const mappedDrafts = new Map<number, string>();
  for (const draft of drafts) {
    if (draft.questionId < 0 || draft.questionId >= params.questions.length) {
      throw new Error("Model returned an out-of-range questionId");
    }

    if (!draft.answer) {
      throw new Error(`Model returned an empty answer for questionId ${draft.questionId}`);
    }

    if (mappedDrafts.has(draft.questionId)) {
      throw new Error(`Model returned duplicate answers for questionId ${draft.questionId}`);
    }

    mappedDrafts.set(draft.questionId, draft.answer);
  }

  if (mappedDrafts.size !== params.questions.length) {
    throw new Error("Model output is missing answers for one or more questions");
  }

  return mappedDrafts;
}

export class FieldAnswerService {
  async listByApplicationId(applicationId: string): Promise<FieldAnswer[]> {
    return fieldAnswerRepository.listByApplicationId(applicationId);
  }

  async generateAnswers(input: GenerateAnswersInput): Promise<FieldAnswer[]> {
    const application = await applicationRepository.getById(input.applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    if (application.submissionSnapshot) {
      throw new Error("Application is submitted; answers are locked");
    }

    const questions = splitQuestions(input.questionBlock);
    if (!questions.length) {
      throw new Error("No questions provided");
    }

    const snapshot = await jobDescriptionSnapshotRepository.getByApplicationId(input.applicationId);
    const cv = application.cvDocumentVersionId
      ? await documentRepository.getById(application.cvDocumentVersionId)
      : null;
    const cover = application.coverDocumentVersionId
      ? await documentRepository.getById(application.coverDocumentVersionId)
      : null;

    const profileText = [
      application.candidateName,
      application.candidateEmail,
      cv?.text,
      cover?.text,
    ]
      .filter(Boolean)
      .join("\n");

    let generatedDrafts = new Map<number, string>();
    try {
      generatedDrafts = await generateDrafts({
        questions,
        tone: input.tone,
        jobDescriptionText: snapshot?.raw_text ?? application.jobDescription.description,
        profileText,
      });
    } catch (error) {
      console.error("Failed to generate AI drafts for field answers:", error);
      generatedDrafts = new Map(questions.map((_, index) => [index, FALLBACK_DRAFT_MESSAGE]));
    }

    const records = questions.map((question, index) => ({
      application_id: input.applicationId,
      question,
      ai_draft: generatedDrafts.get(index) ?? FALLBACK_DRAFT_MESSAGE,
      snapshot_id: input.snapshotId,
    }));

    await fieldAnswerRepository.upsertMany(records);
    return fieldAnswerRepository.listByApplicationId(input.applicationId);
  }

  async saveFinalAnswers(
    applicationId: string,
    answers: Array<{ question: string; final_answer: string }>,
  ): Promise<FieldAnswer[]> {
    const application = await applicationRepository.getById(applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    if (application.submissionSnapshot) {
      throw new Error("Application is submitted; answers are locked");
    }

    await fieldAnswerRepository.saveFinalAnswers(applicationId, answers);
    return fieldAnswerRepository.listByApplicationId(applicationId);
  }
}

export const fieldAnswerService = new FieldAnswerService();
