// 文本节点：支持直接编辑文本内容，用于承载提示词/脚本等
import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import type { TextNodeData } from "../types";

function TextNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TextNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const [editing, setEditing] = useState(false);

  return (
    <div
      className={`group relative min-w-[220px] max-w-[320px] rounded-node border bg-node-bg px-3 py-2.5 shadow-sm transition-colors ${
        selected ? "border-accent" : "border-node-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />

      <div className="mb-1 flex items-center gap-1 text-[11px] font-medium text-text-secondary">
        <span>文本</span>
      </div>

      {editing ? (
        <textarea
          autoFocus
          className="nodrag w-full resize-none rounded-md border border-panel-border bg-transparent p-1 text-sm text-text-primary outline-none focus:border-accent"
          rows={4}
          value={nodeData.content}
          onChange={(e) => updateNodeData(id, { content: e.target.value })}
          onBlur={() => setEditing(false)}
        />
      ) : (
        <div
          className="nodrag min-h-[3.5rem] cursor-text whitespace-pre-wrap text-sm text-text-primary"
          onDoubleClick={() => setEditing(true)}
        >
          {nodeData.content || (
            <span className="text-text-secondary">双击编辑文本…</span>
          )}
        </div>
      )}
    </div>
  );
}

export const TextNode = memo(TextNodeComponent);
