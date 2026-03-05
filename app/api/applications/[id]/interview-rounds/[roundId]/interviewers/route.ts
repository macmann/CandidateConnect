import { NextRequest, NextResponse } from "next/server";
import { interviewerRepository } from "@/lib/repositories/interviewerRepository";

export async function GET(_: NextRequest, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const interviewers = await interviewerRepository.listForRound(roundId);
  return NextResponse.json({ interviewers });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ roundId: string }> }) {
  const { roundId } = await params;
  const body = (await request.json()) as { interviewer_ids?: string[] };
  await interviewerRepository.setRoundInterviewers(roundId, body.interviewer_ids ?? []);
  const interviewers = await interviewerRepository.listForRound(roundId);
  return NextResponse.json({ interviewers });
}
