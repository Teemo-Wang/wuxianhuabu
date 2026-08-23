// ComfyUI 工作流节点的配置弹窗：填写服务地址、粘贴 workflow JSON、
// 并手动配置任意数量的输入/输出槎位（每个槎位对应画布节点上的一个 Handle）
// 也可以直接从「工作流库」加载已保存的配置，或把当前配置保存进库供其它节点复用
import { useEffect, useState } from "react";
import { useComfyWorkflowLibraryStore } from "../store/comfyWorkflowLibraryStore";
import { ComfyWorkflowSlotsEditor } from "./ComfyWorkflowSlotsEditor";
import type { ComfyWorkflowIOSlot, ComfyWorkflowNodeData } from "../types";

interface Props {
  data: ComfyWorkflowNodeData;
  onSave: (patch: Partial<ComfyWorkflowNodeData>) => void;
  onClose: () => void;
}

export function ComfyWorkflowConfigModal({ data, onSave, onClose }: Props) {
  const workflows = useComfyWorkflowLibraryStore((s) => s.workflows);
  const loadWorkflows = useComfyWorkflowLibraryStore((s) => s.loadWorkflows);
  const createWorkflow = useComfyWorkflowLibraryStore((s) => s.createWorkflow);
  const updateWorkflow = useComfyWorkflowLibraryStore((s) => s.updateWorkflow);

  const [name, setName] = useState(data.name || "");
  const [baseUrl, setBaseUrl] = useState(data.baseUrl || "http://127.0.0.1:8188");
  const [workflowText, setWorkflowText] = useState(
    data.workflow && Object.keys(data.workflow).length > 0 ? JSON.stringify(data.workflow, null, 2) : ""
  );
  const [inputs, setInputs] = useState<ComfyWorkflowIOSlot[]>(data.inputs?.length ? data.inputs : []);
  const [outputs, setOutputs] = useState<ComfyWorkflowIOSlot[]>(data.outputs?.length ? data.outputs : []);
  const [libraryId, setLibraryId] = useState<string | null>((data as any).libraryId ?? null);
  const [libraryPickerOpen, setLibraryPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveHint, setSaveHint] = useState<string | null>(null);

  useEffect(() => {
    void loadWorkflows();
  }, [loadWorkflows]);

  const parseWorkflow = (): Record<string, any> | null => {
    try {
      return workflowText.trim() ? JSON.parse(workflowText) : {};
    } catch {
      setError("Workflow 必须是合法 JSON（ComfyUI 导出的 API 格式）");
      return null;
    }
  };

  const loadFromLibrary = (id: string) => {
    const entry = workflows.find((w) => w.id === id);
    if (!entry) return;
    setName(entry.name);
    setBaseUrl(entry.baseUrl);
    setWorkflowText(JSON.stringify(entry.workflow, null, 2));
    setInputs(entry.inputs);
    setOutputs(entry.outputs);
    setLibraryId(entry.id);
    setLibraryPickerOpen(false);
    setSaveHint(null);
  };

  const saveToLibrary = async () => {
    const workflow = parseWorkflow();
    if (workflow === null) return;
    if (!name.trim()) {
      setError("请先填写工作流名称");
      return;
    }
    const payload = { name: name.trim(), baseUrl: baseUrl.trim(), workflow, inputs, outputs };
    if (libraryId) {
      const updated = await updateWorkflow(libraryId, payload);
      setLibraryId(updated.id);
    } else {
      const created = await createWorkflow(payload);
      setLibraryId(created.id);
    }
    setSaveHint("已保存到工作流库");
  };

  const handleSave = () => {
    const workflow = parseWorkflow();
    if (workflow === null) return;
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
      libraryId: libraryId ?? undefined,
    } as Partial<ComfyWorkflowNodeData>);
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
            {/* 从工作流库加载 */}
            <div className="relative flex items-center justify-between rounded-md border border-dashed border-panel-border p-2">
              <span className="text-xs text-text-secondary">
                {libraryId ? "已关联工作流库中的一个条目，保存节点时会同步更新" : "可以从工作流库直接加载已保存的配置"}
              </span>
              <button
                type="button"
                className="shrink-0 rounded-md border border-panel-border px-2 py-1 text-xs text-text-primary hover:border-accent hover:text-accent"
                onClick={() => setLibraryPickerOpen((v) => !v)}
              >
                从库加载
              </button>
              {libraryPickerOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setLibraryPickerOpen(false)} />
                  <div className="absolute right-0 top-9 z-20 max-h-56 w-64 overflow-y-auto rounded-lg border border-panel-border bg-panel p-1 shadow-xl">
                    {workflows.length === 0 ? (
                      <div className="px-2 py-1.5 text-xs text-text-secondary">工作流库为空</div>
                    ) : (
                      workflows.map((w) => (
                        <button
                          key={w.id}
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs text-text-primary hover:bg-accent/10"
                          onClick={() => loadFromLibrary(w.id)}
                        >
                          <span className="truncate">{w.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>

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

            <ComfyWorkflowSlotsEditor
              title="输入槎位（画布节点左侧的连接点）"
              addLabel="+ 添加输入"
              slots={inputs}
              onChange={setInputs}
              showField
            />

            <ComfyWorkflowSlotsEditor
              title="输出槎位（画布节点右侧的连接点）"
              addLabel="+ 添加输出"
              slots={outputs}
              onChange={setOutputs}
              showField={false}
            />

            {error && <p className="text-xs text-red-400">{error}</p>}
            {saveHint && <p className="text-xs text-accent">{saveHint}</p>}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-panel-border px-4 py-3">
          <button
            type="button"
            className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            onClick={() => void saveToLibrary()}
          >
            保存到工作流库
          </button>
          <div className="flex gap-2">
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
    </div>
  );
}
