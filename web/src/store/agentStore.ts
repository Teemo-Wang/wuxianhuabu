// 生成面板（Agent 面板）状态管理：引用节点、提示词、选中模型、生成流程
import { create } from "zustand";
import { api } from "../api/client";
import { useCanvasStore, type AppNode } from "./canvasStore";
import type { AppNodeData, ImageNodeData, TextNodeData } from "../types";

/** 生成一个节点在 @ 引用列表 / 提示词 token 中展示的简短标签 */
export function getNodeLabel(node: AppNode): string {
  const data = node.data as AppNodeData;
  if (data.kind === "text") {
    const text = (data as TextNodeData).content.trim();
    return text ? (text.length > 8 ? `${text.slice(0, 8)}…` : text) : "文本节点";
  }
  if (data.kind === "image") {
    return (data as ImageNodeData).generated ? "生成图片" : "图片";
  }
  if (data.kind === "video") return "视频";
  if (data.kind === "audio") return "音频";
  if (data.kind === "skill") return (data as any).name || "Skill";
  if (data.kind === "comfy-workflow") return (data as any).name || "ComfyUI 工作流";
  return "生成中";
}

interface AgentState {
  referenceIds: string[];
  prompt: string;
  generating: boolean;
  errorMessage: string | null;

  /** 与画布当前选中的节点集合同步引用列表（选中节点变化时调用），不会清空用户手动追加的引用之外的历史输入 */
  syncSelection: (selectedIds: string[]) => void;
  addReference: (id: string) => void;
  removeReference: (id: string) => void;
  setPrompt: (prompt: string) => void;
  generate: (modelId: string | null) => Promise<void>;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  referenceIds: [],
  prompt: "",
  generating: false,
  errorMessage: null,

  syncSelection: (selectedIds) => {
    // 直接以当前选中集合覆盖引用列表：这样切换选区时输入条总是聚焦在“当前选中的节点”上，
    // 用户仍可以在条上通过「+ 添加引用」追加更多非选中节点
    const current = get().referenceIds;
    const same =
      current.length === selectedIds.length && current.every((id) => selectedIds.includes(id));
    if (same) return;
    set({ referenceIds: selectedIds, errorMessage: null });
  },

  addReference: (id) => {
    if (get().referenceIds.includes(id)) return;
    set({ referenceIds: [...get().referenceIds, id] });
  },
  removeReference: (id) => set({ referenceIds: get().referenceIds.filter((r) => r !== id) }),
  setPrompt: (prompt) => set({ prompt }),

  generate: async (modelId) => {
    if (!modelId) {
      set({ errorMessage: "请先选择一个模型" });
      return;
    }
    const canvas = useCanvasStore.getState();
    const refNodes = get()
      .referenceIds.map((id) => canvas.nodes.find((n) => n.id === id))
      .filter((n): n is AppNode => Boolean(n));

    const images = refNodes
      .filter((n) => (n.data as AppNodeData).kind === "image")
      .map((n) => (n.data as ImageNodeData).url);

    // 文本节点和 Skill 节点都贡献纯文本内容拼接进最终 prompt
    const textFromRefs = refNodes
      .filter((n) => ["text", "skill"].includes((n.data as AppNodeData).kind))
      .map((n) => {
        const nd = n.data as AppNodeData;
        return nd.kind === "text" ? (nd as TextNodeData).content : (nd as any).content;
      })
      .filter(Boolean)
      .join("\n");

    const finalPrompt = [textFromRefs, get().prompt].filter((s) => s && s.trim()).join("\n");

    if (!finalPrompt.trim() && images.length === 0) {
      set({ errorMessage: "请输入提示词或至少引用一张图片" });
      return;
    }

    set({ generating: true, errorMessage: null });

    // 计算新节点的落点：引用节点最右侧位置的右侧，若无引用则放在视口中心附近
    const anchorX =
      refNodes.length > 0 ? Math.max(...refNodes.map((n) => n.position.x + 260)) : 400;
    const anchorY =
      refNodes.length > 0
        ? refNodes.reduce((sum, n) => sum + n.position.y, 0) / refNodes.length
        : 200;

    const placeholder = canvas.addNode({
      type: "generating",
      position: { x: anchorX, y: anchorY },
      data: { kind: "generating", prompt: finalPrompt },
    });
    if (get().referenceIds.length > 0) {
      canvas.connectNodes(get().referenceIds, placeholder.id);
    }

    try {
      const result = await api.generate({ modelId, prompt: finalPrompt, images });
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) =>
          n.id === placeholder.id
            ? {
                ...n,
                type: "image",
                data: { kind: "image", url: result.imageUrl, generated: true, sourcePrompt: finalPrompt },
              }
            : n
        ),
      });
      useCanvasStore.getState().scheduleSave();
      set({ generating: false, prompt: "", referenceIds: [] });
    } catch (err: any) {
      console.error("生成失败", err);
      useCanvasStore.setState({
        nodes: useCanvasStore.getState().nodes.map((n) =>
          n.id === placeholder.id
            ? { ...n, type: "text", data: { kind: "text", content: `⚠️ 生成失败：${err?.message ?? err}` } }
            : n
        ),
      });
      useCanvasStore.getState().scheduleSave();
      set({ generating: false, errorMessage: err?.message ?? "生成失败" });
    }
  },
}));
