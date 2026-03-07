import { NextRequest, NextResponse } from "next/server";
import { ApplicationInput } from "@/lib/domain/application";
import { applicationService } from "@/lib/repositories/applicationService";

function normalizePayload(payload: Record<string, unknown>): Partial<ApplicationInput> {
  const jobDescription = (payload.jobDescription ?? {}) as Record<string, unknown>;

  return {
    candidateName:
      payload.candidateName === undefined ? undefined : String(payload.candidateName ?? ""),
    candidateEmail:
      payload.candidateEmail === undefined ? undefined : String(payload.candidateEmail ?? ""),
    contactPerson:
      payload.contactPerson === undefined ? undefined : String(payload.contactPerson ?? ""),
    sourcePlatform:
      payload.sourcePlatform === undefined ? undefined : String(payload.sourcePlatform ?? ""),
    company: payload.company === undefined ? undefined : String(payload.company ?? ""),
    role: payload.role === undefined ? undefined : String(payload.role ?? ""),
    location: payload.location === undefined ? undefined : String(payload.location ?? ""),
    job_url: payload.job_url === undefined ? undefined : String(payload.job_url ?? ""),
    status: payload.status as ApplicationInput["status"],
    salary_expectation:
      payload.salary_expectation === undefined && payload.salaryExpectation === undefined
        ? undefined
        : String(payload.salary_expectation ?? payload.salaryExpectation ?? ""),
    applied_date:
      payload.applied_date === undefined ? undefined : String(payload.applied_date ?? ""),
    notes: payload.notes === undefined ? undefined : String(payload.notes ?? ""),
    cvSubmitted: payload.cvSubmitted === undefined ? undefined : Boolean(payload.cvSubmitted),
    coverLetterSubmitted:
      payload.coverLetterSubmitted === undefined ? undefined : Boolean(payload.coverLetterSubmitted),
    jobDescription:
      payload.jobDescription === undefined
        ? undefined
        : {
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

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const application = await applicationService.getApplication(id);

  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  return NextResponse.json({ application });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = normalizePayload((await request.json()) as Record<string, unknown>);
    const application = await applicationService.updateApplication(id, payload);

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update application" },
      { status: 400 },
    );
  }
}
