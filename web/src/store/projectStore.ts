// 首页项目列表状态管理：加载/新建/重命名/删除项目
import { create } from "zustand";
import { api } from "../api/client";
import type { ProjectSummary } from "../types";

interface ProjectState {
  projects: ProjectSummary[];
  loaded: boolean;

  loadProjects: () => Promise<void>;
  createProject: (name?: string) => Promise<ProjectSummary>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  loaded: false,

  loadProjects: async () => {
    try {
      const projects = await api.listProjects();
      set({ projects, loaded: true });
    } catch (err) {
      console.error("加载项目列表失败", err);
      set({ loaded: true });
    }
  },

  createProject: async (name) => {
    const project = await api.createProject(name);
    set({ projects: [project, ...get().projects] });
    return project;
  },

  renameProject: async (id, name) => {
    const updated = await api.renameProject(id, name);
    set({ projects: get().projects.map((p) => (p.id === id ? updated : p)) });
  },

  deleteProject: async (id) => {
    await api.deleteProject(id);
    set({ projects: get().projects.filter((p) => p.id !== id) });
  },
}));
