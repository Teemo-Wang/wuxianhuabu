// 图片编辑二级页：全屏进入，可涂鸦标注、画蒙版、添加文字，
// 支持撤销重做；保存写回节点；底部可选用模型做局部重绘/图生图
import { useEffect, useRef, useState } from "react";
import { useImageEditorStore } from "../store/imageEditorStore";
import { useCanvasStore } from "../store/canvasStore";
import { useModelStore } from "../store/modelStore";
import { api } from "../api/client";

type Tool = "select" | "pen" | "mask" | "text";

type DrawItem =
  | { kind: "stroke"; role: "draw" | "mask"; color: string; width: number; points: { x: number; y: number }[] }
  | { kind: "text"; x: number; y: number; text: string; color: string; fontSize: number };

const PRESET_COLORS = ["#ff3b30", "#ffcc00", "#34c759", "#0a84ff", "#ffffff"];

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("导出图片失败"));
    }, "image/png");
  });
}

export function ImageEditorModal() {
  const nodeId = useImageEditorStore((s) => s.nodeId);
  const url = useImageEditorStore((s) => s.url);
  const close = useImageEditorStore((s) => s.close);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const models = useModelStore((s) => s.models);
  const activeModelId = useModelStore((s) => s.activeModelId);
  const setActiveModel = useModelStore((s) => s.setActiveModel);

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
  const [generating, setGenerating] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const imageModels = models.filter((m) => (m.outputType ?? "image") === "image");
  const editorModelId =
    activeModelId && imageModels.some((m) => m.id === activeModelId)
      ? activeModelId
      : (imageModels[0]?.id ?? null);

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
        ctx.save();
        if (item.role === "mask") {
          ctx.strokeStyle = "rgba(255, 59, 48, 0.55)";
          ctx.lineWidth = Math.max(item.width, 12);
        } else {
          ctx.strokeStyle = item.color;
          ctx.lineWidth = item.width;
        }
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(item.points[0].x, item.points[0].y);
        for (const p of item.points.slice(1)) ctx.lineTo(p.x, p.y);
        ctx.stroke();
        ctx.restore();
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

  const toCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "pen" || tool === "mask") {
      const point = toCanvasPoint(e);
      currentStrokeRef.current = {
        kind: "stroke",
        role: tool === "mask" ? "mask" : "draw",
        color,
        width: tool === "mask" ? Math.max(penWidth * 4, 24) : penWidth,
        points: [point],
      };
      redraw([...items, currentStrokeRef.current]);
    } else if (tool === "text") {
      setPendingTextPos(toCanvasPoint(e));
      setTextDraft("");
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if ((tool !== "pen" && tool !== "mask") || !currentStrokeRef.current) return;
    const point = toCanvasPoint(e);
    currentStrokeRef.current.kind === "stroke" && currentStrokeRef.current.points.push(point);
    redraw([...items, currentStrokeRef.current]);
  };

  const handlePointerUp = () => {
    if ((tool === "pen" || tool === "mask") && currentStrokeRef.current) {
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

  const exportComposite = async (): Promise<File> => {
    const canvas = canvasRef.current;
    if (!canvas) throw new Error("画布未就绪");
    const blob = await canvasToBlob(canvas);
    return new File([blob], "edited.png", { type: "image/png" });
  };

  const exportOriginal = async (): Promise<File> => {
    const img = imageRef.current;
    if (!img) throw new Error("原图未加载");
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("无法导出原图");
    ctx.drawImage(img, 0, 0);
    const blob = await canvasToBlob(c);
    return new File([blob], "original.png", { type: "image/png" });
  };

  const exportMask = async (): Promise<File | null> => {
    const maskStrokes = items.filter((i) => i.kind === "stroke" && i.role === "mask") as Extract<
      DrawItem,
      { kind: "stroke" }
    >[];
    if (maskStrokes.length === 0) return null;
    const src = canvasRef.current;
    if (!src) return null;
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const stroke of maskStrokes) {
      if (stroke.points.length < 2) continue;
      ctx.lineWidth = stroke.width;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (const p of stroke.points.slice(1)) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    const blob = await canvasToBlob(c);
    return new File([blob], "mask.png", { type: "image/png" });
  };

  const handleSave = async () => {
    if (!nodeId) return;
    setSaving(true);
    setHint(null);
    try {
      const file = await exportComposite();
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

  const handleGenerate = async () => {
    if (!nodeId) return;
    if (!editorModelId) {
      setHint("请先在模型管理里添加一个「生成类型=图片」的模型");
      return;
    }
    if (!prompt.trim()) {
      setHint("请先填写要改成什么样");
      return;
    }
    setGenerating(true);
    setHint(null);
    try {
      const maskFile = await exportMask();
      const imageFile = maskFile ? await exportOriginal() : await exportComposite();
      const uploadedImage = await api.uploadFile(imageFile);
      const images = [uploadedImage.url];
      let maskUrl: string | undefined;
      if (maskFile) {
        const uploadedMask = await api.uploadFile(maskFile);
        maskUrl = uploadedMask.url;
        images.push(maskUrl);
      }
      const result = await api.generate({
        modelId: editorModelId,
        prompt: prompt.trim(),
        images,
        mask: maskUrl,
      });
      const newUrl = result.url ?? result.imageUrl;
      if ((result.kind ?? "image") !== "image") {
        setHint("局部重绘需要图片模型，请把该模型的生成类型改成「图片」");
        return;
      }
      updateNodeData(nodeId, { url: newUrl, generated: true, sourcePrompt: prompt.trim() });
      useImageEditorStore.setState({ url: newUrl });
      setPrompt("");
      setHint("已生成并写回图片节点");
    } catch (err: any) {
      console.error("局部重绘失败", err);
      setHint(err?.message ?? "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  if (!url || !nodeId) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div className="flex items-center justify-between border-b border-panel-border bg-panel px-4 py-2">
        <div className="flex items-center gap-1">
          {(
            [
              { tool: "select" as Tool, label: "选择" },
              { tool: "pen" as Tool, label: "画笔" },
              { tool: "mask" as Tool, label: "蒙版" },
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

          {(tool === "pen" || tool === "mask") && (
            <div className="ml-2 flex items-center gap-1.5 border-l border-panel-border pl-2">
              {tool === "pen" &&
                PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-5 w-5 rounded-full border-2 ${color === c ? "border-accent" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              {tool === "mask" && (
                <span className="text-[11px] text-text-secondary">红色区域会被重绘</span>
              )}
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
          {hint && (
            <span
              className={`max-w-[360px] truncate text-xs ${
                hint.startsWith("已生成") ? "text-accent" : "text-red-400"
              }`}
            >
              {hint}
            </span>
          )}
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

      <div className="relative flex flex-1 items-center justify-center overflow-hidden p-6">
        <canvas
          ref={canvasRef}
          className="max-h-full max-w-full rounded-lg shadow-2xl"
          style={{
            cursor: tool === "pen" || tool === "mask" ? "crosshair" : tool === "text" ? "text" : "default",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        />

        {pendingTextPos && (
          <div
            className="absolute z-10"
            style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}
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

      <div className="flex items-center gap-2 border-t border-panel-border bg-panel px-4 py-3">
        <select
          className="w-40 shrink-0 rounded-md border border-panel-border bg-canvas px-2 py-2 text-xs text-text-primary"
          value={editorModelId ?? ""}
          onChange={(e) => setActiveModel(e.target.value || null)}
        >
          {imageModels.length === 0 ? (
            <option value="">没有图片模型</option>
          ) : (
            imageModels.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))
          )}
        </select>
        <input
          className="flex-1 rounded-md border border-panel-border bg-canvas px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
          placeholder="用蒙版涂要改的地方，然后写「把这里改成……」；不涂蒙版则整张图按提示词重绘"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleGenerate();
          }}
        />
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          disabled={generating}
          onClick={() => void handleGenerate()}
        >
          {generating ? "生成中…" : "局部重绘"}
        </button>
      </div>
    </div>
  );
}
