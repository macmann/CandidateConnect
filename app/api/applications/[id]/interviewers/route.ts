import { NextRequest, NextResponse } from "next/server";
import { interviewRoundRepository } from "@/lib/repositories/interviewRoundRepository";
import { interviewerRepository } from "@/lib/repositories/interviewerRepository";

const USER_ID = "default-user";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const [allInterviewers, applicationRounds] = await Promise.all([
    interviewerRepository.listByUser(USER_ID),
    interviewRoundRepository.listByApplicationId(params.id),
  ]);
  const linkedInterviewers = await interviewerRepository.listLinkedToApplication(
    USER_ID,
    applicationRounds.map((round) => round.id),
  );

  return NextResponse.json({
    interviewers: allInterviewers,
    linked_interviewers: linkedInterviewers,
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const name = String(body.name ?? "").trim();
  const title = String(body.title ?? "").trim();
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });

  const interviewer = await interviewerRepository.create({
    user_id: USER_ID,
    name,
    title: title || "Unknown interviewer",
    department: body.department ? String(body.department) : undefined,
    linkedin_url: body.linkedin_url ? String(body.linkedin_url) : undefined,
    notes: body.notes ? String(body.notes) : undefined,
  });

  return NextResponse.json({ interviewer }, { status: 201 });
}
