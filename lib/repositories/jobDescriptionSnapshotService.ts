import { JobDescriptionSnapshot } from "@/lib/domain/jobDescriptionSnapshot";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { jobDescriptionSnapshotRepository } from "@/lib/repositories/jobDescriptionSnapshotRepository";

function assertRawText(rawText: string): void {
  if (!rawText?.trim()) {
    throw new Error("raw_text is required");
  }
}

async function assertSnapshotEditable(applicationId: string): Promise<void> {
  const application = await applicationRepository.getById(applicationId);
  if (!application) {
    throw new Error("Application not found");
  }

  if (application.submissionSnapshot) {
    throw new Error("Application is submitted; JD snapshot is locked");
  }
}

export class JobDescriptionSnapshotService {
  async getByApplicationId(applicationId: string): Promise<JobDescriptionSnapshot | null> {
    return jobDescriptionSnapshotRepository.getByApplicationId(applicationId);
  }

  async createByApplicationId(
    applicationId: string,
    rawText: string,
  ): Promise<JobDescriptionSnapshot> {
    assertRawText(rawText);
    await assertSnapshotEditable(applicationId);

    const existing = await jobDescriptionSnapshotRepository.getByApplicationId(applicationId);
    if (existing) {
      throw new Error("Snapshot already exists and is immutable");
    }

    return jobDescriptionSnapshotRepository.create({
      application_id: applicationId,
      raw_text: rawText,
    });
  }

  async updateRawText(applicationId: string, rawText: string): Promise<JobDescriptionSnapshot> {
    assertRawText(rawText);
    await assertSnapshotEditable(applicationId);

    const existing = await jobDescriptionSnapshotRepository.getByApplicationId(applicationId);
    if (!existing) {
      throw new Error("Snapshot not found");
    }

    throw new Error("Snapshot is immutable and cannot be updated");
  }

  async deleteByApplicationId(applicationId: string): Promise<void> {
    await assertSnapshotEditable(applicationId);

    const existing = await jobDescriptionSnapshotRepository.getByApplicationId(applicationId);
    if (!existing) {
      throw new Error("Snapshot not found");
    }

    throw new Error("Snapshot is immutable and cannot be deleted");
  }
}

export const jobDescriptionSnapshotService = new JobDescriptionSnapshotService();
