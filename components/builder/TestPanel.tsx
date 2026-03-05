import React, { useState, useRef, useEffect } from "react";
import { Send, X, Terminal, Loader2, Play } from "lucide-react";
import { useBuilderStore } from "@/lib/store";

interface Message {
  role: "user" | "agent" | "system";
  content: string;
  timestamp: number;
}

interface TestPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestPanel = ({ isOpen, onClose }: TestPanelProps) => {
  const { nodes, edges } = useBuilderStore();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debugSteps, setDebugSteps] = useState<any[]>([]);
  const [debugEvents, setDebugEvents] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, debugEvents]);

  const handleSend = async () => {
    const triggerNode = nodes.find((n) => n.type === "triggerNode");
    const isChatTrigger = triggerNode?.data.config?.triggerType === "chat";

    // If no input and not chat trigger, we can treat it as a manual run (empty input or strict manual)
    // But now we allow input always.
    if (!input.trim() && isChatTrigger) return;

    const userMsg: Message = {
      role: "user",
      content: input.trim() ? input : "Manual Trigger Execution",
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setDebugSteps([]); // Clear previous debug steps
    setDebugEvents([]);

    try {
      const response = await fetch("/api/run-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, input: userMsg.content }),
      });

      const data = await response.json();

      if (data.success) {
        setDebugSteps(data.steps || []);
        setDebugEvents(data.events || []);

        const agentMsg: Message = {
          role: "agent",
          content: data.message || "No output received",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, agentMsg]);
      } else {
        const errorMsg: Message = {
          role: "system",
          content: `Error: ${data.error}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (error: any) {
      const errorMsg: Message = {
        role: "system",
        content: `Failed to execute: ${error.message}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-4 bottom-4 w-96 max-h-[600px] h-[70vh] bg-[#1e1e1e]/95 backdrop-blur-md shadow-2xl border border-[#333] flex flex-col z-40 rounded-2xl overflow-hidden transition-all duration-300">
      {/* Header */}
      <div className="p-4 border-b border-[#333] flex items-center justify-between bg-[#252525]/50">
        <h2 className="font-semibold text-gray-200 flex items-center gap-2">
          <Play size={16} className="text-blue-500" />
          Test Agent
        </h2>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#121212]/50 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <p className="text-sm">Start a conversation to test your agent.</p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${
                msg.role === "user"
                  ? "bg-blue-600/90 text-white rounded-br-none"
                  : msg.role === "system"
                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                    : "bg-[#2a2a2a] text-gray-200 border border-[#333] rounded-bl-none"
              }`}
            >
              {msg.content}
            </div>
            <span className="text-[10px] text-gray-500 mt-1 px-1">
              {msg.role === "user" ? "You" : msg.role === "agent" ? "Agent" : "System"}
            </span>
          </div>
        ))}

        {/* Debug Logs Section */}
        {(debugSteps.length > 0 || debugEvents.length > 0) && (
          <div className="mt-4 p-3 bg-black/40 rounded-xl text-xs font-mono text-gray-400 overflow-hidden border border-[#333]">
            <div className="flex items-center gap-2 mb-2 text-gray-500 pb-2 border-b border-[#333]">
              <Terminal size={12} />
              <span>Execution Log</span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto custom-scrollbar">
              {debugSteps.map((step, i) => (
                <div key={`step-${i}`} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  <span className="opacity-75">
                    {step.type}: {step.node}
                  </span>
                </div>
              ))}
              {debugEvents.map((event, i) => (
                <div key={`evt-${i}`} className="pl-4 border-l-2 border-[#333] ml-1 py-1">
                  <span className="text-blue-400">event:</span> {event?.type || "unknown"}
                </div>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Loader2 size={14} className="animate-spin text-blue-500" />
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-[#333] bg-[#1e1e1e]">
        <div className="flex items-end gap-2">
          <textarea
            className="flex-1 min-h-[44px] max-h-32 p-3 bg-[#252525] border border-[#333] rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none text-sm text-gray-200 placeholder:text-gray-600"
            placeholder={
              nodes.find((n) => n.type === "triggerNode")?.data.config?.triggerType === "chat"
                ? "Type a message..."
                : "Enter input payload (optional)..."
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            rows={1}
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={`p-3 rounded-xl flex-shrink-0 transition-all duration-200 ${
              isLoading
                ? "bg-[#2a2a2a] text-gray-600 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-500 shadow-lg hover:shadow-blue-500/20"
            }`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
};
