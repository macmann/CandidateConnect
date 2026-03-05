import { NextRequest, NextResponse } from "next/server";
import { fieldAnswerService } from "@/lib/repositories/fieldAnswerService";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const answers = await fieldAnswerService.listByApplicationId(id);
  return NextResponse.json({ answers });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const payload = await request.json();
    const updates = Array.isArray(payload.answers)
      ? payload.answers.map((item: { question?: string; final_answer?: string }) => ({
          question: String(item.question ?? ""),
          final_answer: String(item.final_answer ?? ""),
        }))
      : [];

    const answers = await fieldAnswerService.saveFinalAnswers(id, updates);
    return NextResponse.json({ answers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save final answers" },
      { status: 400 },
    );
  }
}
