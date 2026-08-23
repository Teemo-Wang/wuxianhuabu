// 右键 / 双击画布空白区域弹出的新增节点菜单，也用于「拖拽连线到空白处松手」后的节点选择
// 视觉上参考主流节点画布工具的「添加节点」面板：左侧图标方块 + 标题 + 说明文字，整体卡片带入场动画
import { useEffect, useState } from "react";
import { NodeTypeIcon } from "./NodeTypeIcon";

export type NodeMenuType = "text" | "image" | "video" | "audio" | "comfy-workflow" | "skill";

export interface AddNodeMenuState {
  screenX: number;
  screenY: number;
  flowX: number;
  flowY: number;
  /** 如果这次弹出菜单是因为从某个节点拖拽连线到空白处触发的，这里记录连线起点节点 id，选择节点类型后会自动连线 */
  connectFromId?: string;
}

interface Props {
  state: AddNodeMenuState;
  onSelect: (type: NodeMenuType) => void;
  onClose: () => void;
}

// PART1：基础素材节点
const PART1_ITEMS: Array<{ type: NodeMenuType; label: string; desc: string }> = [
  { type: "text", label: "文本", desc: "提示词 / 脚本 / 说明" },
  { type: "image", label: "图片", desc: "宣传图、海报、封面" },
  { type: "video", label: "视频", desc: "上传视频素材或生成结果占位" },
  { type: "audio", label: "音频", desc: "上传音频素材或生成结果占位" },
];

// PART2：进阶节点，接入 ComfyUI 工作流 / 预设 Skill 提示词模板
const PART2_ITEMS: Array<{ type: NodeMenuType; label: string; desc: string }> = [
  { type: "comfy-workflow", label: "ComfyUI 工作流", desc: "绑定一份 workflow，按输入输出槎位显示连接点" },
  { type: "skill", label: "Skill", desc: "预设好的一整套提示词模板（.md）" },
];

const MENU_WIDTH = 260;

export function AddNodeMenu({ state, onSelect, onClose }: Props) {
  // 入场动画：挂载时先是缩小+透明，下一帧再放大到 100%，配合 transition 产生一个轻微的弹出感
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // 避免菜单超出右侧视口：如果剩余宽度不够，就往左展开
  const shouldFlipLeft =
    typeof window !== "undefined" && state.screenX + MENU_WIDTH + 16 > window.innerWidth;
  const left = shouldFlipLeft ? state.screenX - MENU_WIDTH : state.screenX;

  return (
    <>
      {/* 透明遮罩用于点击空白处关闭菜单 */}
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="fixed z-50 origin-top-left select-none rounded-2xl border border-panel-border bg-panel p-2 shadow-2xl transition-[opacity,transform] duration-150 ease-out"
        style={{
          left,
          top: state.screenY,
          width: MENU_WIDTH,
          opacity: entered ? 1 : 0,
          transform: entered ? "scale(1) translateY(0)" : "scale(0.96) translateY(-4px)",
        }}
      >
        <div className="px-2 pb-1.5 pt-1 text-xs font-medium text-text-secondary">添加节点</div>
        <div className="flex flex-col gap-1">
          {PART1_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/10"
              onClick={() => onSelect(item.type)}
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

        <div className="my-1.5 border-t border-panel-border" />

        <div className="flex flex-col gap-1">
          {PART2_ITEMS.map((item) => (
            <button
              key={item.type}
              type="button"
              className="group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-accent/10"
              onClick={() => onSelect(item.type)}
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
    </>
  );
}
