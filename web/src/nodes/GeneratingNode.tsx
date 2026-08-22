// 生成中占位节点：生成请求发出后立即落地在画布上，完成后会被替换为图片节点
import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { GeneratingNodeData } from "../types";

function GeneratingNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as GeneratingNodeData;

  return (
    <div
      className={`w-[220px] rounded-node border bg-node-bg p-2 shadow-sm transition-colors ${
        selected ? "border-accent" : "border-node-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />

      <div className="mb-1 text-[11px] font-medium text-text-secondary">生成中</div>
      <div className="flex h-[180px] w-full flex-col items-center justify-center gap-2 rounded-md border border-panel-border bg-panel/40">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        {nodeData.prompt && (
          <p className="line-clamp-3 px-3 text-center text-[11px] text-text-secondary">
            {nodeData.prompt}
          </p>
        )}
      </div>
    </div>
  );
}

export const GeneratingNode = memo(GeneratingNodeComponent);
