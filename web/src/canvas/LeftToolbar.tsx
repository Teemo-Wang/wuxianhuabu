// 左侧工具栏：对应 TapNow 文档中 "Add button on the left"，点击 + 选择内容类型新建节点
import { useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";

type NodeType = "text" | "image" | "video" | "audio";

const ITEMS: Array<{ type: NodeType; label: string }> = [
  { type: "text", label: "文本" },
  { type: "image", label: "图片" },
  { type: "video", label: "视频" },
  { type: "audio", label: "音频" },
];

export function LeftToolbar() {
  const [open, setOpen] = useState(false);
  const addNode = useCanvasStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();

  const handleAdd = (type: NodeType) => {
    // 新节点放置在当前视口中心附近
    const center = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    if (type === "text") {
      addNode({ type: "text", position: center, data: { kind: "text", content: "" } });
    } else if (type === "image") {
      addNode({ type: "image", position: center, data: { kind: "image", url: "" } });
    } else if (type === "video") {
      addNode({ type: "video", position: center, data: { kind: "video", url: "" } });
    } else {
      addNode({ type: "audio", position: center, data: { kind: "audio", url: "" } });
    }
    setOpen(false);
  };

  return (
    <div className="absolute left-4 top-4 z-30 flex flex-col items-start gap-1">
      <div className="relative">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-panel-border bg-panel text-lg text-text-primary shadow-lg transition-colors hover:border-accent hover:text-accent"
          onClick={() => setOpen((v) => !v)}
          title="新增节点"
        >
          +
        </button>
        {open && (
          <div className="absolute left-12 top-0 flex flex-col gap-1 rounded-lg border border-panel-border bg-panel p-1.5 shadow-xl">
            {ITEMS.map((item) => (
              <button
                key={item.type}
                type="button"
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-text-primary hover:bg-accent/10"
                onClick={() => handleAdd(item.type)}
              >
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
