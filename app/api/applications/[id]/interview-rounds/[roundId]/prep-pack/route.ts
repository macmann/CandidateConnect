import { NextRequest, NextResponse } from "next/server";
import { interviewPrepService } from "@/lib/repositories/interviewPrepService";

export async function GET(_: NextRequest, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const artifacts = await interviewPrepService.list(roundId);
  return NextResponse.json({ artifacts });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  const { id, roundId } = await params;
  const body = (await request.json()) as Record<string, unknown>;

  if (body.action === "pin") {
    const artifactId = String(body.artifact_id ?? "");
    await interviewPrepService.pin(roundId, artifactId);
    return NextResponse.json({ ok: true });
  }

  const artifact = await interviewPrepService.generate({
    applicationId: id,
    roundId,
    tone: body.tone === "detailed" ? "detailed" : "concise",
    length: body.length === "full" ? "full" : "short",
  });

  return NextResponse.json({ artifact }, { status: 201 });
}
