import { create } from "zustand";
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
} from "@xyflow/react";

export type NodeData = {
  label: string;
  config?: any;
};

export type AppNode = Node<NodeData>;

interface BuilderState {
  nodes: AppNode[];
  edges: Edge[];
  selectedNode: AppNode | null;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  setSelectedNode: (node: AppNode | null) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  addNode: (node: AppNode) => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNode: null,
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes) as AppNode[],
    });
  },
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  onConnect: (connection: Connection) => {
    set({
      edges: addEdge(connection, get().edges),
    });
  },
  setSelectedNode: (node) => {
    set({ selectedNode: node });
  },
  updateNodeData: (id, data) => {
    const { nodes, selectedNode } = get();
    const newNodes = nodes.map((node) => {
      if (node.id === id) {
        return {
          ...node,
          data: { ...node.data, ...data },
        };
      }
      return node;
    });

    set({ nodes: newNodes });

    if (selectedNode && selectedNode.id === id) {
      set({ selectedNode: newNodes.find((n) => n.id === id) || null });
    }
  },
  addNode: (node) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
}));
