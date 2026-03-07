import { Application } from "@/lib/domain/application";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { documentRepository } from "@/lib/repositories/documentRepository";
import { fieldAnswerRepository } from "@/lib/repositories/fieldAnswerRepository";
import { jobDescriptionSnapshotRepository } from "@/lib/repositories/jobDescriptionSnapshotRepository";
import { submissionSnapshotRepository } from "@/lib/repositories/submissionSnapshotRepository";

function assertEditable(application: Application): void {
  if (application.submissionSnapshot) {
    throw new Error("Application is already submitted and frozen");
  }
}

export class SubmissionService {
  async markSubmitted(applicationId: string): Promise<Application> {
    const application = await applicationRepository.getById(applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    assertEditable(application);

    if (!application.cvDocumentVersionId || !application.coverDocumentVersionId) {
      throw new Error("CV and Cover document versions must be selected before submission");
    }

    const [cvVersion, coverVersion, jdSnapshot, answers] = await Promise.all([
      documentRepository.getById(application.cvDocumentVersionId),
      documentRepository.getById(application.coverDocumentVersionId),
      jobDescriptionSnapshotRepository.getByApplicationId(applicationId),
      fieldAnswerRepository.listByApplicationId(applicationId),
    ]);

    if (!cvVersion || !coverVersion) {
      throw new Error("Selected CV/Cover versions are invalid");
    }

    if (!jdSnapshot) {
      throw new Error("Job description snapshot is required before submission");
    }

    if (!application.salaryExpectation?.trim()) {
      throw new Error("salaryExpectation is required before submission");
    }

    if (!answers.length || answers.some((answer) => !answer.final_answer.trim())) {
      throw new Error("All generated questions must have final answers before submission");
    }

    const submissionSnapshot = await submissionSnapshotRepository.create({
      application_id: applicationId,
      cv_version_id: cvVersion.id,
      cover_version_id: coverVersion.id,
      salary_expectation: application.salaryExpectation,
      jd_snapshot_ref: jdSnapshot.created_at,
      field_answer_refs: answers.map((answer) => answer.id),
    });

    await Promise.all([
      fieldAnswerRepository.lockByApplicationId(applicationId),
      jobDescriptionSnapshotRepository.lockByApplicationId(applicationId),
      applicationRepository.update(applicationId, {
        status: application.status === "Saved" ? "Applied" : application.status,
        applied_date: application.applied_date || new Date().toISOString().slice(0, 10),
      }),
    ]);

    const updated = await applicationRepository.getById(applicationId);
    if (!updated) {
      throw new Error("Application not found after submission");
    }

    return {
      ...updated,
      submissionSnapshot,
    };
  }
}

export const submissionService = new SubmissionService();
