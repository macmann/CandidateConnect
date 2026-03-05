import { FieldAnswer } from "@/lib/domain/application";
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

function generateDraft(params: {
  question: string;
  tone: string;
  jobDescriptionText: string;
  profileText: string;
  candidateName: string;
}): string {
  const { question, tone, jobDescriptionText, profileText, candidateName } = params;
  const jdSnippet = jobDescriptionText.slice(0, 280).replace(/\s+/g, " ");
  const profileSnippet = profileText.slice(0, 280).replace(/\s+/g, " ");

  return [
    `(${tone} tone) ${candidateName} is well aligned with this role and can answer: \"${question}\".`,
    `Relevant role context: ${jdSnippet || "No job description snapshot found."}`,
    `Relevant profile context: ${profileSnippet || "No profile documents linked yet."}`,
    "I have delivered similar work with measurable outcomes, and I can bring that same execution, collaboration, and ownership to this position.",
  ].join("\n\n");
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

    const records = questions.map((question) => ({
      application_id: input.applicationId,
      question,
      ai_draft: generateDraft({
        question,
        tone: input.tone,
        jobDescriptionText: snapshot?.raw_text ?? application.jobDescription.description,
        profileText,
        candidateName: application.candidateName,
      }),
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
