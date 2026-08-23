// ComfyUI 工作流节点的配置弹窗：填写服务地址、粘贴 workflow JSON、
// 并手动配置任意数量的输入/输出槎位（每个槎位对应画布节点上的一个 Handle）
import { useState } from "react";
import { nanoid } from "nanoid";
import type { ComfyWorkflowIOSlot, ComfyWorkflowNodeData } from "../types";

interface Props {
  data: ComfyWorkflowNodeData;
  onSave: (patch: Partial<ComfyWorkflowNodeData>) => void;
  onClose: () => void;
}

function emptyInputSlot(): ComfyWorkflowIOSlot {
  return { id: nanoid(6), label: "", nodeId: "", field: "", type: "text" };
}

function emptyOutputSlot(): ComfyWorkflowIOSlot {
  return { id: nanoid(6), label: "", nodeId: "", type: "image" };
}

export function ComfyWorkflowConfigModal({ data, onSave, onClose }: Props) {
  const [name, setName] = useState(data.name || "");
  const [baseUrl, setBaseUrl] = useState(data.baseUrl || "http://127.0.0.1:8188");
  const [workflowText, setWorkflowText] = useState(
    data.workflow && Object.keys(data.workflow).length > 0 ? JSON.stringify(data.workflow, null, 2) : ""
  );
  const [inputs, setInputs] = useState<ComfyWorkflowIOSlot[]>(data.inputs?.length ? data.inputs : []);
  const [outputs, setOutputs] = useState<ComfyWorkflowIOSlot[]>(data.outputs?.length ? data.outputs : []);
  const [error, setError] = useState<string | null>(null);

  const updateInput = (idx: number, patch: Partial<ComfyWorkflowIOSlot>) => {
    setInputs((prev) => prev.map((slot, i) => (i === idx ? { ...slot, ...patch } : slot)));
  };
  const updateOutput = (idx: number, patch: Partial<ComfyWorkflowIOSlot>) => {
    setOutputs((prev) => prev.map((slot, i) => (i === idx ? { ...slot, ...patch } : slot)));
  };

  const handleSave = () => {
    let workflow: Record<string, any> = {};
    try {
      workflow = workflowText.trim() ? JSON.parse(workflowText) : {};
    } catch {
      setError("Workflow 必须是合法 JSON（ComfyUI 导出的 API 格式）");
      return;
    }
    if (!name.trim()) {
      setError("请填写工作流名称");
      return;
    }
    onSave({
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      workflow,
      inputs: inputs.filter((s) => s.label.trim() && s.nodeId.trim() && s.field?.trim()),
      outputs: outputs.filter((s) => s.label.trim() && s.nodeId.trim()),
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-[640px] flex-col rounded-xl border border-panel-border bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">配置 ComfyUI 工作流节点</span>
          <button type="button" className="text-text-secondary hover:text-text-primary" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                工作流名称
                <input
                  className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                ComfyUI 服务地址
                <input
                  className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                  placeholder="http://127.0.0.1:8188"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </label>
            </div>

            <label className="flex flex-col gap-1 text-xs text-text-secondary">
              Workflow JSON（在 ComfyUI 中「导出为 API 格式」后粘贴）
              <textarea
                className="h-28 rounded-md border border-panel-border bg-canvas p-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                placeholder='{"3": {"class_type": "KSampler", "inputs": {...}}, ...}'
                value={workflowText}
                onChange={(e) => setWorkflowText(e.target.value)}
              />
            </label>

            {/* 输入槎位配置 */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>输入槎位（画布节点左侧的连接点）</span>
                <button
                  type="button"
                  className="rounded-md border border-panel-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
                  onClick={() => setInputs((prev) => [...prev, emptyInputSlot()])}
                >
                  + 添加输入
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {inputs.map((slot, idx) => (
                  <div key={slot.id} className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-1.5">
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="显示名称"
                      value={slot.label}
                      onChange={(e) => updateInput(idx, { label: e.target.value })}
                    />
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="节点 ID"
                      value={slot.nodeId}
                      onChange={(e) => updateInput(idx, { nodeId: e.target.value })}
                    />
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="字段名"
                      value={slot.field ?? ""}
                      onChange={(e) => updateInput(idx, { field: e.target.value })}
                    />
                    <select
                      className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary"
                      value={slot.type}
                      onChange={(e) => updateInput(idx, { type: e.target.value as "text" | "image" })}
                    >
                      <option value="text">文本</option>
                      <option value="image">图片</option>
                    </select>
                    <button
                      type="button"
                      className="rounded-md border border-panel-border px-2 text-xs text-red-400 hover:border-red-400"
                      onClick={() => setInputs((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      删除
                    </button>
                  </div>
                ))}
                {inputs.length === 0 && (
                  <p className="text-[11px] text-text-secondary">暂无输入槎位，可点击「+ 添加输入」新建</p>
                )}
              </div>
            </div>

            {/* 输出槎位配置 */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-text-secondary">
                <span>输出槎位（画布节点右侧的连接点）</span>
                <button
                  type="button"
                  className="rounded-md border border-panel-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
                  onClick={() => setOutputs((prev) => [...prev, emptyOutputSlot()])}
                >
                  + 添加输出
                </button>
              </div>
              <div className="flex flex-col gap-2">
                {outputs.map((slot, idx) => (
                  <div key={slot.id} className="grid grid-cols-[1fr_1fr_auto] gap-1.5">
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="显示名称"
                      value={slot.label}
                      onChange={(e) => updateOutput(idx, { label: e.target.value })}
                    />
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1 text-xs text-text-primary outline-none focus:border-accent"
                      placeholder="节点 ID（如 SaveImage）"
                      value={slot.nodeId}
                      onChange={(e) => updateOutput(idx, { nodeId: e.target.value })}
                    />
                    <button
                      type="button"
                      className="rounded-md border border-panel-border px-2 text-xs text-red-400 hover:border-red-400"
                      onClick={() => setOutputs((prev) => prev.filter((_, i) => i !== idx))}
                    >
                      删除
                    </button>
                  </div>
                ))}
                {outputs.length === 0 && (
                  <p className="text-[11px] text-text-secondary">暂无输出槎位，可点击「+ 添加输出」新建</p>
                )}
              </div>
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-panel-border px-4 py-3">
          <button
            type="button"
            className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            onClick={onClose}
          >
            取消
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
            onClick={handleSave}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
