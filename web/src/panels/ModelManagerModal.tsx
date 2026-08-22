// 模型管理弹窗：新增/编辑/删除「自定义 API」或「ComfyUI 工作流」模型配置
import { useEffect, useState } from "react";
import { useModelStore } from "../store/modelStore";
import type { ComfyUiModelConfig, CustomApiModelConfig, ModelConfig, ModelConfigInput } from "../types";

type Draft =
  | (Omit<CustomApiModelConfig, "kind"> & { kind: "custom-api"; name: string })
  | (Omit<ComfyUiModelConfig, "kind"> & { kind: "comfyui"; name: string; workflowText: string });

function emptyCustomApiDraft(): Draft {
  return {
    kind: "custom-api",
    name: "",
    method: "POST",
    endpoint: "",
    headers: {},
    bodyTemplate: '{\n  "prompt": "{{prompt}}",\n  "image": "{{image0}}"\n}',
    responseImagePath: "data.imageUrl",
    responseIsUrl: true,
  };
}

function emptyComfyUiDraft(): Draft {
  return {
    kind: "comfyui",
    name: "",
    baseUrl: "http://127.0.0.1:8188",
    workflow: {},
    workflowText: "",
    promptNodeId: "6",
    promptInputField: "text",
    imageNodeId: "",
    imageInputField: "image",
    outputNodeId: "9",
  };
}

function draftFromModel(model: ModelConfig): Draft {
  if (model.kind === "custom-api") {
    return { ...model };
  }
  return { ...model, workflowText: JSON.stringify(model.workflow, null, 2) };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ModelManagerModal({ open, onClose }: Props) {
  const models = useModelStore((s) => s.models);
  const createModel = useModelStore((s) => s.createModel);
  const updateModel = useModelStore((s) => s.updateModel);
  const deleteModel = useModelStore((s) => s.deleteModel);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyCustomApiDraft());
  const [headersText, setHeadersText] = useState("{}");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setDraft(emptyCustomApiDraft());
      setHeadersText("{}");
      setSaveError(null);
    }
  }, [open]);

  if (!open) return null;

  const startCreate = (kind: "custom-api" | "comfyui") => {
    setEditingId("__new__");
    setDraft(kind === "custom-api" ? emptyCustomApiDraft() : emptyComfyUiDraft());
    setHeadersText("{}");
    setSaveError(null);
  };

  const startEdit = (model: ModelConfig) => {
    setEditingId(model.id);
    setDraft(draftFromModel(model));
    if (model.kind === "custom-api") setHeadersText(JSON.stringify(model.headers ?? {}, null, 2));
    setSaveError(null);
  };

  const handleSave = async () => {
    try {
      let payload: ModelConfigInput;
      if (draft.kind === "custom-api") {
        let headers: Record<string, string> = {};
        try {
          headers = JSON.parse(headersText || "{}");
        } catch {
          setSaveError("请求头必须是合法 JSON");
          return;
        }
        payload = {
          kind: "custom-api",
          name: draft.name,
          method: draft.method,
          endpoint: draft.endpoint,
          headers,
          bodyTemplate: draft.bodyTemplate,
          responseImagePath: draft.responseImagePath,
          responseIsUrl: draft.responseIsUrl,
        };
      } else {
        let workflow: Record<string, any> = {};
        try {
          workflow = draft.workflowText ? JSON.parse(draft.workflowText) : {};
        } catch {
          setSaveError("Workflow 必须是合法 JSON（ComfyUI 导出的 API 格式）");
          return;
        }
        payload = {
          kind: "comfyui",
          name: draft.name,
          baseUrl: draft.baseUrl,
          workflow,
          promptNodeId: draft.promptNodeId,
          promptInputField: draft.promptInputField,
          imageNodeId: draft.imageNodeId || undefined,
          imageInputField: draft.imageInputField || undefined,
          outputNodeId: draft.outputNodeId,
        };
      }

      if (!payload.name.trim()) {
        setSaveError("请填写模型名称");
        return;
      }

      if (editingId && editingId !== "__new__") {
        await updateModel(editingId, payload);
      } else {
        await createModel(payload);
      }
      setEditingId(null);
    } catch (err: any) {
      setSaveError(err?.message ?? "保存失败");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="flex max-h-[80vh] w-[720px] flex-col rounded-xl border border-panel-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">模型管理</span>
          <button type="button" className="text-text-secondary hover:text-text-primary" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：模型列表 */}
          <div className="w-56 shrink-0 border-r border-panel-border p-2">
            <div className="mb-2 flex gap-1">
              <button
                type="button"
                className="flex-1 rounded-md border border-panel-border px-2 py-1 text-xs text-text-primary hover:border-accent hover:text-accent"
                onClick={() => startCreate("custom-api")}
              >
                + 自定义 API
              </button>
            </div>
            <button
              type="button"
              className="mb-2 w-full rounded-md border border-panel-border px-2 py-1 text-xs text-text-primary hover:border-accent hover:text-accent"
              onClick={() => startCreate("comfyui")}
            >
              + ComfyUI 工作流
            </button>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`flex items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                    editingId === m.id ? "bg-accent/10 text-accent" : "text-text-primary hover:bg-accent/5"
                  }`}
                  onClick={() => startEdit(m)}
                >
                  <span className="truncate">
                    {m.name}
                    <span className="ml-1 text-text-secondary">
                      ({m.kind === "comfyui" ? "ComfyUI" : "自定义 API"})
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 右侧：编辑表单 */}
          <div className="flex-1 overflow-y-auto p-4">
            {!editingId ? (
              <p className="text-sm text-text-secondary">从左侧选择模型进行编辑，或新建一个模型配置。</p>
            ) : (
              <div className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  模型名称
                  <input
                    className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value } as Draft)}
                  />
                </label>

                {draft.kind === "custom-api" ? (
                  <>
                    <div className="flex gap-2">
                      <label className="flex w-28 flex-col gap-1 text-xs text-text-secondary">
                        请求方法
                        <select
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary"
                          value={draft.method}
                          onChange={(e) => setDraft({ ...draft, method: e.target.value as any })}
                        >
                          <option value="POST">POST</option>
                          <option value="GET">GET</option>
                          <option value="PUT">PUT</option>
                        </select>
                      </label>
                      <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                        接口地址（Endpoint）
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          placeholder="https://api.example.com/v1/generate"
                          value={draft.endpoint}
                          onChange={(e) => setDraft({ ...draft, endpoint: e.target.value })}
                        />
                      </label>
                    </div>

                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      请求头（JSON，如 Authorization）
                      <textarea
                        className="h-16 rounded-md border border-panel-border bg-canvas p-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                        value={headersText}
                        onChange={(e) => setHeadersText(e.target.value)}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      请求体模板（支持 {"{{prompt}}"} / {"{{image0}}"} / {"{{images}}"} 占位符）
                      <textarea
                        className="h-28 rounded-md border border-panel-border bg-canvas p-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                        value={draft.bodyTemplate}
                        onChange={(e) => setDraft({ ...draft, bodyTemplate: e.target.value })}
                      />
                    </label>

                    <div className="flex gap-2">
                      <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                        响应图片字段路径
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          placeholder="data.images.0.url"
                          value={draft.responseImagePath}
                          onChange={(e) => setDraft({ ...draft, responseImagePath: e.target.value })}
                        />
                      </label>
                      <label className="flex items-center gap-2 self-end pb-1.5 text-xs text-text-secondary">
                        <input
                          type="checkbox"
                          checked={draft.responseIsUrl}
                          onChange={(e) => setDraft({ ...draft, responseIsUrl: e.target.checked })}
                        />
                        返回的是可访问 URL（否则视为 base64）
                      </label>
                    </div>
                  </>
                ) : (
                  <>
                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      ComfyUI 服务地址
                      <input
                        className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                        placeholder="http://127.0.0.1:8188"
                        value={draft.baseUrl}
                        onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })}
                      />
                    </label>

                    <label className="flex flex-col gap-1 text-xs text-text-secondary">
                      Workflow JSON（在 ComfyUI 中「导出为 API 格式」后粘贴）
                      <textarea
                        className="h-32 rounded-md border border-panel-border bg-canvas p-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
                        placeholder='{"3": {"class_type": "KSampler", "inputs": {...}}, ...}'
                        value={draft.workflowText}
                        onChange={(e) => setDraft({ ...draft, workflowText: e.target.value })}
                      />
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex flex-col gap-1 text-xs text-text-secondary">
                        提示词节点 ID
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          value={draft.promptNodeId}
                          onChange={(e) => setDraft({ ...draft, promptNodeId: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-text-secondary">
                        提示词字段名
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          placeholder="text"
                          value={draft.promptInputField}
                          onChange={(e) => setDraft({ ...draft, promptInputField: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-text-secondary">
                        图片输入节点 ID（可选）
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          value={draft.imageNodeId}
                          onChange={(e) => setDraft({ ...draft, imageNodeId: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-text-secondary">
                        图片字段名
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          placeholder="image"
                          value={draft.imageInputField}
                          onChange={(e) => setDraft({ ...draft, imageInputField: e.target.value })}
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-text-secondary">
                        输出节点 ID（SaveImage）
                        <input
                          className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                          value={draft.outputNodeId}
                          onChange={(e) => setDraft({ ...draft, outputNodeId: e.target.value })}
                        />
                      </label>
                    </div>
                  </>
                )}

                {saveError && <p className="text-xs text-red-400">{saveError}</p>}

                <div className="flex items-center justify-between pt-2">
                  {editingId !== "__new__" ? (
                    <button
                      type="button"
                      className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-red-400 hover:border-red-400"
                      onClick={async () => {
                        await deleteModel(editingId!);
                        setEditingId(null);
                      }}
                    >
                      删除该模型
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
                    onClick={handleSave}
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
