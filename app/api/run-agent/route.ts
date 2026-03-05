import { NextRequest, NextResponse } from "next/server";
import { LlmAgent, Gemini, InMemoryRunner, stringifyContent } from "@google/adk";
import { AppNode } from "@/lib/store";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nodes, edges, input } = body;

    if (!nodes || !edges) {
      return NextResponse.json({ error: "Missing nodes or edges" }, { status: 400 });
    }

    // 1. Find the starting trigger node
    const startNode = nodes.find((n: AppNode) => n.type === "triggerNode");
    if (!startNode) {
      return NextResponse.json({ error: "No trigger node found" }, { status: 400 });
    }

    // 2. Find the connected agent
    const edge = edges.find((e: any) => e.source === startNode.id);
    let agentNode: AppNode | undefined;

    if (edge) {
      agentNode = nodes.find((n: AppNode) => n.id === edge.target && n.type === "agentNode");
    }

    if (!agentNode) {
      return NextResponse.json({
        success: true,
        steps: [{ node: startNode.data.label, type: "triggerNode", output: "No agent connected" }],
      });
    }

    const systemPrompt =
      (agentNode.data.config?.systemPrompt as string) || "You are a helpful assistant.";

    // 3. Initialize ADK Agent
    const model = new Gemini({
      model: "gemini-1.5-flash",
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    });

    const agent = new LlmAgent({
      name: "builder-agent",
      model,
      instruction: systemPrompt,
    });

    const runner = new InMemoryRunner({ agent });

    const steps: any[] = [];
    steps.push({ node: startNode.data.label, type: "triggerNode" });
    steps.push({ node: agentNode.data.label, type: "agentNode", status: "running" });

    // 4. Run the agent
    const resultEvents = runner.runAsync({
      userId: "test-user",
      sessionId: "test-session",
      newMessage: {
        role: "user",
        parts: [{ text: input || "Hello, please execute your instructions." }],
      },
    });

    let finalResponse = "";
    const events: any[] = [];

    for await (const event of resultEvents) {
      console.log("Received event:", JSON.stringify(event, null, 2));
      events.push(event);
      const text = stringifyContent(event);
      if (text) {
        finalResponse += text;
      }
    }

    return NextResponse.json({
      success: true,
      steps,
      events,
      message: finalResponse || "Agent executed successfully. See events for details.",
    });
  } catch (error: any) {
    console.error("Error running agent flow:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
