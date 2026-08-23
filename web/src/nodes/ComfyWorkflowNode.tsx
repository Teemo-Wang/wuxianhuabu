// ComfyUI 工作流节点：把一份 workflow 直接绑定到画布节点上，
// 按配置好的输入/输出槎位在节点两侧渲染对应数量的 Handle（类似 ComfyUI 里一个自定义节点的输入输出插槎）
import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore, type AppNode } from "../store/canvasStore";
import { api } from "../api/client";
import type { AppNodeData, ComfyWorkflowNodeData, ImageNodeData, TextNodeData } from "../types";
import { ComfyWorkflowConfigModal } from "../panels/ComfyWorkflowConfigModal";

/** 把 N 个槎位在节点高度范围内均匀分布，返回每一项的 top 百分比 */
function distributeTop(index: number, total: number): string {
  if (total <= 1) return "50%";
  return `${((index + 1) / (total + 1)) * 100}%`;
}

function ComfyWorkflowNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ComfyWorkflowNodeData;
  const nodes = useCanvasStore((s) => s.nodes);
  const edges = useCanvasStore((s) => s.edges);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const [configOpen, setConfigOpen] = useState(false);

  const inputs = nodeData.inputs ?? [];
  const outputs = nodeData.outputs ?? [];
  const results = nodeData.results ?? {};

  /** 找到某个输入槎位当前连接的上游节点（通过 targetHandle === 槎位 id 匹配） */
  const findUpstreamValue = (slotId: string, type: "text" | "image"): string | null => {
    const edge = edges.find((e) => e.target === id && e.targetHandle === slotId);
    if (!edge) return null;
    const upstream = nodes.find((n) => n.id === edge.source) as AppNode | undefined;
    if (!upstream) return null;
    const upstreamData = upstream.data as AppNodeData;
    if (type === "text") {
      if (upstreamData.kind === "text") return (upstreamData as TextNodeData).content;
      if (upstreamData.kind === "skill") return (upstreamData as any).content ?? null;
    }
    if (type === "image" && upstreamData.kind === "image") {
      return (upstreamData as ImageNodeData).url || null;
    }
    return null;
  };

  const handleRun = async () => {
    if (!nodeData.baseUrl || !nodeData.workflow || Object.keys(nodeData.workflow).length === 0) {
      updateNodeData(id, { status: "error", errorMessage: "请先在配置中填写 ComfyUI 地址和 workflow" });
      return;
    }
    if (outputs.length === 0) {
      updateNodeData(id, { status: "error", errorMessage: "请先在配置中添加至少一个输出槎位" });
      return;
    }

    const missing: string[] = [];
    const runInputs = inputs.map((slot) => {
      const value = findUpstreamValue(slot.id, slot.type);
      if (!value) missing.push(slot.label);
      return { nodeId: slot.nodeId, field: slot.field ?? "", type: slot.type, value: value ?? "" };
    });
    if (missing.length > 0) {
      updateNodeData(id, {
        status: "error",
        errorMessage: `以下输入槎位尚未连接上游节点：${missing.join("、")}`,
      });
      return;
    }

    updateNodeData(id, { status: "running", errorMessage: undefined });
    try {
      const { results: runResults } = await api.runComfyWorkflow({
        baseUrl: nodeData.baseUrl,
        workflow: nodeData.workflow,
        inputs: runInputs,
        outputs: outputs.map((o) => ({ slotId: o.id, nodeId: o.nodeId })),
      });
      const nextResults = { ...results };
      for (const r of runResults) nextResults[r.slotId] = r.imageUrl;
      updateNodeData(id, { status: "idle", results: nextResults });
    } catch (err: any) {
      console.error("ComfyUI 工作流执行失败", err);
      updateNodeData(id, { status: "error", errorMessage: err?.message ?? "执行失败" });
    }
  };

  return (
    <div
      className={`group relative w-[280px] rounded-node border bg-node-bg p-2 shadow-sm transition-colors ${
        selected ? "border-accent" : "border-node-border"
      }`}
    >
      {/* 输入 Handle：按配置数量均匀分布在左侧 */}
      {inputs.map((slot, i) => (
        <Handle
          key={slot.id}
          id={slot.id}
          type="target"
          position={Position.Left}
          style={{ top: distributeTop(i, inputs.length) }}
          className="!bg-accent !w-2 !h-2"
        />
      ))}
      {/* 输出 Handle：按配置数量均匀分布在右侧 */}
      {outputs.map((slot, i) => (
        <Handle
          key={slot.id}
          id={slot.id}
          type="source"
          position={Position.Right}
          style={{ top: distributeTop(i, outputs.length) }}
          className="!bg-accent !w-2 !h-2"
        />
      ))}

      <div className="mb-1.5 flex items-center justify-between text-[11px] font-medium text-text-secondary">
        <span className="truncate">{nodeData.name || "ComfyUI 工作流"}</span>
        <button
          type="button"
          className="nodrag shrink-0 rounded-md border border-panel-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
          onClick={() => setConfigOpen(true)}
        >
          配置
        </button>
      </div>

      <div className="flex flex-col gap-1 rounded-md border border-panel-border bg-canvas p-2">
        {/* 输入槎位列表 */}
        {inputs.length === 0 ? (
          <div className="text-[11px] text-text-secondary">尚未配置输入槎位</div>
        ) : (
          inputs.map((slot) => {
            const connected = edges.some((e) => e.target === id && e.targetHandle === slot.id);
            return (
              <div key={slot.id} className="flex items-center justify-between text-[11px]">
                <span className="truncate text-text-primary">{slot.label}</span>
                <span className={connected ? "text-accent" : "text-text-secondary"}>
                  {connected ? "已连接" : "未连接"}
                </span>
              </div>
            );
          })
        )}

        {outputs.length > 0 && <div className="my-0.5 border-t border-panel-border" />}

        {/* 输出槎位列表：有结果时展示缩略图 */}
        {outputs.map((slot) => (
          <div key={slot.id} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate text-text-primary">{slot.label}</span>
            {results[slot.id] ? (
              <img src={results[slot.id]} alt="" className="h-8 w-8 rounded object-cover" />
            ) : (
              <span className="text-text-secondary">暂无结果</span>
            )}
          </div>
        ))}
      </div>

      {nodeData.errorMessage && (
        <p className="mt-1.5 text-[11px] text-red-400">{nodeData.errorMessage}</p>
      )}

      <button
        type="button"
        disabled={nodeData.status === "running"}
        className="nodrag mt-1.5 w-full rounded-md bg-accent py-1.5 text-xs font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        onClick={() => void handleRun()}
      >
        {nodeData.status === "running" ? "运行中…" : "运行工作流"}
      </button>

      {configOpen && (
        <ComfyWorkflowConfigModal
          data={nodeData}
          onSave={(patch) => {
            updateNodeData(id, patch);
            setConfigOpen(false);
          }}
          onClose={() => setConfigOpen(false)}
        />
      )}
    </div>
  );
}

export const ComfyWorkflowNode = memo(ComfyWorkflowNodeComponent);
