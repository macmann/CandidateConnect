import React from "react";
import { Bot, Zap, Play, Box } from "lucide-react";

export const Sidebar = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-64 bg-[#1e1e1e] border-r border-[#333] flex flex-col h-full z-20 shadow-xl">
      <div className="p-5 border-b border-[#333]">
        <h2 className="text-lg font-bold text-white tracking-tight">Components</h2>
        <p className="text-xs text-gray-500 mt-1">Drag and drop to build</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">
            Triggers
          </h3>
          <div
            className="flex items-center gap-3 p-3 bg-[#252525] border border-[#333] rounded-xl cursor-grab hover:border-blue-500/50 hover:bg-[#2a2a2a] transition-all group"
            draggable
            onDragStart={(event) => onDragStart(event, "triggerNode", "Start")}
          >
            <div className="bg-green-500/10 p-2 rounded-lg text-green-500 group-hover:scale-110 transition-transform">
              <Play size={18} />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-200 block">Start Trigger</span>
              <span className="text-[10px] text-gray-500">Initiates the flow</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">
            Agents
          </h3>
          <div
            className="flex items-center gap-3 p-3 bg-[#252525] border border-[#333] rounded-xl cursor-grab hover:border-blue-500/50 hover:bg-[#2a2a2a] transition-all mb-2 group"
            draggable
            onDragStart={(event) => onDragStart(event, "agentNode", "AI Agent")}
          >
            <div className="bg-blue-500/10 p-2 rounded-lg text-blue-500 group-hover:scale-110 transition-transform">
              <Bot size={18} />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-200 block">AI Agent</span>
              <span className="text-[10px] text-gray-500">Generative AI model</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 pl-1">
            Tools
          </h3>
          <div
            className="flex items-center gap-3 p-3 bg-[#252525] border border-[#333] rounded-xl cursor-grab hover:border-blue-500/50 hover:bg-[#2a2a2a] transition-all group"
            draggable
            onDragStart={(event) => onDragStart(event, "actionNode", "Action")}
          >
            <div className="bg-orange-500/10 p-2 rounded-lg text-orange-500 group-hover:scale-110 transition-transform">
              <Zap size={18} />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-200 block">Action</span>
              <span className="text-[10px] text-gray-500">External tools</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-[#333] text-[10px] text-gray-600 text-center">
        Agentic Builder v1.0
      </div>
    </aside>
  );
};
