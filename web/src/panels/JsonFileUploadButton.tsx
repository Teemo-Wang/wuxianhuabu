// 通用的「上传 JSON 文件」按钮：选择本地 .json 文件后读取文本内容回调出去，
// 用于替代手动粘贴 ComfyUI workflow JSON 的繁琐操作。纯前端读取，不经过后端。
import { useRef, useState } from "react";

interface Props {
  onLoaded: (text: string) => void;
  className?: string;
}

export function JsonFileUploadButton({ onLoaded, className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      // 仅做基本校验：确认是合法 JSON，避免把无关文件内容当作 workflow 塞进文本框
      JSON.parse(text);
      onLoaded(text);
    } catch {
      setError("文件内容不是合法 JSON，请检查后重新上传");
    }
  };

  return (
    <span className="inline-flex items-center gap-1.5">
      <button
        type="button"
        className={
          className ??
          "rounded-md border border-panel-border px-1.5 py-0.5 text-[11px] text-text-secondary hover:border-accent hover:text-accent"
        }
        onClick={() => inputRef.current?.click()}
      >
        上传 JSON 文件
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </span>
  );
}
