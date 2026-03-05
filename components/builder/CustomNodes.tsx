import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Bot, Play, Zap, Settings } from "lucide-react";

const NodeWrapper = ({ children, selected, title, icon: Icon, colorClass }: any) => (
  <div
    className={`shadow-lg rounded-xl bg-white border-2 min-w-[200px] transition-all ${selected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-100 hover:border-gray-300"}`}
  >
    <div
      className={`p-3 border-b border-gray-100 rounded-t-xl flex items-center gap-2 ${colorClass}`}
    >
      <div className="bg-white/90 p-1 rounded shadow-sm text-current">
        <Icon size={14} />
      </div>
      <span className="font-semibold text-sm">{title}</span>
    </div>
    <div className="p-3 bg-gray-50/50 rounded-b-xl">{children}</div>
  </div>
);

export const AgentNode = memo(({ data, selected }: NodeProps) => {
  return (
    <NodeWrapper
      selected={selected}
      title={data.label || "AI Agent"}
      icon={Bot}
      colorClass="bg-blue-50 text-blue-600"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
      <div className="text-xs text-gray-500">Configured to handle tasks...</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500 border-2 border-white"
      />
    </NodeWrapper>
  );
});

export const TriggerNode = memo(({ data, selected }: NodeProps) => {
  return (
    <NodeWrapper
      selected={selected}
      title={data.label || "Start"}
      icon={Play}
      colorClass="bg-green-50 text-green-600"
    >
      <div className="text-xs text-gray-500">Parameters: {JSON.stringify(data.config || {})}</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-green-500 border-2 border-white"
      />
    </NodeWrapper>
  );
});

export const ActionNode = memo(({ data, selected }: NodeProps) => {
  return (
    <NodeWrapper
      selected={selected}
      title={data.label || "Action"}
      icon={Zap}
      colorClass="bg-orange-50 text-orange-600"
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-orange-500 border-2 border-white"
      />
      <div className="text-xs text-gray-500">Performs a specific action.</div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-orange-500 border-2 border-white"
      />
    </NodeWrapper>
  );
});
