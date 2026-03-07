import { RoundDebrief } from "@/lib/domain/application";
import { prepRepository } from "@/lib/repositories/prepRepository";

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

type DebriefGeneration = {
  summary: string;
  improvements: string;
  nextRoundFocus: string;
  thankYouEmail: string;
};

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

    const fallback = {
      summary: `Summary: ${input.wentWell || "Round completed."}`,
      improvements: `- Improve: ${input.toImprove || "Refine concise examples"}`,
      nextRoundFocus: "- Focus on stronger quantified outcomes and role-specific depth.",
      thankYouEmail:
        "Hi team, thank you for the conversation today. I enjoyed discussing the role and remain very excited about the opportunity.",
    };

    const generated = (await this.generateWithOpenAI(input)) ?? fallback;

    const artifact = await prepRepository.saveDebriefArtifact({
      round_id: input.roundId,
      generated_summary: generated.summary,
      improvements: generated.improvements,
      next_round_focus: generated.nextRoundFocus,
      thank_you_email: generated.thankYouEmail,
    });

    return { debrief, artifact };
  }

  private async generateWithOpenAI(input: DebriefInput): Promise<DebriefGeneration | null> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return null;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-5",
          temperature: 0.3,
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "debrief_generation",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: { type: "string" },
                  improvements: { type: "string" },
                  nextRoundFocus: { type: "string" },
                  thankYouEmail: { type: "string" },
                },
                required: ["summary", "improvements", "nextRoundFocus", "thankYouEmail"],
              },
            },
          },
          messages: [
            {
              role: "system",
              content:
                "You are an interview coach. Convert interviewer notes into actionable interview tips and a practical round plan.",
            },
            {
              role: "user",
              content: `Generate concise, high-quality outputs from this interview debrief payload:\n${JSON.stringify(input, null, 2)}`,
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI request failed with status ${response.status}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawContent = data.choices?.[0]?.message?.content?.trim();
      if (!rawContent) {
        return null;
      }

      return JSON.parse(rawContent) as DebriefGeneration;
    } catch (error) {
      console.error("Debrief AI generation failed", error);
      return null;
    }
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
