// 节点下方内嵌提示词条：选中一个或多个节点时自动出现在其正下方，
// 承担原来右侧悬浮 Agent 面板的职责（引用素材、选择模型、输入提示词、生成）
import { useEffect, useMemo, useState } from "react";
import { getNodesBounds, useReactFlow, useViewport } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import { useAgentStore, getNodeLabel } from "../store/agentStore";
import { useModelStore } from "../store/modelStore";
import type { AppNodeData, ImageNodeData, MediaOutputType } from "../types";

const BAR_WIDTH = 360;
const GAP_BELOW_SELECTION = 16;

export function InlinePromptBar() {
  const nodes = useCanvasStore((s) => s.nodes);
  const { flowToScreenPosition } = useReactFlow();
  // 订阅 viewport 变化：画布平移/缩放时这个组件本身没有其它状态变化，
  // 需要靠订阅 viewport 触发重渲染，才能让条跟随节点一起移动
  useViewport();

  const referenceIds = useAgentStore((s) => s.referenceIds);
  const prompt = useAgentStore((s) => s.prompt);
  const generating = useAgentStore((s) => s.generating);
  const errorMessage = useAgentStore((s) => s.errorMessage);
  const syncSelection = useAgentStore((s) => s.syncSelection);
  const addReference = useAgentStore((s) => s.addReference);
  const removeReference = useAgentStore((s) => s.removeReference);
  const setPrompt = useAgentStore((s) => s.setPrompt);
  const generate = useAgentStore((s) => s.generate);

  const models = useModelStore((s) => s.models);
  const activeModelId = useModelStore((s) => s.activeModelId);
  const setActiveModel = useModelStore((s) => s.setActiveModel);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const selectedNodes = useMemo(
    () => nodes.filter((n) => n.selected && n.type !== "generating"),
    [nodes]
  );

  // 选中集合变化时，把引用列表同步为当前选中的节点
  useEffect(() => {
    syncSelection(selectedNodes.map((n) => n.id));
  }, [selectedNodes, syncSelection]);

  const referenceNodes = useMemo(
    () => referenceIds.map((id) => nodes.find((n) => n.id === id)).filter(Boolean) as typeof nodes,
    [referenceIds, nodes]
  );

  const availableToMention = useMemo(
    () => nodes.filter((n) => n.type !== "generating" && !referenceIds.includes(n.id)),
    [nodes, referenceIds]
  );

  const activeModel = models.find((m) => m.id === activeModelId);
  const outputType: MediaOutputType = activeModel?.outputType ?? "image";
  const generateLabel =
    outputType === "video" ? "生成视频" : outputType === "audio" ? "生成音频" : "生成图片";

  if (selectedNodes.length === 0) return null;

  // 用选中节点在 flow 坐标系下的包围盒，换算成屏幕坐标，条固定在其下方居中显示
  const bounds = getNodesBounds(selectedNodes);
  const bottomCenterFlow = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
  const screenPoint = flowToScreenPosition(bottomCenterFlow);

  return (
    <div
      className="fixed z-30 flex flex-col gap-2 rounded-2xl border border-panel-border bg-panel p-2.5 shadow-2xl"
      style={{
        left: screenPoint.x - BAR_WIDTH / 2,
        top: screenPoint.y + GAP_BELOW_SELECTION,
        width: BAR_WIDTH,
      }}
    >
      {/* 引用素材行：已引用节点的缩略标签 + 继续添加引用 */}
      <div className="flex items-center gap-1.5 overflow-x-auto">
        {/* 模型选择器 */}
        <div className="relative shrink-0">
          <button
            type="button"
            className="nodrag flex h-7 items-center gap-1 rounded-full border border-panel-border bg-canvas px-2 text-[11px] text-text-primary hover:border-accent hover:text-accent"
            onClick={() => setModelPickerOpen((v) => !v)}
            title="选择模型"
          >
            <span className="h-3.5 w-3.5 rounded-full bg-accent" />
            <span className="max-w-[90px] truncate">{activeModel ? activeModel.name : "未选模型"}</span>
          </button>
          {modelPickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setModelPickerOpen(false)} />
              <div className="nodrag absolute bottom-8 left-0 z-50 max-h-48 w-48 overflow-y-auto rounded-lg border border-panel-border bg-panel p-1 shadow-xl">
                {models.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-text-secondary">
                    尚未配置模型，请先在右上角「模型管理」中添加
                  </div>
                ) : (
                  models.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/10 ${
                        m.id === activeModelId ? "text-accent" : "text-text-primary"
                      }`}
                      onClick={() => {
                        setActiveModel(m.id);
                        setModelPickerOpen(false);
                      }}
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="ml-1 shrink-0 text-text-secondary">
                        {m.kind === "comfyui" ? "ComfyUI" : "API"} ·{" "}
                        {m.outputType === "video" ? "视频" : m.outputType === "audio" ? "音频" : "图片"}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        <div className="h-4 w-px shrink-0 bg-panel-border" />

        {/* 已引用节点的缩略标签 */}
        {referenceNodes.map((n) => {
          const data = n!.data as AppNodeData;
          const isImage = data.kind === "image";
          return (
            <span
              key={n!.id}
              className="nodrag flex shrink-0 items-center gap-1 rounded-full border border-panel-border bg-canvas px-2 py-1 text-[11px] text-text-primary"
            >
              {isImage && (data as ImageNodeData).url && (
                <img src={(data as ImageNodeData).url} className="h-4 w-4 rounded-full object-cover" alt="" />
              )}
              <span className="max-w-[80px] truncate">{getNodeLabel(n!)}</span>
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

        {/* 继续添加引用 */}
        <div className="relative shrink-0">
          <button
            type="button"
            className="nodrag flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-panel-border text-text-secondary hover:border-accent hover:text-accent"
            onClick={() => setMentionOpen((v) => !v)}
            title="添加引用（@）"
          >
            +
          </button>
          {mentionOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMentionOpen(false)} />
              <div className="nodrag absolute bottom-8 left-0 z-50 max-h-48 w-48 overflow-y-auto rounded-lg border border-panel-border bg-panel p-1 shadow-xl">
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
            </>
          )}
        </div>
      </div>

      {/* 提示词输入 */}
      <textarea
        className="nodrag min-h-[64px] w-full resize-none rounded-lg border border-panel-border bg-canvas p-2 text-sm text-text-primary outline-none focus:border-accent"
        placeholder={
          outputType === "video"
            ? "描述画面怎么动，引用一张图即可图生视频"
            : "描述任何你想生成的内容，按 @ 引用素材"
        }
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      {errorMessage && <p className="text-[11px] text-red-400">{errorMessage}</p>}

      <div className="flex items-center justify-end">
        <button
          type="button"
          disabled={generating}
          className="nodrag rounded-full bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          onClick={() => generate(activeModelId)}
        >
          {generating ? "生成中…" : generateLabel}
        </button>
      </div>
    </div>
  );
}
