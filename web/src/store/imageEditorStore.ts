// 图片编辑二级页的打开状态：记录正在编辑哪个图片节点（用于保存后写回对应节点）
import { create } from "zustand";

interface ImageEditorState {
  nodeId: string | null;
  url: string | null;
  open: (nodeId: string, url: string) => void;
  close: () => void;
}

export const useImageEditorStore = create<ImageEditorState>((set) => ({
  nodeId: null,
  url: null,
  open: (nodeId, url) => set({ nodeId, url }),
  close: () => set({ nodeId: null, url: null }),
}));
