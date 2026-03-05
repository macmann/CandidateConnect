import { NextRequest, NextResponse } from "next/server";
import { submissionService } from "@/lib/repositories/submissionService";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const application = await submissionService.markSubmitted(id);
    return NextResponse.json({ application });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to submit application";
    const status = message === "Application not found" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
