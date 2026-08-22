// 选中节点后浮现的操作条：对应 TapNow "select several nodes and give them to Agent together"
import { useCanvasStore } from "../store/canvasStore";
import { useAgentStore } from "../store/agentStore";

export function SelectionActionBar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const removeNodes = useCanvasStore((s) => s.removeNodes);
  const openAgentPanel = useAgentStore((s) => s.openPanel);

  const selected = nodes.filter((n) => n.selected && n.type !== "generating");
  if (selected.length === 0) return null;

  return (
    <div className="absolute bottom-6 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 rounded-full border border-panel-border bg-panel px-3 py-2 shadow-xl">
      <span className="px-1 text-xs text-text-secondary">已选中 {selected.length} 个节点</span>
      <button
        type="button"
        className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-fg hover:opacity-90"
        onClick={() => openAgentPanel(selected.map((n) => n.id))}
      >
        交给 Agent
      </button>
      <button
        type="button"
        className="rounded-full border border-panel-border px-3 py-1 text-xs text-text-secondary hover:border-red-400 hover:text-red-400"
        onClick={() => removeNodes(selected.map((n) => n.id))}
      >
        删除
      </button>
    </div>
  );
}
