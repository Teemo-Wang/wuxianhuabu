// 图片编辑二级页（MVP 框架）：全屏进入，可在原图上自由涂鸦标注 / 添加文字，
// 支持撤销重做，保存后导出为新图片并写回节点。局部重绘生成先留出入口，后续再接生成逻辑。
import { useEffect, useRef, useState } from "react";
import { useImageEditorStore } from "../store/imageEditorStore";
import { useCanvasStore } from "../store/canvasStore";
import { api } from "../api/client";

type Tool = "select" | "pen" | "text";

type DrawItem =
  | { kind: "stroke"; color: string; width: number; points: { x: number; y: number }[] }
  | { kind: "text"; x: number; y: number; text: string; color: string; fontSize: number };

const PRESET_COLORS = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#ffffff"];

export function ImageEditorModal() {
  const nodeId = useImageEditorStore((s) => s.nodeId);
  const url = useImageEditorStore((s) => s.url);
  const close = useImageEditorStore((s) => s.close);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const currentStrokeRef = useRef<DrawItem | null>(null);

  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [penWidth, setPenWidth] = useState(4);
  const [items, setItems] = useState<DrawItem[]>([]);
  const [redoStack, setRedoStack] = useState<DrawItem[]>([]);
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);
  const [textDraft, setTextDraft] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // 加载原图并按图片真实尺寸设置画布分辨率（内部像素与图片一致，展示时用 CSS 缩放适配屏幕）
  useEffect(() => {
    if (!url) return;
    setItems([]);
    setRedoStack([]);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      redraw([]);
    };
    img.src = url;
  }, [url]);

  const redraw = (drawItems: DrawItem[]) => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    for (const item of drawItems) {
      if (item.kind === "stroke") {
        if (item.points.length < 2) continue;
        ctx.strokeStyle = item.color;
        ctx.lineWidth = item.width;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (const p of item.points.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.stroke();
      } else {
        ctx.fillStyle = item.color;
        ctx.font = `${item.fontSize}px -apple-system, sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(item.text, item.x, item.y);
      }
    }
  };

  useEffect(() => {
    redraw(items);
  }, [items]);

  /** 把鼠标事件的客户端坐标换算成画布内部像素坐标（因为画布可能被 CSS 缩放显示） */
  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "pen") {
      const point = toCanvasPoint(e);
      currentStrokeRef.current = { kind: "stroke", color, width: penWidth, points: [point] };
      redraw([...items, currentStrokeRef.current]);
    } else if (tool === "text") {
      setPendingTextPos(toCanvasPoint(e));
      setTextDraft("");
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool !== "pen" || !currentStrokeRef.current) return;
    const point = toCanvasPoint(e);
    currentStrokeRef.current.kind === "stroke" && currentStrokeRef.current.points.push(point);
    redraw([...items, currentStrokeRef.current]);
  };

  const handlePointerUp = () => {
    if (tool === "pen" && currentStrokeRef.current) {
      setItems((prev) => [...prev, currentStrokeRef.current as DrawItem]);
      setRedoStack([]);
      currentStrokeRef.current = null;
    }
  };

  const commitText = () => {
    if (!pendingTextPos || !textDraft.trim()) {
      setPendingTextPos(null);
      return;
    }
    const item: DrawItem = { kind: "text", x: pendingTextPos.x, y: pendingTextPos.y, text: textDraft, color, fontSize: 28 };
    setItems((prev) => [...prev, item]);
    setRedoStack([]);
    setPendingTextPos(null);
    setTextDraft("");
  };

  const undo = () => {
    if (items.length === 0) return;
    const last = items[items.length - 1];
    setItems((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, last]);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setItems((prev) => [...prev, last]);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !nodeId) return;
    setSaving(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("导出图片失败");
      const file = new File([blob], "edited.png", { type: "image/png" });
      const { url: newUrl } = await api.uploadFile(file);
      updateNodeData(nodeId, { url: newUrl, generated: false });
      close();
    } catch (err: any) {
      console.error("保存编辑结果失败", err);
      setHint(err?.message ?? "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (!url || !nodeId) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      {/* 顶部工具条：选择 / 画笔 / 文字 / 撤销 / 重做 / 关闭 / 保存 */}
      <div className="flex items-center justify-between border-b border-panel-border bg-panel px-4 py-2">
        <div className="flex items-center gap-1">
          {(
            [
              { tool: "select" as Tool, label: "选择" },
              { tool: "pen" as Tool, label: "画笔" },
              { tool: "text" as Tool, label: "文字" },
            ] as const
          ).map((item) => (
            <button
              key={item.tool}
              type="button"
              className={`rounded-md px-3 py-1.5 text-xs ${
                tool === item.tool
                  ? "bg-accent text-accent-fg"
                  : "text-text-secondary hover:bg-accent/10 hover:text-text-primary"
              }`}
              onClick={() => setTool(item.tool)}
            >
              {item.label}
            </button>
          ))}

          {tool === "pen" && (
            <div className="ml-2 flex items-center gap-1.5 border-l border-panel-border pl-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-accent" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
              <select
                className="ml-1 rounded-md border border-panel-border bg-canvas px-1 py-0.5 text-xs text-text-primary"
                value={penWidth}
                onChange={(e) => setPenWidth(Number(e.target.value))}
              >
                <option value={2}>细</option>
                <option value={4}>中</option>
                <option value={8}>粗</option>
              </select>
            </div>
          )}

          <div className="ml-2 flex items-center gap-1 border-l border-panel-border pl-2">
            <button
              type="button"
              disabled={items.length === 0}
              className="rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-accent/10 hover:text-text-primary disabled:opacity-40"
              onClick={undo}
            >
              撤销
            </button>
            <button
              type="button"
              disabled={redoStack.length === 0}
              className="rounded-md px-2 py-1.5 text-xs text-text-secondary hover:bg-accent/10 hover:text-text-primary disabled:opacity-40"
              onClick={redo}
            >
              重做
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hint && <span className="text-xs text-red-400">{hint}</span>}
          <button
            type="button"
            className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            onClick={close}
          >
            关闭
          </button>
          <button
            type="button"
            disabled={saving}
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
            onClick={() => void handleSave()}
          >
            {saving ? "保存中…" : "保存"}
          </button>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full rounded-lg shadow-2xl"
          style={{ cursor: tool === "pen" ? "crosshair" : tool === "text" ? "text" : "default" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {/* 文字工具点击画布后的内联输入框 */}
        {pendingTextPos && (
          <div
            className="absolute z-10"
            style={{
              // pendingTextPos 是画布内部像素坐标，这里简化为直接叠加在画布容器的中心区域附近，
              // 精确定位留给后续迭代（MVP 阶段以可用为先）
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="flex items-center gap-1.5 rounded-lg border border-panel-border bg-panel p-1.5 shadow-xl">
              <input
                autoFocus
                className="w-40 rounded-md border border-panel-border bg-canvas px-2 py-1 text-sm text-text-primary outline-none focus:border-accent"
                placeholder="输入文字后按 Enter"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitText();
                  if (e.key === "Escape") setPendingTextPos(null);
                }}
              />
              <button
                type="button"
                className="rounded-md bg-accent px-2 py-1 text-xs text-accent-fg"
                onClick={commitText}
              >
                确定
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 底部提示词输入条：为后续接入「局部重绘生成」预留入口 */}
      <div className="flex items-center gap-2 border-t border-panel-border bg-panel px-4 py-3">
        <input
          className="flex-1 rounded-md border border-panel-border bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          placeholder="请输入图像生成的提示词（局部重绘生成功能开发中）"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button
          type="button"
          className="rounded-md border border-panel-border px-4 py-2 text-xs text-text-secondary"
          disabled
          title="局部重绘生成功能开发中，先提供标注框架"
        >
          生成
        </button>
      </div>
    </div>
  );
}
