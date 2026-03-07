import { NextRequest, NextResponse } from "next/server";
import { ApplicationInput } from "@/lib/domain/application";
import { applicationService } from "@/lib/repositories/applicationService";

function normalizePayload(payload: Record<string, unknown>): Partial<ApplicationInput> {
  const jobDescription = (payload.jobDescription ?? {}) as Record<string, unknown>;

  return {
    candidateName: String(payload.candidateName ?? ""),
    candidateEmail: String(payload.candidateEmail ?? ""),
    contactPerson: String(payload.contactPerson ?? ""),
    sourcePlatform: String(payload.sourcePlatform ?? ""),
    company: String(payload.company ?? jobDescription.company ?? ""),
    role: String(payload.role ?? jobDescription.title ?? ""),
    location: String(payload.location ?? jobDescription.location ?? ""),
    job_url: String(payload.job_url ?? jobDescription.sourceUrl ?? ""),
    status: payload.status as ApplicationInput["status"],
    salary_expectation: String(payload.salary_expectation ?? payload.salaryExpectation ?? ""),
    applied_date: String(payload.applied_date ?? ""),
    notes: String(payload.notes ?? ""),
    cvSubmitted: Boolean(payload.cvSubmitted),
    coverLetterSubmitted: Boolean(payload.coverLetterSubmitted),
    jobDescription: {
      title: String(payload.role ?? jobDescription.title ?? ""),
      company: String(payload.company ?? jobDescription.company ?? ""),
      location: String(payload.location ?? jobDescription.location ?? ""),
      description: String(jobDescription.description ?? ""),
      sourceUrl: String(payload.job_url ?? jobDescription.sourceUrl ?? ""),
      capturedAt:
        typeof jobDescription.capturedAt === "string" ? jobDescription.capturedAt : undefined,
    },
    cvDocumentVersionId:
      typeof payload.cvDocumentVersionId === "string" ? payload.cvDocumentVersionId : undefined,
    coverDocumentVersionId:
      typeof payload.coverDocumentVersionId === "string"
        ? payload.coverDocumentVersionId
        : undefined,
  };
}

export async function GET() {
  const applications = await applicationService.listApplications();
  return NextResponse.json({ applications });
}

export async function POST(request: NextRequest) {
  try {
    const payload = normalizePayload((await request.json()) as Record<string, unknown>);
    const application = await applicationService.createApplication(payload);
    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create application" },
      { status: 400 },
    );
  }
}
