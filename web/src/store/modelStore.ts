// 模型配置状态管理：拉取/新增/编辑/删除模型（自定义 API 或 ComfyUI）
import { create } from "zustand";
import { api } from "../api/client";
import type { ModelConfig, ModelConfigInput } from "../types";

interface ModelState {
  models: ModelConfig[];
  loaded: boolean;
  activeModelId: string | null;

  loadModels: () => Promise<void>;
  createModel: (model: ModelConfigInput) => Promise<ModelConfig>;
  updateModel: (id: string, patch: Partial<ModelConfig>) => Promise<void>;
  deleteModel: (id: string) => Promise<void>;
  setActiveModel: (id: string | null) => void;
}

export const useModelStore = create<ModelState>((set, get) => ({
  models: [],
  loaded: false,
  activeModelId: null,

  loadModels: async () => {
    try {
      const models = await api.listModels();
      set({ models, loaded: true });
      if (!get().activeModelId && models.length > 0) {
        set({ activeModelId: models[0].id });
      }
    } catch (err) {
      console.error("加载模型列表失败", err);
      set({ loaded: true });
    }
  },

  createModel: async (model) => {
    const created = await api.createModel(model);
    set({ models: [...get().models, created], activeModelId: created.id });
    return created;
  },

  updateModel: async (id, patch) => {
    const updated = await api.updateModel(id, patch);
    set({ models: get().models.map((m) => (m.id === id ? updated : m)) });
  },

  deleteModel: async (id) => {
    await api.deleteModel(id);
    const models = get().models.filter((m) => m.id !== id);
    set({
      models,
      activeModelId: get().activeModelId === id ? models[0]?.id ?? null : get().activeModelId,
    });
  },

  setActiveModel: (id) => set({ activeModelId: id }),
}));
