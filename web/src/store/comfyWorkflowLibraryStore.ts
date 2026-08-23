// ComfyUI 工作流库状态管理：保存好的工作流配置，可在任意工作流节点里直接加载复用
import { create } from "zustand";
import { api } from "../api/client";
import type { ComfyWorkflowEntry } from "../types";

interface ComfyWorkflowLibraryState {
  workflows: ComfyWorkflowEntry[];
  loaded: boolean;

  loadWorkflows: () => Promise<void>;
  createWorkflow: (entry: Omit<ComfyWorkflowEntry, "id" | "createdAt" | "updatedAt">) => Promise<ComfyWorkflowEntry>;
  updateWorkflow: (
    id: string,
    patch: Partial<Omit<ComfyWorkflowEntry, "id" | "createdAt" | "updatedAt">>
  ) => Promise<ComfyWorkflowEntry>;
  deleteWorkflow: (id: string) => Promise<void>;
}

export const useComfyWorkflowLibraryStore = create<ComfyWorkflowLibraryState>((set, get) => ({
  workflows: [],
  loaded: false,

  loadWorkflows: async () => {
    try {
      const workflows = await api.listComfyWorkflows();
      set({ workflows, loaded: true });
    } catch (err) {
      console.error("加载 ComfyUI 工作流库失败", err);
      set({ loaded: true });
    }
  },

  createWorkflow: async (entry) => {
    const created = await api.createComfyWorkflow(entry);
    set({ workflows: [...get().workflows, created] });
    return created;
  },

  updateWorkflow: async (id, patch) => {
    const updated = await api.updateComfyWorkflow(id, patch);
    set({ workflows: get().workflows.map((w) => (w.id === id ? updated : w)) });
    return updated;
  },

  deleteWorkflow: async (id) => {
    await api.deleteComfyWorkflow(id);
    set({ workflows: get().workflows.filter((w) => w.id !== id) });
  },
}));
