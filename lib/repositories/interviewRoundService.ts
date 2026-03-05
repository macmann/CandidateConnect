import {
  InterviewRound,
  InterviewRoundInput,
  InterviewRoundStatus,
  InterviewRoundType,
  InterviewMode,
} from "@/lib/domain/application";
import { applicationActivityRepository } from "@/lib/repositories/applicationActivityRepository";
import { applicationRepository } from "@/lib/repositories/applicationRepository";
import { interviewRoundRepository } from "@/lib/repositories/interviewRoundRepository";

const validRoundTypes: InterviewRoundType[] = [
  "Recruiter",
  "Hiring Manager",
  "Technical",
  "Case",
  "Panel",
  "Final",
];

const validStatuses: InterviewRoundStatus[] = [
  "Scheduled",
  "Completed",
  "Passed",
  "Failed",
  "Cancelled",
];
const validModes: InterviewMode[] = ["Zoom", "Onsite", "Phone"];

function normalizeInput(payload: Partial<InterviewRoundInput>): InterviewRoundInput {
  const roundType = String(payload.round_type ?? "").trim() as InterviewRoundType;
  const status = (payload.status ? String(payload.status) : "Scheduled") as InterviewRoundStatus;
  if (!validRoundTypes.includes(roundType)) {
    throw new Error("round_type is invalid");
  }
  if (!validStatuses.includes(status)) throw new Error("status is invalid");
  if (payload.mode && !validModes.includes(payload.mode)) throw new Error("mode is invalid");

  return {
    round_type: roundType,
    scheduled_at: payload.scheduled_at ? String(payload.scheduled_at) : undefined,
    timezone: payload.timezone ? String(payload.timezone) : undefined,
    mode: payload.mode,
    location_or_link: payload.location_or_link ? String(payload.location_or_link) : undefined,
    purpose: payload.purpose ? String(payload.purpose) : undefined,
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
    if (!application) throw new Error("Application not found");
    const round = await interviewRoundRepository.create(applicationId, normalizeInput(payload));
    await applicationActivityRepository.create(applicationId, `Round ${round.round_index} created (${round.round_type})`);
    return round;
  }

  async createNextDraft(applicationId: string): Promise<InterviewRound> {
    const rounds = await interviewRoundRepository.listByApplicationId(applicationId);
    const lastType = rounds[rounds.length - 1]?.round_type ?? "Technical";
    return this.create(applicationId, { round_type: lastType, status: "Scheduled" });
  }

  async update(applicationId: string, roundId: string, payload: Partial<InterviewRoundInput>): Promise<InterviewRound | null> {
    const current = await interviewRoundRepository.getById(applicationId, roundId);
    if (!current) return null;

    const patch: Partial<InterviewRoundInput> = {};
    if (payload.round_type !== undefined) {
      const roundType = String(payload.round_type).trim() as InterviewRoundType;
      if (!validRoundTypes.includes(roundType)) throw new Error("round_type is invalid");
      patch.round_type = roundType;
    }
    if (payload.status !== undefined) {
      const status = String(payload.status) as InterviewRoundStatus;
      if (!validStatuses.includes(status)) throw new Error("status is invalid");
      patch.status = status;
    }
    if (payload.mode !== undefined) {
      if (payload.mode && !validModes.includes(payload.mode)) throw new Error("mode is invalid");
      patch.mode = payload.mode;
    }
    if (payload.scheduled_at !== undefined) patch.scheduled_at = String(payload.scheduled_at);
    if (payload.timezone !== undefined) patch.timezone = String(payload.timezone);
    if (payload.location_or_link !== undefined) patch.location_or_link = String(payload.location_or_link);
    if (payload.purpose !== undefined) patch.purpose = String(payload.purpose);
    if (payload.notes !== undefined) patch.notes = String(payload.notes);

    const round = await interviewRoundRepository.update(applicationId, roundId, patch);
    if (round && payload.status && payload.status !== current.status) {
      await applicationActivityRepository.create(
        applicationId,
        `Round ${round.round_index} status changed: ${current.status} → ${payload.status}`,
      );
    }
    return round;
  }

  async remove(applicationId: string, roundId: string): Promise<boolean> {
    return interviewRoundRepository.delete(applicationId, roundId);
  }
}

export const interviewRoundService = new InterviewRoundService();
