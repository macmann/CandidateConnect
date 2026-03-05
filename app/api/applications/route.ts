import { NextRequest, NextResponse } from "next/server";
import { applicationService } from "@/lib/repositories/applicationService";

export async function GET() {
  const applications = await applicationService.listApplications();
  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const application = await applicationService.createApplication(payload);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create application" },
      { status: 400 },
    );
  }
}
