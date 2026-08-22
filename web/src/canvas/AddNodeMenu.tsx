// 右键 / 双击画布空白区域弹出的新增节点菜单，也用于「拖拽连线到空白处松手」后的节点选择
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
  onSelect: (type: "text" | "image") => void;
  onClose: () => void;
}

const ITEMS: Array<{ type: "text" | "image"; label: string; desc: string }> = [
  { type: "text", label: "文本节点", desc: "记录提示词 / 脚本 / 说明" },
  { type: "image", label: "图片节点", desc: "上传图片或作为生成结果占位" },
];

export function AddNodeMenu({ state, onSelect, onClose }: Props) {
  return (
    <>
      {/* 透明遮罩用于点击空白处关闭菜单 */}
      <div className="fixed inset-0 z-40" onClick={onClose} onContextMenu={(e) => e.preventDefault()} />
      <div
        className="fixed z-50 w-48 rounded-lg border border-panel-border bg-panel p-1.5 shadow-xl"
        style={{ left: state.screenX, top: state.screenY }}
      >
        <div className="px-2 py-1 text-[11px] text-text-secondary">新建节点</div>
        {ITEMS.map((item) => (
          <button
            key={item.type}
            type="button"
            className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-accent/10"
            onClick={() => onSelect(item.type)}
          >
            <span>
              <div className="text-sm text-text-primary">{item.label}</div>
              <div className="text-[11px] text-text-secondary">{item.desc}</div>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}
