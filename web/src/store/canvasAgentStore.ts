// 画布 Agent 侧栏状态：开关、对话记录、对话模型配置
import { create } from "zustand";
import { api } from "../api/client";
import { getNodeLabel } from "./agentStore";
import { useAgentStore } from "./agentStore";
import { useCanvasStore } from "./canvasStore";
import { useModelStore } from "./modelStore";

export interface AgentSettings {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface AgentMessage {
  role: "user" | "assistant";
  content: string;
}

interface CanvasAgentState {
  open: boolean;
  messages: AgentMessage[];
  input: string;
  sending: boolean;
  settings: AgentSettings;
  settingsOpen: boolean;
  errorMessage: string | null;

  toggle: () => void;
  setOpen: (open: boolean) => void;
  setInput: (input: string) => void;
  setSettingsOpen: (open: boolean) => void;
  patchSettings: (patch: Partial<AgentSettings>) => void;
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  send: () => Promise<void>;
}

const emptySettings = (): AgentSettings => ({
  baseUrl: "",
  apiKey: "",
  modelName: "gpt-4o-mini",
});

export const useCanvasAgentStore = create<CanvasAgentState>((set, get) => ({
  open: false,
  messages: [],
  input: "",
  sending: false,
  settings: emptySettings(),
  settingsOpen: false,
  errorMessage: null,

  toggle: () => set({ open: !get().open, errorMessage: null }),
  setOpen: (open) => set({ open }),
  setInput: (input) => set({ input }),
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  patchSettings: (patch) => set({ settings: { ...get().settings, ...patch } }),

  loadSettings: async () => {
    try {
      const settings = await api.getAgentSettings();
      set({
        settings,
        settingsOpen: !settings.baseUrl || !settings.apiKey,
      });
    } catch (err) {
      console.error("加载 Agent 配置失败", err);
    }
  },

  saveSettings: async () => {
    const saved = await api.saveAgentSettings(get().settings);
    set({ settings: saved, errorMessage: null, settingsOpen: false });
  },

  send: async () => {
    const text = get().input.trim();
    if (!text || get().sending) return;

    const { settings } = get();
    if (!settings.baseUrl || !settings.apiKey || !settings.modelName) {
      set({ errorMessage: "请先填写对话模型配置", settingsOpen: true });
      return;
    }

    const history = get().messages;
    const userMessage: AgentMessage = { role: "user", content: text };
    set({
      input: "",
      sending: true,
      errorMessage: null,
      messages: [...history, userMessage],
    });

    const canvas = useCanvasStore.getState();
    const models = useModelStore.getState().models;
    const selectedIds = canvas.nodes.filter((n) => n.selected).map((n) => n.id);

    try {
      const result = await api.agentChat({
        message: text,
        history,
        canvas: {
          nodes: canvas.nodes
            .filter((n) => n.type !== "generating")
            .map((n) => ({
              id: n.id,
              kind: (n.data as any).kind ?? n.type ?? "unknown",
              label: getNodeLabel(n),
              selected: Boolean(n.selected),
            })),
          selectedIds,
        },
        models: models.map((m) => ({
          id: m.id,
          name: m.name,
          kind: m.kind,
          outputType: m.outputType ?? "image",
        })),
      });

      set({
        messages: [...get().messages, { role: "assistant", content: result.say }],
      });

      const selected = canvas.nodes.filter((n) => n.selected);
      let nextX = selected[0] ? selected[0].position.x + 280 : canvas.viewport.x * -1 + 200;
      let nextY = selected[0] ? selected[0].position.y : 200;

      for (const action of result.actions ?? []) {
        if (action.op === "add_text" && action.content) {
          useCanvasStore.getState().addNode({
            type: "text",
            position: { x: action.x ?? nextX, y: action.y ?? nextY },
            data: { kind: "text", content: action.content },
          });
          nextX += 40;
          nextY += 40;
        } else if (action.op === "generate" && action.prompt) {
          const modelId =
            action.modelId && models.some((m) => m.id === action.modelId)
              ? action.modelId
              : useModelStore.getState().activeModelId ?? models[0]?.id ?? null;
          const referenceIds =
            action.referenceIds && action.referenceIds.length > 0 ? action.referenceIds : selectedIds;
          await useAgentStore.getState().generate(modelId, {
            prompt: action.prompt,
            referenceIds,
          });
        }
      }
    } catch (err: any) {
      console.error("Agent 对话失败", err);
      set({
        errorMessage: err?.message ?? "Agent 对话失败",
        messages: [
          ...get().messages,
          { role: "assistant", content: `没聊成：${err?.message ?? "未知错误"}` },
        ],
      });
    } finally {
      set({ sending: false });
    }
  },
}));
