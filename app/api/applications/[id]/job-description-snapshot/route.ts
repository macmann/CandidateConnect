import { NextRequest, NextResponse } from "next/server";
import { jobDescriptionSnapshotService } from "@/lib/repositories/jobDescriptionSnapshotService";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const snapshot = await jobDescriptionSnapshotService.getByApplicationId(id);

  if (!snapshot) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }

  return NextResponse.json({ snapshot });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    const snapshot = await jobDescriptionSnapshotService.createByApplicationId(id, payload.raw_text);
    return NextResponse.json({ snapshot }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create snapshot";
    const status = message === "Application not found" ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await request.json();
    await jobDescriptionSnapshotService.updateRawText(id, payload.raw_text);
    return NextResponse.json({ error: "Unexpected success" }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update snapshot";
    const status = message === "Snapshot not found" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await jobDescriptionSnapshotService.deleteByApplicationId(id);
    return NextResponse.json({ error: "Unexpected success" }, { status: 500 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete snapshot";
    const status = message === "Snapshot not found" ? 404 : 409;
    return NextResponse.json({ error: message }, { status });
  }
}
