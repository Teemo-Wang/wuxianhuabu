// Skill 库状态管理：预设好的一整套 Markdown 提示词模板（文生图模板 / 图片反推 / 图转视频提示词等），
// 供 Skill 节点选择加载
import { create } from "zustand";
import { api } from "../api/client";
import type { SkillEntry } from "../types";

interface SkillState {
  skills: SkillEntry[];
  loaded: boolean;

  loadSkills: () => Promise<void>;
  createSkill: (name: string, content: string) => Promise<SkillEntry>;
  updateSkill: (id: string, patch: Partial<Pick<SkillEntry, "name" | "content">>) => Promise<SkillEntry>;
  deleteSkill: (id: string) => Promise<void>;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  skills: [],
  loaded: false,

  loadSkills: async () => {
    try {
      const skills = await api.listSkills();
      set({ skills, loaded: true });
    } catch (err) {
      console.error("加载 Skill 库失败", err);
      set({ loaded: true });
    }
  },

  createSkill: async (name, content) => {
    const skill = await api.createSkill(name, content);
    set({ skills: [...get().skills, skill] });
    return skill;
  },

  updateSkill: async (id, patch) => {
    const updated = await api.updateSkill(id, patch);
    set({ skills: get().skills.map((s) => (s.id === id ? updated : s)) });
    return updated;
  },

  deleteSkill: async (id) => {
    await api.deleteSkill(id);
    set({ skills: get().skills.filter((s) => s.id !== id) });
  },
}));
