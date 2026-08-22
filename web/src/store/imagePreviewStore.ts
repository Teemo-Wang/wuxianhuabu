// 图片大图预览状态：点击画布上任意图片节点的缩略图后，弹出对话框展示完整原图
import { create } from "zustand";

interface ImagePreviewState {
  url: string | null;
  open: (url: string) => void;
  close: () => void;
}

export const useImagePreviewStore = create<ImagePreviewState>((set) => ({
  url: null,
  open: (url) => set({ url }),
  close: () => set({ url: null }),
}));
