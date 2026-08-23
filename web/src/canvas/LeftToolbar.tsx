// 左侧工具栏：对应 TapNow 文档中 "Add button on the left"，点击 + 选择内容类型新建节点
// 弹出的菜单视觉风格与 AddNodeMenu（右键/拖拽连线新建）保持一致：图标方块 + 标题 + 说明
import { useEffect, useState } from "react";
import { useReactFlow } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import { NodeTypeIcon } from "./NodeTypeIcon";
import type { NodeMenuType } from "./AddNodeMenu";

type NodeType = NodeMenuType;

const ITEMS: Array<{ type: NodeType; label: string; desc: string }> = [
  { type: "text", label: "文本", desc: "提示词 / 脚本 / 说明" },
  { type: "image", label: "图片", desc: "宣传图、海报、封面" },
  { type: "video", label: "视频", desc: "视频素材或生成占位" },
  { type: "audio", label: "音频", desc: "音频素材或生成占位" },
];

export function LeftToolbar() {
  const [open, setOpen] = useState(false);
  // 入场动画：打开时先缩小+透明，下一帧放大到 100%，和 AddNodeMenu 的弹出效果保持一致
  const [entered, setEntered] = useState(false);
  const addNode = useCanvasStore((s) => s.addNode);
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    if (!open) {
      setEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [open]);

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
          <div
            className="absolute left-12 top-0 w-60 origin-top-left rounded-2xl border border-panel-border bg-panel p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out"
            style={{
              opacity: entered ? 1 : 0,
              transform: entered ? "scale(1) translateX(0)" : "scale(0.96) translateX(-4px)",
            }}
          >
            <div className="px-2 pb-1.5 pt-1 text-xs font-medium text-text-secondary">添加节点</div>
            <div className="flex flex-col gap-1">
              {ITEMS.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/10"
                  onClick={() => handleAdd(item.type)}
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-panel-border bg-canvas text-text-secondary transition-colors group-hover:border-accent group-hover:text-accent">
                    <NodeTypeIcon type={item.type} className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0">
                    <div className="text-sm text-text-primary">{item.label}</div>
                    <div className="truncate text-[11px] text-text-secondary">{item.desc}</div>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
