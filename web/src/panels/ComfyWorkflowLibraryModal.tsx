// ComfyUI 工作流库管理弹窗：集中查看/新建/编辑/删除所有已保存的工作流配置
import { useEffect, useState } from "react";
import { useComfyWorkflowLibraryStore } from "../store/comfyWorkflowLibraryStore";
import { ComfyWorkflowSlotsEditor } from "./ComfyWorkflowSlotsEditor";
import { JsonFileUploadButton } from "./JsonFileUploadButton";
import type { ComfyWorkflowEntry, ComfyWorkflowIOSlot } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function emptyDraft() {
  return { name: "", baseUrl: "http://127.0.0.1:8188", workflowText: "", inputs: [] as ComfyWorkflowIOSlot[], outputs: [] as ComfyWorkflowIOSlot[] };
}

function draftFromEntry(entry: ComfyWorkflowEntry) {
  return {
    name: entry.name,
    baseUrl: entry.baseUrl,
    workflowText: JSON.stringify(entry.workflow, null, 2),
    inputs: entry.inputs,
    outputs: entry.outputs,
  };
}

export function ComfyWorkflowLibraryModal({ open, onClose }: Props) {
  const workflows = useComfyWorkflowLibraryStore((s) => s.workflows);
  const loaded = useComfyWorkflowLibraryStore((s) => s.loaded);
  const loadWorkflows = useComfyWorkflowLibraryStore((s) => s.loadWorkflows);
  const createWorkflow = useComfyWorkflowLibraryStore((s) => s.createWorkflow);
  const updateWorkflow = useComfyWorkflowLibraryStore((s) => s.updateWorkflow);
  const deleteWorkflow = useComfyWorkflowLibraryStore((s) => s.deleteWorkflow);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) void loadWorkflows();
  }, [open, loadWorkflows]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setDraft(emptyDraft());
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const startCreate = () => {
    setSelectedId("__new__");
    setDraft(emptyDraft());
    setError(null);
  };

  const startEdit = (entry: ComfyWorkflowEntry) => {
    setSelectedId(entry.id);
    setDraft(draftFromEntry(entry));
    setError(null);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError("请填写工作流名称");
      return;
    }
    let workflow: Record<string, any> = {};
    try {
      workflow = draft.workflowText.trim() ? JSON.parse(draft.workflowText) : {};
    } catch {
      setError("Workflow 必须是合法 JSON（ComfyUI 导出的 API 格式）");
      return;
    }
    const payload = {
      name: draft.name.trim(),
      baseUrl: draft.baseUrl.trim(),
      workflow,
      inputs: draft.inputs,
      outputs: draft.outputs,
    };
    if (selectedId && selectedId !== "__new__") {
      await updateWorkflow(selectedId, payload);
    } else {
      const created = await createWorkflow(payload);
      setSelectedId(created.id);
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[85vh] w-[780px] flex-col rounded-xl border border-panel-border bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">ComfyUI 工作流库</span>
          <button type="button" className="text-text-secondary hover:text-text-primary" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：库条目列表 */}
          <div className="w-60 shrink-0 border-r border-panel-border p-2">
            <button
              type="button"
              className="mb-2 w-full rounded-md border border-panel-border px-2 py-1 text-xs text-text-primary hover:border-accent hover:text-accent"
              onClick={startCreate}
            >
              + 新建工作流
            </button>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {!loaded ? (
                <p className="px-2 py-1.5 text-xs text-text-secondary">加载中…</p>
              ) : workflows.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-text-secondary">
                  还没有保存任何工作流，点击上方「新建工作流」创建
                </p>
              ) : (
                workflows.map((w) => (
                  <button
                    key={w.id}
                    type="button"
                    className={`rounded-md px-2 py-1.5 text-left text-xs ${
                      selectedId === w.id ? "bg-accent/10 text-accent" : "text-text-primary hover:bg-accent/5"
                    }`}
                    onClick={() => startEdit(w)}
                  >
                    <div className="truncate">{w.name}</div>
                    <div className="truncate text-[10px] text-text-secondary">
                      {w.inputs.length} 输入 · {w.outputs.length} 输出
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 右侧：编辑区 */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedId ? (
              <p className="text-sm text-text-secondary">从左侧选择一个工作流查看/编辑，或新建一个。</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="flex gap-2">
                  <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                    工作流名称
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                    ComfyUI 服务地址
                    <input
                      className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                      placeholder="http://127.0.0.1:8188"
                      value={draft.baseUrl}
                      onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-1 text-xs text-text-secondary">
                  <div className="flex items-center justify-between">
                    <span>Workflow JSON（在 ComfyUI 中「导出为 API 格式」后粘贴，或直接上传文件）</span>
                    <JsonFileUploadButton
                      onLoaded={(text) => setDraft({ ...draft, workflowText: text })}
                    />
                  </div>
                  <textarea
                    className="h-32 rounded-md border border-panel-border bg-canvas p-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                    placeholder='{"3": {"class_type": "KSampler", "inputs": {...}}, ...}'
                    value={draft.workflowText}
                    onChange={(e) => setDraft({ ...draft, workflowText: e.target.value })}
                  />
                </div>

                <ComfyWorkflowSlotsEditor
                  title="输入槎位"
                  addLabel="+ 添加输入"
                  slots={draft.inputs}
                  onChange={(inputs) => setDraft({ ...draft, inputs })}
                  showField
                />
                <ComfyWorkflowSlotsEditor
                  title="输出槎位"
                  addLabel="+ 添加输出"
                  slots={draft.outputs}
                  onChange={(outputs) => setDraft({ ...draft, outputs })}
                  showField={false}
                />

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex items-center justify-between pt-1">
                  {selectedId !== "__new__" ? (
                    <button
                      type="button"
                      className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-red-400 hover:border-red-400"
                      onClick={async () => {
                        await deleteWorkflow(selectedId);
                        setSelectedId(null);
                      }}
                    >
                      删除
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
                    onClick={() => void handleSave()}
                  >
                    保存
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
