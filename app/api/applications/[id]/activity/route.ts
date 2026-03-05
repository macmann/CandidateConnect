import { NextRequest, NextResponse } from "next/server";
import { applicationActivityRepository } from "@/lib/repositories/applicationActivityRepository";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activities = await applicationActivityRepository.list(id);
  return NextResponse.json({ activities });
}
