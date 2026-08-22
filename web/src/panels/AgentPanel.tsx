// 生成面板（Agent 面板）：选中节点作为输入引用、@ 引用、选择模型、发起生成
import { useMemo, useState } from "react";
import { useAgentStore, getNodeLabel } from "../store/agentStore";
import { useCanvasStore } from "../store/canvasStore";
import { useModelStore } from "../store/modelStore";
import type { AppNodeData, ImageNodeData } from "../types";

export function AgentPanel() {
  const open = useAgentStore((s) => s.open);
  const referenceIds = useAgentStore((s) => s.referenceIds);
  const prompt = useAgentStore((s) => s.prompt);
  const generating = useAgentStore((s) => s.generating);
  const errorMessage = useAgentStore((s) => s.errorMessage);
  const closePanel = useAgentStore((s) => s.closePanel);
  const addReference = useAgentStore((s) => s.addReference);
  const removeReference = useAgentStore((s) => s.removeReference);
  const setPrompt = useAgentStore((s) => s.setPrompt);
  const generate = useAgentStore((s) => s.generate);

  const nodes = useCanvasStore((s) => s.nodes);
  const models = useModelStore((s) => s.models);
  const activeModelId = useModelStore((s) => s.activeModelId);
  const setActiveModel = useModelStore((s) => s.setActiveModel);

  const [mentionOpen, setMentionOpen] = useState(false);

  const referenceNodes = useMemo(
    () => referenceIds.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as typeof nodes,
    [referenceIds, nodes]
  );

  const availableToMention = useMemo(
    () => nodes.filter((n) => n.type !== "generating" && !referenceIds.includes(n.id)),
    [nodes, referenceIds]
  );

  if (!open) return null;

  return (
    <div className="absolute right-4 top-16 z-30 flex w-[340px] flex-col gap-3 rounded-xl border border-panel-border bg-panel p-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">Agent 生成面板</span>
        <button
          type="button"
          className="text-text-secondary hover:text-text-primary"
          onClick={closePanel}
        >
          关闭
        </button>
      </div>

      {/* 引用节点列表，对应 @ 引用 */}
      <div>
        <div className="mb-1 flex items-center justify-between text-[11px] text-text-secondary">
          <span>引用节点</span>
          <div className="relative">
            <button
              type="button"
              className="rounded-md border border-panel-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
              onClick={() => setMentionOpen((v) => !v)}
            >
              @ 添加引用
            </button>
            {mentionOpen && (
              <div className="absolute right-0 top-6 z-40 max-h-48 w-48 overflow-y-auto rounded-lg border border-panel-border bg-panel p-1 shadow-xl">
                {availableToMention.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-text-secondary">暂无可引用节点</div>
                ) : (
                  availableToMention.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs text-text-primary hover:bg-accent/10"
                      onClick={() => {
                        addReference(n.id);
                        setMentionOpen(false);
                      }}
                    >
                      <span className="truncate">{getNodeLabel(n)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {referenceNodes.length === 0 && (
            <span className="text-xs text-text-secondary">未引用任何节点</span>
          )}
          {referenceNodes.map((n) => {
            const data = n!.data as AppNodeData;
            const isImage = data.kind === "image";
            return (
              <span
                key={n!.id}
                className="flex items-center gap-1 rounded-full border border-panel-border bg-canvas px-2 py-0.5 text-[11px] text-text-primary"
              >
                {isImage && (data as ImageNodeData).url && (
                  <img src={(data as ImageNodeData).url} className="h-4 w-4 rounded-full object-cover" alt="" />
                )}
                <span>{getNodeLabel(n!)}</span>
                <button
                  type="button"
                  className="text-text-secondary hover:text-red-400"
                  onClick={() => removeReference(n!.id)}
                >
                  ×
                </button>
              </span>
            );
          })}
        </div>
      </div>

      {/* 提示词输入 */}
      <textarea
        className="nodrag min-h-[80px] w-full resize-none rounded-md border border-panel-border bg-canvas p-2 text-sm text-text-primary outline-none focus:border-accent"
        placeholder="描述你想生成的内容，例如：保持产品不变，替换为夜晚露营场景，16:9 画幅"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {/* 模型选择 */}
      <div>
        <div className="mb-1 text-[11px] text-text-secondary">选择模型</div>
        {models.length === 0 ? (
          <div className="rounded-md border border-dashed border-panel-border p-2 text-xs text-text-secondary">
            尚未配置模型，请先在右上角「模型管理」中添加自定义 API 或 ComfyUI 工作流
          </div>
        ) : (
          <select
            className="nodrag w-full rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
            value={activeModelId ?? ""}
            onChange={(e) => setActiveModel(e.target.value)}
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} · {m.kind === "comfyui" ? "ComfyUI" : "自定义 API"}
              </option>
            ))}
          </select>
        )}
      </div>

      {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

      <button
        type="button"
        disabled={generating}
        className="w-full rounded-md bg-accent py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        onClick={() => generate(activeModelId)}
      >
        {generating ? "生成中…" : "生成"}
      </button>
    </div>
  );
}
