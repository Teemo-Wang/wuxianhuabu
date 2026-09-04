// 图片节点：可承载用户上传的图片，或 AI 生成的结果图；点击缩略图可打开大图预览
// 节点框会按图片真实宽高比自适应（不裁剪），而不是固定成正方形裁切显示
import { memo, useRef, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import { api } from "../api/client";
import type { ImageNodeData } from "../types";
import { useImagePreviewStore } from "../store/imagePreviewStore";
import { useImageEditorStore } from "../store/imageEditorStore";
import { EditableNodeName } from "./EditableNodeName";

/** 图片显示区域的宽高比上下限：避免极端长图/宽图把节点撑得过高或过扁 */
const MIN_RATIO = 220 / 320; // 高度不超过宽度的约 1.45 倍
const MAX_RATIO = 220 / 100; // 宽度不超过高度的约 2.2 倍

function ImageNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ImageNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const openPreview = useImagePreviewStore((s) => s.open);
  const openEditor = useImageEditorStore((s) => s.open);
  const inputRef = useRef<HTMLInputElement>(null);
  // 用 CSS aspect-ratio 让容器跟随图片真实宽高比自适应（不依赖手算像素高度，
  // 也不会受节点内边距影响），图片加载完成前先用默认比例占位，避免过度跳动
  const [aspectRatio, setAspectRatio] = useState(220 / 180);

  const handleUpload = async (file: File) => {
    try {
      const { url } = await api.uploadFile(file);
      updateNodeData(id, { url, generated: false });
    } catch (err) {
      console.error("上传图片失败", err);
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
        <span className="shrink-0">{nodeData.generated ? "生成结果" : "图片"}</span>
        <EditableNodeName
          name={nodeData.name}
          placeholder="双击命名"
          onChange={(name) => updateNodeData(id, { name })}
        />
      </div>

      {nodeData.url ? (
        <div className="relative">
          <button
            type="button"
            className="nodrag block w-full cursor-zoom-in overflow-hidden rounded-md bg-canvas"
            style={{ aspectRatio }}
            onClick={() => openPreview(nodeData.url)}
            title="点击查看完整图片"
          >
            <img
              src={nodeData.url}
              alt=""
              className="h-full w-full object-contain"
              draggable={false}
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (!naturalWidth || !naturalHeight) return;
                const ratio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, naturalWidth / naturalHeight));
                setAspectRatio(ratio);
              }}
            />
          </button>
          <button
            type="button"
            className="nodrag absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-2 py-1 text-[11px] text-white opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              openEditor(id, nodeData.url);
            }}
          >
            打开编辑器
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="nodrag flex h-[180px] w-full flex-col items-center justify-center gap-1 rounded-md border border-dashed border-panel-border text-xs text-text-secondary hover:border-accent hover:text-accent"
          onClick={() => inputRef.current?.click()}
        >
          <span className="text-lg">+</span>
          <span>点击上传图片</span>
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
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

export const ImageNode = memo(ImageNodeComponent);
