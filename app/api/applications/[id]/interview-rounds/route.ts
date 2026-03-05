import { NextRequest, NextResponse } from "next/server";
import { InterviewRoundInput } from "@/lib/domain/application";
import { interviewRoundService } from "@/lib/repositories/interviewRoundService";

function toInput(payload: Record<string, unknown>): Partial<InterviewRoundInput> {
  return {
    round_type:
      payload.round_type === undefined ? undefined : (String(payload.round_type) as InterviewRoundInput["round_type"]),
    scheduled_at: payload.scheduled_at === undefined ? undefined : String(payload.scheduled_at),
    timezone: payload.timezone === undefined ? undefined : String(payload.timezone),
    mode: payload.mode === undefined ? undefined : (String(payload.mode) as InterviewRoundInput["mode"]),
    location_or_link: payload.location_or_link === undefined ? undefined : String(payload.location_or_link),
    purpose: payload.purpose === undefined ? undefined : String(payload.purpose),
    status: payload.status === undefined ? undefined : (String(payload.status) as InterviewRoundInput["status"]),
    notes: payload.notes === undefined ? undefined : String(payload.notes),
  };
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const rounds = await interviewRoundService.list(id);
    return NextResponse.json({ rounds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to list interview rounds" },
      { status: 400 },
    );
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Record<string, unknown>;
    if (body.action === "next") {
      const round = await interviewRoundService.createNextDraft(id);
      return NextResponse.json({ round }, { status: 201 });
    }

    const payload = toInput(body);
    const round = await interviewRoundService.create(id, payload);
    return NextResponse.json({ round }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create interview round";
    const status = message === "Application not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
