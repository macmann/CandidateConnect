import React from "react";
import { useBuilderStore } from "@/lib/store";
import { Settings, X } from "lucide-react";

export const PropertiesPanel = () => {
  const { selectedNode, updateNodeData, setSelectedNode } = useBuilderStore();

  if (!selectedNode) return null;

  return (
    <div className="absolute top-4 right-4 bottom-4 w-80 bg-[#1e1e1e]/95 backdrop-blur-md border border-[#333] flex flex-col shadow-2xl z-30 rounded-2xl overflow-hidden transition-all duration-300">
      <div className="p-5 border-b border-[#333] flex items-center justify-between bg-[#252525]/50">
        <h2 className="font-bold text-gray-200 flex items-center gap-2 text-xs uppercase tracking-widest">
          <Settings size={14} className="text-blue-500" />
          Properties
        </h2>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-gray-500 hover:text-white transition-all duration-200 rounded-full p-1.5 focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
            Node Label
          </label>
          <input
            type="text"
            className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium text-gray-300 placeholder:text-gray-600"
            value={selectedNode.data.label}
            onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            placeholder="Enter node name..."
          />
        </div>

        {selectedNode.type === "agentNode" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                System Prompt
              </label>
              <span className="text-[10px] text-blue-500 font-medium">AI Instructions</span>
            </div>
            <textarea
              className="w-full px-4 py-3 bg-[#252525] border border-[#333] rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm leading-relaxed text-gray-300 h-64 resize-none placeholder:text-gray-600 custom-scrollbar"
              placeholder="You are a helpful assistant. Your goal is to..."
              value={selectedNode.data.config?.systemPrompt || ""}
              onChange={(e) => {
                const currentConfig = selectedNode.data.config || {};
                updateNodeData(selectedNode.id, {
                  config: { ...currentConfig, systemPrompt: e.target.value },
                });
              }}
            />
            <p className="text-[11px] text-gray-500 leading-tight">
              Define the persona and behavior rules for this agent.
            </p>
          </div>
        )}

        {selectedNode.type === "triggerNode" && (
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">
              Trigger Method
            </label>
            <div className="relative group">
              <select
                className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-lg shadow-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm appearance-none cursor-pointer font-medium text-gray-300 group-hover:bg-[#2a2a2a]"
                value={selectedNode.data.config?.triggerType || "manual"}
                onChange={(e) => {
                  const currentConfig = selectedNode.data.config || {};
                  updateNodeData(selectedNode.id, {
                    config: { ...currentConfig, triggerType: e.target.value },
                  });
                }}
              >
                <option value="manual">Manual Start</option>
                <option value="chat">Chat (Input)</option>
                <option value="webhook">Webhook (Incoming)</option>
                <option value="schedule">Schedule (Cron)</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 group-hover:text-blue-500 transition-colors">
                <svg
                  width="10"
                  height="6"
                  viewBox="0 0 10 6"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M1 1L5 5L9 1"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
