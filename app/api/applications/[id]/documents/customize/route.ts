import { NextRequest, NextResponse } from "next/server";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { profileRepository } from "@/lib/repositories/profileRepository";

interface OpenAIMessage {
  role: "system" | "user";
  content: string;
}

async function generateWithOpenAI(messages: OpenAIMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL || "gpt-5-mini",
      messages,
      temperature: 0.5,
    }),
  });

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data.error?.message ?? "OpenAI request failed");
  }

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  return content;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = (await request.json()) as { kind?: "CV" | "Cover" };
    const kind = payload.kind;
    if (kind !== "CV" && kind !== "Cover") {
      return NextResponse.json({ error: "kind must be CV or Cover" }, { status: 400 });
    }

    const [application, profile] = await Promise.all([
      applicationRepository.getById(id),
      profileRepository.get(),
    ]);

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const selectedCv = application.cvDocumentVersionId
      ? await documentRepository.getById(application.cvDocumentVersionId)
      : null;
    const selectedCover = application.coverDocumentVersionId
      ? await documentRepository.getById(application.coverDocumentVersionId)
      : null;

    const jdText = application.jobDescription.description;
    const baseText =
      kind === "CV"
        ? selectedCv?.text ?? profile.cvBase
        : selectedCover?.text ?? profile.coverLetterBase;

    if (!baseText?.trim()) {
      throw new Error(`No base ${kind === "CV" ? "CV" : "cover letter"} text found`);
    }

    const generatedText = await generateWithOpenAI([
      {
        role: "system",
        content:
          kind === "CV"
            ? "You rewrite CV text for a single applicant. Keep it factual and ATS-friendly with strong impact bullets. Return plain text only."
            : "You rewrite cover letters for a single applicant. Make it specific to the role and company. Return plain text only.",
      },
      {
        role: "user",
        content: [
          `Applicant: ${profile.name || application.candidateName}`,
          `Applicant email: ${profile.email || application.candidateEmail}`,
          `Contact person: ${application.contactPerson || "Not provided"}`,
          `Company: ${application.company}`,
          `Role: ${application.role}`,
          "Job description:",
          jdText,
          "Base text:",
          baseText,
          kind === "CV"
            ? "Customize the CV for this role while preserving truthful claims."
            : "Customize the cover letter to this role and include a confident but concise tone.",
        ].join("\n\n"),
      },
    ]);

    const version = await documentRepository.createVersion({
      type: kind,
      label: `${application.company} ${application.role} ${kind} (AI customized)`,
      text: generatedText,
    });

    await applicationRepository.update(id, {
      cvDocumentVersionId: kind === "CV" ? version.id : application.cvDocumentVersionId,
      coverDocumentVersionId: kind === "Cover" ? version.id : application.coverDocumentVersionId,
    });

    return NextResponse.json({ version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to customize document" },
      { status: 400 },
    );
  }
}
