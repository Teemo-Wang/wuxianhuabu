// ComfyUI 工作流输入/输出槎位的可复用编辑表格：被节点配置弹窗和工作流库管理弹窗共用，
// 避免在两处重复维护同一套「增删改查槎位行」的表单逻辑
import { nanoid } from "nanoid";
import type { ComfyWorkflowIOSlot } from "../types";

interface Props {
  title: string;
  addLabel: string;
  slots: ComfyWorkflowIOSlot[];
  onChange: (slots: ComfyWorkflowIOSlot[]) => void;
  /** 输入槎位需要"字段名"这一列，输出槎位不需要 */
  showField: boolean;
}

export function ComfyWorkflowSlotsEditor({ title, addLabel, slots, onChange, showField }: Props) {
  const addSlot = () => {
    onChange([
      ...slots,
      { id: nanoid(6), label: "", nodeId: "", field: showField ? "" : undefined, type: "text" },
    ]);
  };

  const updateSlot = (idx: number, patch: Partial<ComfyWorkflowIOSlot>) => {
    onChange(slots.map((slot, i) => (i === idx ? { ...slot, ...patch } : slot)));
  };

  const removeSlot = (idx: number) => {
    onChange(slots.filter((_, i) => i !== idx));
  };

  const gridCols = showField ? "grid-cols-[1fr_1fr_1fr_auto_auto]" : "grid-cols-[1fr_1fr_auto]";

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
        <span>{title}</span>
        <button
          type="button"
          className="rounded-md border border-panel-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
          onClick={addSlot}
        >
          {addLabel}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {slots.map((slot, idx) => (
          <div key={slot.id} className={`grid ${gridCols} gap-1.5`}>
            <input
              className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
              placeholder="显示名称"
              value={slot.label}
              onChange={(e) => updateSlot(idx, { label: e.target.value })}
            />
            <input
              className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
              placeholder={showField ? "节点 ID" : "节点 ID（如 SaveImage）"}
              value={slot.nodeId}
              onChange={(e) => updateSlot(idx, { nodeId: e.target.value })}
            />
            {showField && (
              <input
                className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
                placeholder="字段名"
                value={slot.field ?? ""}
                onChange={(e) => updateSlot(idx, { field: e.target.value })}
              />
            )}
            {showField && (
              <select
                className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary"
                value={slot.type}
                onChange={(e) => updateSlot(idx, { type: e.target.value as "text" | "image" })}
              >
                <option value="text">文本</option>
                <option value="image">图片</option>
              </select>
            )}
            <button
              type="button"
              className="rounded-md border border-panel-border px-2 text-xs text-red-400 hover:border-red-400"
              onClick={() => removeSlot(idx)}
            >
              删除
            </button>
          </div>
        ))}
        {slots.length === 0 && (
          <p className="text-[11px] text-text-secondary">暂无槎位，可点击「{addLabel}」新建</p>
        )}
      </div>
    </div>
  );
}
