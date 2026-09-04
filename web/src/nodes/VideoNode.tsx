// 视频节点：可承载用户上传的视频，或未来 AI 生成的视频结果
// 节点内直接用 <video> 控件预览播放，不需要额外的大图预览弹窗
import { memo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import { api } from "../api/client";
import type { VideoNodeData } from "../types";
import { EditableNodeName } from "./EditableNodeName";

/** 视频显示区域的宽高比上下限：避免竖屏/超宽视频把节点撑得过高或过扁 */
const MIN_RATIO = 220 / 320;
const MAX_RATIO = 220 / 100;

function VideoNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as VideoNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const inputRef = useRef<HTMLInputElement>(null);
  const [aspectRatio, setAspectRatio] = useState(220 / 180);

  const handleUpload = async (file: File) => {
    try {
      const { url } = await api.uploadFile(file);
      updateNodeData(id, { url, generated: false });
    } catch (err) {
      console.error("上传视频失败", err);
    }
  };

  return (
    <div
      className={`group relative w-[220px] rounded-node border bg-node-bg p-2 shadow-sm transition-colors ${
        selected ? "border-accent" : "border-node-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />

      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-text-secondary">
        <span className="shrink-0">{nodeData.generated ? "生成结果" : "视频"}</span>
        <EditableNodeName
          name={nodeData.name}
          placeholder="双击命名"
          onChange={(name) => updateNodeData(id, { name })}
        />
      </div>

      {nodeData.url ? (
        <div className="nodrag w-full overflow-hidden rounded-md bg-canvas" style={{ aspectRatio }}>
          <video
            src={nodeData.url}
            className="h-full w-full object-contain"
            controls
            preload="metadata"
            onLoadedMetadata={(e) => {
              const { videoWidth, videoHeight } = e.currentTarget;
              if (!videoWidth || !videoHeight) return;
              const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, videoWidth / videoHeight));
              setAspectRatio(ratio);
            }}
          />
        </div>
      ) : (
        <button
          type="button"
          className="nodrag flex h-[180px] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-panel-border text-xs text-text-secondary hover:border-accent hover:text-accent"
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-lg">+</span>
          <span>点击上传视频</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/*"
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

export const VideoNode = memo(VideoNodeComponent);
