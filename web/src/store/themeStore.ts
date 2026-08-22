// 主题状态管理：把颜色变量写入 document.documentElement，并持久化到后端
import { create } from "zustand";
import { api } from "../api/client";
import type { ThemeConfig } from "../types";

/** 主题 CSS 变量名字面量联合类型，避免 keyof 索引签名导致类型退化为 string | number */
export type ThemeVarKey =
  | "--color-canvas-bg"
  | "--color-panel-bg"
  | "--color-panel-border"
  | "--color-accent"
  | "--color-accent-fg"
  | "--color-node-bg"
  | "--color-node-border"
  | "--color-text-primary"
  | "--color-text-secondary"
  | "--radius-node";

export const DEFAULT_THEME: ThemeConfig = {
  "--color-canvas-bg": "#0f1115",
  "--color-panel-bg": "#17191f",
  "--color-panel-border": "#2a2d36",
  "--color-accent": "#6366f1",
  "--color-accent-fg": "#ffffff",
  "--color-node-bg": "#1c1f26",
  "--color-node-border": "#33363f",
  "--color-text-primary": "#e7e9ee",
  "--color-text-secondary": "#9aa0ac",
  "--radius-node": "12px",
};

/** 主题变量的中文标签与分组，用于在设置面板中友好展示 */
export const THEME_FIELDS: Array<{ key: ThemeVarKey; label: string; type: "color" | "text" }> = [
  { key: "--color-canvas-bg", label: "画布背景", type: "color" },
  { key: "--color-panel-bg", label: "面板背景", type: "color" },
  { key: "--color-panel-border", label: "面板边框", type: "color" },
  { key: "--color-accent", label: "主色/强调色", type: "color" },
  { key: "--color-accent-fg", label: "主色上的文字", type: "color" },
  { key: "--color-node-bg", label: "节点背景", type: "color" },
  { key: "--color-node-border", label: "节点边框", type: "color" },
  { key: "--color-text-primary", label: "主要文字", type: "color" },
  { key: "--color-text-secondary", label: "次要文字", type: "color" },
  { key: "--radius-node", label: "节点圆角", type: "text" },
];

function applyThemeToDom(theme: ThemeConfig) {
  const root = document.documentElement;
  Object.entries(theme).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

interface ThemeState {
  theme: ThemeConfig;
  loaded: boolean;
  loadTheme: () => Promise<void>;
  setThemeValue: (key: string, value: string) => void;
  resetTheme: () => void;
  persist: () => Promise<void>;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: DEFAULT_THEME,
  loaded: false,

  loadTheme: async () => {
    // 先应用本地缓存，避免刷新时闪烁默认色
    const cached = localStorage.getItem("ncs-theme");
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ThemeConfig;
        applyThemeToDom(parsed);
        set({ theme: { ...DEFAULT_THEME, ...parsed } });
      } catch {
        /* 忽略缓存解析失败 */
      }
    } else {
      applyThemeToDom(DEFAULT_THEME);
    }

    try {
      const remote = await api.getTheme();
      if (Object.keys(remote).length > 0) {
        const merged = { ...DEFAULT_THEME, ...remote };
        applyThemeToDom(merged);
        set({ theme: merged, loaded: true });
        localStorage.setItem("ncs-theme", JSON.stringify(merged));
        return;
      }
    } catch (err) {
      console.error("加载主题配置失败，使用本地缓存/默认值", err);
    }
    set({ loaded: true });
  },

  setThemeValue: (key, value) => {
    const next = { ...get().theme, [key]: value };
    applyThemeToDom(next);
    set({ theme: next });
    localStorage.setItem("ncs-theme", JSON.stringify(next));
    void get().persist();
  },

  resetTheme: () => {
    applyThemeToDom(DEFAULT_THEME);
    set({ theme: DEFAULT_THEME });
    localStorage.setItem("ncs-theme", JSON.stringify(DEFAULT_THEME));
    void get().persist();
  },

  persist: async () => {
    try {
      await api.saveTheme(get().theme);
    } catch (err) {
      console.error("同步主题配置到服务端失败", err);
    }
  },
}));
