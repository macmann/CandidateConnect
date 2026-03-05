import { NextRequest, NextResponse } from "next/server";
import { InterviewRoundInput } from "@/lib/domain/application";
import { interviewRoundService } from "@/lib/repositories/interviewRoundService";

function toInput(payload: Record<string, unknown>): Partial<InterviewRoundInput> {
  return {
    round_type:
      payload.round_type === undefined ? undefined : (String(payload.round_type) as InterviewRoundInput["round_type"]),
    scheduled_at: payload.scheduled_at === undefined ? undefined : String(payload.scheduled_at),
    status: payload.status === undefined ? undefined : (String(payload.status) as InterviewRoundInput["status"]),
    notes: payload.notes === undefined ? undefined : String(payload.notes),
  };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  try {
    const { id, roundId } = await params;
    const payload = toInput((await request.json()) as Record<string, unknown>);
    const round = await interviewRoundService.update(id, roundId, payload);

    if (!round) {
      return NextResponse.json({ error: "Interview round not found" }, { status: 404 });
    }

    return NextResponse.json({ round });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update interview round" },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  const { id, roundId } = await params;
  const removed = await interviewRoundService.remove(id, roundId);

  if (!removed) {
    return NextResponse.json({ error: "Interview round not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
