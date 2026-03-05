"use client";

import React, { useCallback } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  Node,
} from "@xyflow/react";
import { Play } from "lucide-react";
import "@xyflow/react/dist/style.css";
import { useBuilderStore, AppNode } from "@/lib/store";
import { Sidebar } from "./Sidebar";
import { PropertiesPanel } from "./PropertiesPanel";
import { AgentNode, TriggerNode, ActionNode } from "./CustomNodes";

const nodeTypes = {
  agentNode: AgentNode,
  triggerNode: TriggerNode,
  actionNode: ActionNode,
};

import { TestPanel } from "./TestPanel";

const BuilderCanvasContent = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect, addNode, setSelectedNode } =
    useBuilderStore();

  const [isTestPanelOpen, setIsTestPanelOpen] = React.useState(false);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/label");

      if (typeof type === "undefined" || !type) {
        return;
      }

      const position = {
        x: event.clientX - 250,
        y: event.clientY - 50,
      };

      const newNode: AppNode = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: { label: label },
      };

      addNode(newNode);
    },
    [addNode],
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node as AppNode);
    },
    [setSelectedNode],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="fixed inset-0 z-[100] flex w-full h-full bg-[#121212] text-gray-200 font-sans overflow-hidden">
      <Sidebar />
      <div className="flex-1 h-full relative" onDrop={onDrop} onDragOver={onDragOver}>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          {!isTestPanelOpen && (
            <button
              onClick={() => setIsTestPanelOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-all flex items-center gap-2 border border-blue-500/50"
            >
              <Play size={16} fill="currentColor" />
              Test Agent
            </button>
          )}
          <Controls className="bg-[#1e1e1e] border-[#333] [&>button]:fill-gray-400 [&>button:hover]:fill-white" />
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          fitView
          colorMode="dark"
        >
          <Background color="#333" gap={20} />
          <MiniMap style={{ backgroundColor: '#1e1e1e' }} nodeColor={() => '#333'} maskColor="rgba(0,0,0,0.6)" />
        </ReactFlow>
      </div>
      <PropertiesPanel />
    </div>
  );
};

export const BuilderCanvas = () => {
  return (
    <ReactFlowProvider>
      <BuilderCanvasContent />
    </ReactFlowProvider>
  );
};
