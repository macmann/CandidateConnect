import { GoogleGenAI } from "@google/genai";
import { prepRepository } from "@/lib/repositories/prepRepository";

interface DebriefInput {
  roundId: string;
  rawNotes: string;
  questionsAsked: string;
  wentWell: string;
  wentBadly: string;
  toImprove: string;
  followUpTasks: string;
}

interface TaskListInput {
  roundId: string;
  followUpReminderAt?: string;
  takeHomeItems: Array<{ id: string; text: string; completed: boolean }>;
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
          contents: `Create four sections: summary, improvements, next_round_focus, thank_you_email from this debrief data:
${JSON.stringify(input, null, 2)}`,
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

  async list(roundId: string) {
    const [debriefs, artifacts, taskList] = await Promise.all([
      prepRepository.listDebriefs(roundId),
      prepRepository.listDebriefArtifacts(roundId),
      prepRepository.getTaskList(roundId),
    ]);
    const latestArtifact = [...artifacts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null;
    return { debriefs, artifacts, latestArtifact, taskList };
  }

  async upsertTaskList(input: TaskListInput) {
    return prepRepository.upsertTaskList({
      round_id: input.roundId,
      follow_up_reminder_at: input.followUpReminderAt,
      take_home_items: input.takeHomeItems,
    });
  }
}

export const debriefService = new DebriefService();
