import { NextRequest, NextResponse } from "next/server";
import { debriefService } from "@/lib/repositories/debriefService";

export async function GET(_: NextRequest, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const data = await debriefService.list(roundId);
  return NextResponse.json(data);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const data = await debriefService.create({
    roundId,
    rawNotes: String(body.raw_notes ?? ""),
    questionsAsked: String(body.questions_asked ?? ""),
    wentWell: String(body.went_well ?? ""),
    wentBadly: String(body.went_badly ?? ""),
    toImprove: String(body.to_improve ?? ""),
    followUpTasks: String(body.follow_up_tasks ?? ""),
  });
  return NextResponse.json(data, { status: 201 });
}
