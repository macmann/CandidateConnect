import { Application, ApplicationInput, ApplicationStatus } from "@/lib/domain/application";
import { applicationRepository } from "@/lib/repositories/applicationRepository";

function assertCreateInput(input: Partial<ApplicationInput>): asserts input is ApplicationInput {
  if (!input.company?.trim()) {
    throw new Error("company is required");
  }

  if (!input.role?.trim()) {
    throw new Error("role is required");
  }

  if (!input.jobDescription?.description?.trim()) {
    throw new Error("jobDescription.description is required");
  }

  if (!input.applied_date?.trim()) {
    throw new Error("applied_date is required");
  }
}

function hasFrozenFieldChanges(input: Partial<ApplicationInput>): boolean {
  return Boolean(
    input.candidateName !== undefined ||
      input.candidateEmail !== undefined ||
      input.contactPerson !== undefined ||
      input.jobDescription !== undefined ||
      input.cvDocumentVersionId !== undefined ||
      input.coverDocumentVersionId !== undefined ||
      input.salaryExpectation !== undefined ||
      input.salary_expectation !== undefined ||
      input.company !== undefined ||
      input.role !== undefined ||
      input.location !== undefined ||
      input.job_url !== undefined ||
      input.applied_date !== undefined ||
      input.cvSubmitted !== undefined ||
      input.coverLetterSubmitted !== undefined ||
      input.sourcePlatform !== undefined,
  );
}

export class ApplicationService {
  async listApplications(): Promise<Application[]> {
    return applicationRepository.list();
  }

  async getApplication(id: string): Promise<Application | null> {
    return applicationRepository.getById(id);
  }

  async createApplication(input: Partial<ApplicationInput>): Promise<Application> {
    assertCreateInput(input);
    return applicationRepository.create(input);
  }

  async updateApplication(
    id: string,
    input: Partial<ApplicationInput>,
  ): Promise<Application | null> {
    const current = await applicationRepository.getById(id);
    if (!current) return null;

    if (current.submissionSnapshot && hasFrozenFieldChanges(input)) {
      throw new Error("Application is submitted; frozen fields cannot be edited");
    }

    return applicationRepository.update(id, input);
  }

  async transitionApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<Application | null> {
    return applicationRepository.transitionStatus(id, status);
  }
}

export const applicationService = new ApplicationService();
