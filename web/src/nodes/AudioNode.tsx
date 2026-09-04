// 音频节点：可承载用户上传的音频，或未来 AI 生成的音频结果
// 音频没有画面比例问题，节点高度固定，只需要一个 <audio> 播放控件
import { memo, useRef } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import { api } from "../api/client";
import type { AudioNodeData } from "../types";
import { EditableNodeName } from "./EditableNodeName";

function AudioNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AudioNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    try {
      const { url } = await api.uploadFile(file);
      updateNodeData(id, { url, generated: false });
    } catch (err) {
      console.error("上传音频失败", err);
    }
  };

  return (
    <div
      className={`group relative w-[260px] rounded-node border bg-node-bg p-2 shadow-sm transition-colors ${
        selected ? "border-accent" : "border-node-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />

      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-text-secondary">
        <span className="shrink-0">{nodeData.generated ? "生成结果" : "音频"}</span>
        <EditableNodeName
          name={nodeData.name}
          placeholder="双击命名"
          onChange={(name) => updateNodeData(id, { name })}
        />
      </div>

      {nodeData.url ? (
        <div className="nodrag flex h-16 w-full items-center rounded-md bg-canvas px-2">
          <audio src={nodeData.url} className="w-full" controls preload="metadata" />
        </div>
      ) : (
        <button
          type="button"
          className="nodrag flex h-16 w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-panel-border text-xs text-text-secondary hover:border-accent hover:text-accent"
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-lg">+</span>
          <span>点击上传音频</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export const AudioNode = memo(AudioNodeComponent);
