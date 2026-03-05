import { NextRequest, NextResponse } from "next/server";
import { ApplicationStatus } from "@/lib/domain/application";
import { applicationService } from "@/lib/repositories/applicationService";

const allowedStatuses: ApplicationStatus[] = ["Saved", "Applied", "Interview", "Offer", "Rejected"];

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = (await request.json()) as { status?: ApplicationStatus };

    if (!body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Valid status is required" }, { status: 400 });
    }

    const application = await applicationService.transitionApplicationStatus(id, body.status);

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to transition status" },
      { status: 400 },
    );
  }
}
