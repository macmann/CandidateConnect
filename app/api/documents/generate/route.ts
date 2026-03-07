import { NextRequest, NextResponse } from "next/server";
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

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as {
      kind?: "CV" | "Cover";
      company?: string;
      role?: string;
      contactPerson?: string;
      candidateName?: string;
      candidateEmail?: string;
      jobDescription?: string;
      baseDocumentVersionId?: string;
    };

    if (payload.kind !== "CV" && payload.kind !== "Cover") {
      return NextResponse.json({ error: "kind must be CV or Cover" }, { status: 400 });
    }

    if (!payload.company?.trim() || !payload.role?.trim() || !payload.jobDescription?.trim()) {
      return NextResponse.json(
        { error: "company, role, and jobDescription are required" },
        { status: 400 },
      );
    }

    const profile = await profileRepository.get();
    const selectedBaseVersion = payload.baseDocumentVersionId
      ? await documentRepository.getById(payload.baseDocumentVersionId)
      : null;

    const fallbackBase = payload.kind === "CV" ? profile.cvBase : profile.coverLetterBase;
    const baseText = selectedBaseVersion?.text ?? fallbackBase;

    if (!baseText?.trim()) {
      throw new Error(`No base ${payload.kind === "CV" ? "CV" : "cover letter"} text found`);
    }

    const generatedText = await generateWithOpenAI([
      {
        role: "system",
        content:
          payload.kind === "CV"
            ? "You rewrite CV text for a single applicant. Keep it factual and ATS-friendly with strong impact bullets. Return plain text only."
            : "You rewrite cover letters for a single applicant. Make it specific to the role and company. Return plain text only.",
      },
      {
        role: "user",
        content: [
          `Applicant: ${payload.candidateName || profile.name || "Candidate"}`,
          `Applicant email: ${payload.candidateEmail || profile.email || "Not provided"}`,
          `Contact person: ${payload.contactPerson || "Not provided"}`,
          `Company: ${payload.company}`,
          `Role: ${payload.role}`,
          "Job description:",
          payload.jobDescription,
          "Base text:",
          baseText,
          payload.kind === "CV"
            ? "Customize the CV for this role while preserving truthful claims."
            : "Customize the cover letter to this role and include a confident but concise tone.",
        ].join("\n\n"),
      },
    ]);

    return NextResponse.json({ text: generatedText });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate document" },
      { status: 400 },
    );
  }
}

