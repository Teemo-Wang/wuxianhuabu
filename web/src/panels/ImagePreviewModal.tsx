// 图片大图预览对话框：使用 object-contain 保证完整展示原图比例，不裁剪
import { useImagePreviewStore } from "../store/imagePreviewStore";

export function ImagePreviewModal() {
  const url = useImagePreviewStore((s) => s.url);
  const close = useImagePreviewStore((s) => s.close);

  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-8"
      onClick={close}
    >
      <button
        type="button"
        className="absolute right-6 top-6 rounded-full border border-panel-border bg-panel px-3 py-1.5 text-sm text-text-primary hover:border-accent hover:text-accent"
        onClick={close}
      >
        关闭
      </button>
      <img
        src={url}
        alt=""
        className="max-h-full max-w-full rounded-lg object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
    </div>
  );
}
