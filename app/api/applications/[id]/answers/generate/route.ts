import { NextRequest, NextResponse } from "next/server";
import { fieldAnswerService } from "@/lib/repositories/fieldAnswerService";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const payload = await request.json();
    const questionBlock = String(payload.question_block ?? "");
    const tone = String(payload.tone ?? "professional");
    const snapshotId = payload.snapshot_id ? String(payload.snapshot_id) : undefined;

    const answers = await fieldAnswerService.generateAnswers({
      applicationId: id,
      questionBlock,
      tone,
      snapshotId,
    });

    return NextResponse.json({ answers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate answers" },
      { status: 400 },
    );
  }
}
