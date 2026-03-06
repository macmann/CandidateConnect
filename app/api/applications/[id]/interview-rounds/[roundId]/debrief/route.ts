import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { debriefService } from "@/lib/repositories/debriefService";

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  const { roundId } = await params;
  const data = await debriefService.list(roundId);
  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; roundId: string }> },
) {
  const { roundId } = await params;
  const body = (await request.json()) as {
    follow_up_reminder_at?: string;
    take_home_items?: Array<{ id?: string; text?: string; completed?: boolean }>;
  };

  const takeHomeItems = Array.isArray(body.take_home_items)
    ? body.take_home_items
        .filter((item) => item && typeof item.text === "string" && item.text.trim())
        .map((item) => ({
          id: typeof item.id === "string" && item.id.trim() ? item.id : crypto.randomUUID(),
          text: String(item.text ?? "").trim(),
          completed: Boolean(item.completed),
        }))
    : [];

  const taskList = await debriefService.upsertTaskList({
    roundId,
    followUpReminderAt: body.follow_up_reminder_at ? String(body.follow_up_reminder_at) : undefined,
    takeHomeItems,
  });

  return NextResponse.json({ taskList });
}
