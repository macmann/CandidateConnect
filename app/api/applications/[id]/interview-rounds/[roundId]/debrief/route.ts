import { NextRequest, NextResponse } from "next/server";
import { debriefService } from "@/lib/repositories/debriefService";
import { RoundDebrief } from "@/lib/domain/application";

function parseChecklist(input: unknown): RoundDebrief["structured_fields"]["take_home_checklist"] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const candidate = item as Record<string, unknown>;
      if (typeof candidate.id !== "string" || typeof candidate.label !== "string") return null;
      return {
        id: candidate.id,
        label: candidate.label,
        checked: Boolean(candidate.checked),
      };
    })
    .filter((item): item is RoundDebrief["structured_fields"]["take_home_checklist"][number] => Boolean(item));
}

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
    followUpReminderAt:
      typeof body.follow_up_reminder_at === "string" ? body.follow_up_reminder_at : undefined,
    followUpReminderCompleted: Boolean(body.follow_up_reminder_completed),
    takeHomeChecklist: parseChecklist(body.take_home_checklist),
  });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ roundId: string }> },
) {
  const { roundId } = await params;
  const body = (await request.json()) as Record<string, unknown>;
  const updated = await debriefService.patchTracking(roundId, {
    ...(body.follow_up_reminder_at !== undefined
      ? {
          followUpReminderAt:
            typeof body.follow_up_reminder_at === "string" ? body.follow_up_reminder_at : "",
        }
      : {}),
    ...(body.follow_up_reminder_completed !== undefined
      ? { followUpReminderCompleted: Boolean(body.follow_up_reminder_completed) }
      : {}),
    ...(body.take_home_checklist !== undefined
      ? { takeHomeChecklist: parseChecklist(body.take_home_checklist) }
      : {}),
  });

  if (!updated) {
    return NextResponse.json(
      { error: "No debrief found for round. Save a debrief first." },
      { status: 404 },
    );
  }

  return NextResponse.json({ debrief: updated });
}
