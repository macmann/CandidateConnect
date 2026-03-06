import { GoogleGenAI } from "@google/genai";
import { prepRepository } from "@/lib/repositories/prepRepository";
import { RoundDebrief } from "@/lib/domain/application";

interface DebriefInput {
  roundId: string;
  rawNotes: string;
  questionsAsked: string;
  wentWell: string;
  wentBadly: string;
  toImprove: string;
  followUpTasks: string;
  followUpReminderAt?: string;
  followUpReminderCompleted?: boolean;
  takeHomeChecklist?: RoundDebrief["structured_fields"]["take_home_checklist"];
}

export class DebriefService {
  async create(input: DebriefInput) {
    const debrief = await prepRepository.saveDebrief({
      round_id: input.roundId,
      raw_notes: input.rawNotes,
      structured_fields: {
        questions_asked: input.questionsAsked,
        went_well: input.wentWell,
        went_badly: input.wentBadly,
        to_improve: input.toImprove,
        follow_up_tasks: input.followUpTasks,
        follow_up_reminder_at: input.followUpReminderAt,
        follow_up_reminder_completed: Boolean(input.followUpReminderCompleted),
        take_home_checklist: input.takeHomeChecklist ?? [],
      },
    });

    let generated_summary = `Summary: ${input.wentWell || "Round completed."}`;
    let improvements = `- Improve: ${input.toImprove || "Refine concise examples"}`;
    let next_round_focus = "- Focus on stronger quantified outcomes and role-specific depth.";
    let thank_you_email = `Hi team, thank you for the conversation today. I enjoyed discussing the role and remain very excited about the opportunity.`;

    if (process.env.GOOGLE_GENAI_API_KEY) {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY });
        const response = await ai.models.generateContent({
          model: "gemini-1.5-flash",
          contents: `Create four sections: summary, improvements, next_round_focus, thank_you_email from this debrief data:\n${JSON.stringify(input, null, 2)}`,
        });
        const text = response.text ?? "";
        if (text.trim()) {
          generated_summary = text;
        }
      } catch (error) {
        console.error("Debrief AI generation failed", error);
      }
    }

    const artifact = await prepRepository.saveDebriefArtifact({
      round_id: input.roundId,
      generated_summary,
      improvements,
      next_round_focus,
      thank_you_email,
    });

    return { debrief, artifact };
  }

  async patchTracking(
    roundId: string,
    updates: {
      followUpReminderAt?: string;
      followUpReminderCompleted?: boolean;
      takeHomeChecklist?: RoundDebrief["structured_fields"]["take_home_checklist"];
    },
  ) {
    return prepRepository.patchLatestDebriefTracking(roundId, {
      follow_up_reminder_at: updates.followUpReminderAt,
      follow_up_reminder_completed: updates.followUpReminderCompleted,
      take_home_checklist: updates.takeHomeChecklist,
    });
  }

  async list(roundId: string) {
    const [debriefs, artifacts] = await Promise.all([
      prepRepository.listDebriefs(roundId),
      prepRepository.listDebriefArtifacts(roundId),
    ]);
    return { debriefs, artifacts };
  }
}

export const debriefService = new DebriefService();
