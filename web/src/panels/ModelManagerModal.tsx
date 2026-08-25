// 模型管理弹窗：新增/编辑/删除「自定义 API」或「ComfyUI 工作流」模型配置
// 自定义 API 分「简易模式」（填几个基础字段自动拼装请求）和「高级模式」（完全手动配置）两种表单
import { useEffect, useState } from "react";
import { useModelStore } from "../store/modelStore";
import {
  buildSimpleApiConfig,
  defaultSimpleFields,
  simpleFieldsFromConfig,
  type SimpleApiFields,
} from "../lib/simpleApiModel";
import type { ComfyUiModelConfig, CustomApiModelConfig, ModelConfig, ModelConfigInput } from "../types";

/** 简易模式图片尺寸下拉框里的预设选项；不在这个列表里的值都视为"自定义尺寸"，显示额外输入框 */
const PRESET_SIZES = ["1024x1024", "1024x1792", "1792x1024"];

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

  // 自定义 API 模型的表单模式：简易模式只需填 API 地址/密钥/模型名/尺寸/响应格式，
  // 高级模式保留完整的手动配置能力（自定义请求头/请求体模板/响应路径）
  const [formMode, setFormMode] = useState<"simple" | "advanced">("simple");
  const [simpleFields, setSimpleFields] = useState<SimpleApiFields>(defaultSimpleFields());

  useEffect(() => {
    if (!open) {
      setEditingId(null);
      setDraft(emptyCustomApiDraft());
      setHeadersText("{}");
      setSaveError(null);
      setFormMode("simple");
      setSimpleFields(defaultSimpleFields());
    }
  }, [open]);

  if (!open) return null;

  const startCreate = (kind: "custom-api" | "comfyui") => {
    setEditingId("__new__");
    setDraft(kind === "custom-api" ? emptyCustomApiDraft() : emptyComfyUiDraft());
    setHeadersText("{}");
    setSaveError(null);
    setFormMode("simple");
    setSimpleFields(defaultSimpleFields());
  };

  const startEdit = (model: ModelConfig) => {
    setEditingId(model.id);
    setDraft(draftFromModel(model));
    if (model.kind === "custom-api") {
      setHeadersText(JSON.stringify(model.headers ?? {}, null, 2));
      if (model.simpleMode) {
        setFormMode("simple");
        setSimpleFields(simpleFieldsFromConfig(model));
      } else {
        setFormMode("advanced");
      }
    }
    setSaveError(null);
  };

  const handleSave = async () => {
    try {
      let payload: ModelConfigInput;

      if (draft.kind === "custom-api") {
        if (formMode === "simple") {
          if (!simpleFields.baseUrl.trim() || !simpleFields.apiKey.trim() || !simpleFields.modelName.trim()) {
            setSaveError("请填写 API 地址、密钥和模型名称");
            return;
          }
          if (!simpleFields.size.trim() || simpleFields.size === "0") {
            setSaveError("请填写自定义图片尺寸");
            return;
          }
          const generated = buildSimpleApiConfig(simpleFields);
          payload = { kind: "custom-api", name: draft.name, ...generated };
        } else {
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
            simpleMode: false,
          };
        }
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
                    placeholder="给这个模型起个你自己认得的名字"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value } as Draft)}
                  />
                </label>

                {draft.kind === "custom-api" ? (
                  <>
                    {/* 简易/高级模式切换 */}
                    <div className="flex gap-1 rounded-md border border-panel-border bg-canvas p-0.5 text-xs">
                      <button
                        type="button"
                        className={`flex-1 rounded-md py-1 ${
                          formMode === "simple"
                            ? "bg-accent text-accent-fg"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                        onClick={() => setFormMode("simple")}
                      >
                        简易模式
                      </button>
                      <button
                        type="button"
                        className={`flex-1 rounded-md py-1 ${
                          formMode === "advanced"
                            ? "bg-accent text-accent-fg"
                            : "text-text-secondary hover:text-text-primary"
                        }`}
                        onClick={() => setFormMode("advanced")}
                      >
                        高级模式
                      </button>
                    </div>

                    {formMode === "simple" ? (
                      <>
                        <label className="flex flex-col gap-1 text-xs text-text-secondary">
                          API 地址（不含 /images/generations，程序会自动补上）
                          <input
                            className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                            placeholder="https://api.openai.com/v1"
                            value={simpleFields.baseUrl}
                            onChange={(e) => setSimpleFields({ ...simpleFields, baseUrl: e.target.value })}
                          />
                        </label>
                        <label className="flex flex-col gap-1 text-xs text-text-secondary">
                          API 密钥
                          <input
                            className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                            placeholder="sk-..."
                            value={simpleFields.apiKey}
                            onChange={(e) => setSimpleFields({ ...simpleFields, apiKey: e.target.value })}
                          />
                        </label>
                        <div className="flex gap-2">
                          <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                            模型名称（model 参数）
                            <input
                              className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                              placeholder="gpt-image-1"
                              value={simpleFields.modelName}
                              onChange={(e) => setSimpleFields({ ...simpleFields, modelName: e.target.value })}
                            />
                          </label>
                          <label className="flex w-32 flex-col gap-1 text-xs text-text-secondary">
                            图片尺寸
                            <select
                              className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary"
                              value={PRESET_SIZES.includes(simpleFields.size) ? simpleFields.size : "0"}
                              onChange={(e) => setSimpleFields({ ...simpleFields, size: e.target.value })}
                            >
                              <option value="1024x1024">1024x1024</option>
                              <option value="1024x1792">1024x1792</option>
                              <option value="1792x1024">1792x1024</option>
                              <option value="0">自定义…</option>
                            </select>
                          </label>
                        </div>
                        {!PRESET_SIZES.includes(simpleFields.size) && (
                          <label className="flex flex-col gap-1 text-xs text-text-secondary">
                            自定义尺寸（宽x高）
                            <input
                              className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                              placeholder="例如 512x512"
                              value={simpleFields.size === "0" ? "" : simpleFields.size}
                              onChange={(e) => setSimpleFields({ ...simpleFields, size: e.target.value })}
                            />
                          </label>
                        )}
                        <label className="flex flex-col gap-1 text-xs text-text-secondary">
                          响应格式
                          <select
                            className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary"
                            value={simpleFields.responseFormat}
                            onChange={(e) =>
                              setSimpleFields({
                                ...simpleFields,
                                responseFormat: e.target.value as "url" | "b64_json",
                              })
                            }
                          >
                            <option value="url">url（返回图片链接）</option>
                            <option value="b64_json">b64_json（返回 base64 编码）</option>
                          </select>
                        </label>
                      </>
                    ) : (
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
                    )}
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
