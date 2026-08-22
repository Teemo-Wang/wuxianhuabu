// 画布核心状态管理：节点、连线、选中集合，以及持久化到后端的防抖保存
import { create } from "zustand";
import {
  applyNodeChanges,
  applyEdgeChanges,
  addEdge as rfAddEdge,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type Viewport,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import { api } from "../api/client";
import type { AppNodeData } from "../types";

export type AppNode = Node<AppNodeData>;
export type AppEdge = Edge;

interface CanvasState {
  projectId: string | null;
  projectName: string;
  nodes: AppNode[];
  edges: AppEdge[];
  viewport: Viewport;
  loaded: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";

  loadProject: (projectId: string) => Promise<void>;
  resetCanvas: () => void;
  scheduleSave: () => void;

  onNodesChange: (changes: NodeChange<AppNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setViewport: (viewport: Viewport) => void;

  addNode: (node: Omit<AppNode, "id"> & { id?: string }) => AppNode;
  updateNodeData: (id: string, patch: Partial<AppNodeData>) => void;
  removeNodes: (ids: string[]) => void;
  connectNodes: (sourceIds: string[], targetId: string) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export const useCanvasStore = create<CanvasState>((set, get) => ({
  projectId: null,
  projectName: "",
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  loaded: false,
  saveStatus: "idle",

  loadProject: async (projectId) => {
    set({ loaded: false });
    try {
      const project = await api.getProject(projectId);
      set({
        projectId: project.id,
        projectName: project.name,
        nodes: (project.nodes ?? []) as AppNode[],
        edges: (project.edges ?? []) as AppEdge[],
        viewport: project.viewport ?? { x: 0, y: 0, zoom: 1 },
        loaded: true,
      });
    } catch (err) {
      console.error("加载项目画布失败", err);
      set({ loaded: true });
    }
  },

  resetCanvas: () => {
    if (saveTimer) clearTimeout(saveTimer);
    set({
      projectId: null,
      projectName: "",
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      loaded: false,
      saveStatus: "idle",
    });
  },

  scheduleSave: () => {
    if (saveTimer) clearTimeout(saveTimer);
    const projectId = get().projectId;
    if (!projectId) return;
    set({ saveStatus: "saving" });
    saveTimer = setTimeout(async () => {
      const { nodes, edges, viewport } = get();
      try {
        await api.saveProjectCanvas(projectId, { nodes, edges, viewport });
        set({ saveStatus: "saved" });
      } catch (err) {
        console.error("保存画布失败", err);
        set({ saveStatus: "error" });
      }
    }, 800);
  },

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) });
    get().scheduleSave();
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
    get().scheduleSave();
  },

  onConnect: (connection) => {
    set({ edges: rfAddEdge(connection, get().edges) });
    get().scheduleSave();
  },

  setViewport: (viewport) => {
    set({ viewport });
    get().scheduleSave();
  },

  addNode: (node) => {
    const newNode = { ...node, id: node.id ?? nanoid(10) } as AppNode;
    set({ nodes: [...get().nodes, newNode] });
    get().scheduleSave();
    return newNode;
  },

  updateNodeData: (id, patch) => {
    set({
      nodes: get().nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } as AppNodeData } : n
      ),
    });
    get().scheduleSave();
  },

  removeNodes: (ids) => {
    const idSet = new Set(ids);
    set({
      nodes: get().nodes.filter((n) => !idSet.has(n.id)),
      edges: get().edges.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)),
    });
    get().scheduleSave();
  },

  connectNodes: (sourceIds, targetId) => {
    const newEdges: AppEdge[] = sourceIds.map((sourceId) => ({
      id: `e-${sourceId}-${targetId}-${nanoid(6)}`,
      source: sourceId,
      target: targetId,
    }));
    set({ edges: [...get().edges, ...newEdges] });
    get().scheduleSave();
  },
}));
