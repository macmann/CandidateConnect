import {
  InterviewRound,
  InterviewRoundInput,
  InterviewRoundStatus,
  InterviewRoundType,
} from "@/lib/domain/application";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { interviewRoundRepository } from "@/lib/repositories/interviewRoundRepository";

const validRoundTypes: InterviewRoundType[] = [
  "Recruiter Screen",
  "Hiring Manager",
  "Technical",
  "System Design",
  "Panel",
  "Take-home",
  "Final",
  "Other",
];

const validStatuses: InterviewRoundStatus[] = ["Planned", "Scheduled", "Completed", "Cancelled"];

function normalizeInput(payload: Partial<InterviewRoundInput>): InterviewRoundInput {
  const roundType = String(payload.round_type ?? "").trim() as InterviewRoundType;
  const status = (payload.status ? String(payload.status) : "Planned") as InterviewRoundStatus;
  if (!validRoundTypes.includes(roundType)) {
    throw new Error("round_type is invalid");
  }

  if (!validStatuses.includes(status)) {
    throw new Error("status is invalid");
  }

  return {
    round_type: roundType,
    scheduled_at: payload.scheduled_at ? String(payload.scheduled_at) : "",
    status,
    notes: payload.notes ? String(payload.notes) : "",
  };
}

export class InterviewRoundService {
  async list(applicationId: string): Promise<InterviewRound[]> {
    return interviewRoundRepository.listByApplicationId(applicationId);
  }

  async create(applicationId: string, payload: Partial<InterviewRoundInput>): Promise<InterviewRound> {
    const application = await applicationRepository.getById(applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    return interviewRoundRepository.create(applicationId, normalizeInput(payload));
  }

  async update(
    applicationId: string,
    roundId: string,
    payload: Partial<InterviewRoundInput>,
  ): Promise<InterviewRound | null> {
    const patch: Partial<InterviewRoundInput> = {};
    if (payload.round_type !== undefined) {
      const roundType = String(payload.round_type).trim() as InterviewRoundType;
      if (!validRoundTypes.includes(roundType)) {
        throw new Error("round_type is invalid");
      }
      patch.round_type = roundType;
    }

    if (payload.status !== undefined) {
      const status = String(payload.status) as InterviewRoundStatus;
      if (!validStatuses.includes(status)) {
        throw new Error("status is invalid");
      }
      patch.status = status;
    }

    if (payload.scheduled_at !== undefined) {
      patch.scheduled_at = String(payload.scheduled_at);
    }

    if (payload.notes !== undefined) {
      patch.notes = String(payload.notes);
    }

    return interviewRoundRepository.update(applicationId, roundId, patch);
  }

  async remove(applicationId: string, roundId: string): Promise<boolean> {
    return interviewRoundRepository.delete(applicationId, roundId);
  }
}

export const interviewRoundService = new InterviewRoundService();
