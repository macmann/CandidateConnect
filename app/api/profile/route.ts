import { NextRequest, NextResponse } from "next/server";
import { profileRepository } from "@/lib/repositories/profileRepository";

export async function GET() {
  const profile = await profileRepository.get();
  return NextResponse.json({ profile });
}

export async function PUT(request: NextRequest) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const profile = await profileRepository.save({
      name: String(payload.name ?? ""),
      email: String(payload.email ?? ""),
      cvBase: String(payload.cvBase ?? ""),
      cvVersionsBaseNotes: String(payload.cvVersionsBaseNotes ?? ""),
      coverLetterBase: String(payload.coverLetterBase ?? ""),
      defaultCvDocumentVersionId:
        typeof payload.defaultCvDocumentVersionId === "string"
          ? payload.defaultCvDocumentVersionId
          : undefined,
      defaultCoverDocumentVersionId:
        typeof payload.defaultCoverDocumentVersionId === "string"
          ? payload.defaultCoverDocumentVersionId
          : undefined,
    });
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save profile" },
      { status: 400 },
    );
  }
}
