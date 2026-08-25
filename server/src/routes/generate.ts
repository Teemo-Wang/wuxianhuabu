// 生成接口：根据 modelId 分发到自定义 API 或 ComfyUI 两种执行器，
// 生成结果统一落盘到 data/uploads，返回本服务可访问的 URL（图片/视频/音频）
import { Router } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataFile, readJson, UPLOADS_DIR } from "../lib/jsonStore.js";
import type { GenerateRequestBody, MediaOutputType, ModelConfig } from "../types.js";
import { callCustomApiModel } from "../lib/customApi.js";
import { runComfyUiWorkflow, uploadImageToComfyUi } from "../lib/comfyui.js";

const MODELS_FILE = dataFile("models.json");

export const generateRouter = Router();

/** 将图片引用（本地 /uploads/xxx 或外部 URL）解析为 Buffer，用于喂给 ComfyUI */
async function resolveImageBuffer(imageRef: string): Promise<Buffer> {
  if (imageRef.startsWith("/uploads/")) {
    const filePath = path.join(UPLOADS_DIR, path.basename(imageRef));
    return fs.readFile(filePath);
  }
  const res = await fetch(imageRef);
  if (!res.ok) {
    throw new Error(`下载引用图片失败: ${imageRef}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

function kindFromContentType(contentType: string, fallback: MediaOutputType): MediaOutputType {
  if (contentType.startsWith("video/") || contentType.includes("mp4") || contentType.includes("webm")) {
    return "video";
  }
  if (contentType.startsWith("audio/") || contentType.includes("mpeg") || contentType.includes("wav")) {
    return "audio";
  }
  if (contentType.startsWith("image/")) return "image";
  return fallback;
}

function extFromKind(contentType: string, kind: MediaOutputType): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  if (contentType.includes("webm")) return ".webm";
  if (contentType.includes("mp4")) return ".mp4";
  if (contentType.includes("wav")) return ".wav";
  if (contentType.includes("mpeg") || contentType.includes("mp3")) return ".mp3";
  if (kind === "video") return ".mp4";
  if (kind === "audio") return ".mp3";
  return ".png";
}

generateRouter.post("/", async (req, res) => {
  const { modelId, prompt, images = [], mask } = req.body as GenerateRequestBody;

  if (!modelId) {
    res.status(400).json({ error: "缺少 modelId" });
    return;
  }

  const models = await readJson<ModelConfig[]>(MODELS_FILE, []);
  const model = models.find((m) => m.id === modelId);
  if (!model) {
    res.status(404).json({ error: "模型不存在，请先在模型管理中配置" });
    return;
  }

  const declaredKind: MediaOutputType = model.outputType ?? "image";

  try {
    let result: { buffer: Buffer; contentType: string };

    if (model.kind === "custom-api") {
      const allImages = [...(images ?? [])];
      if (mask && !allImages.includes(mask)) allImages.push(mask);
      result = await callCustomApiModel(model, prompt ?? "", allImages);
    } else if (model.kind === "comfyui") {
      let imageFilename: string | undefined;
      let maskFilename: string | undefined;
      if (model.imageNodeId && images && images.length > 0) {
        const buf = await resolveImageBuffer(images[0]);
        imageFilename = await uploadImageToComfyUi(model.baseUrl, buf, `${randomUUID()}.png`);
      }
      const maskRef = mask || (images && images.length > 1 ? images[1] : undefined);
      if (model.maskNodeId && maskRef) {
        const buf = await resolveImageBuffer(maskRef);
        maskFilename = await uploadImageToComfyUi(model.baseUrl, buf, `${randomUUID()}-mask.png`);
      }
      result = await runComfyUiWorkflow(model, prompt ?? "", imageFilename, {
        maskFilename,
        timeoutMs: declaredKind === "video" ? 15 * 60 * 1000 : 5 * 60 * 1000,
      });
    } else {
      res.status(400).json({ error: "未知的模型类型" });
      return;
    }

    const kind = kindFromContentType(result.contentType, declaredKind);
    const ext = extFromKind(result.contentType, kind);
    const filename = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(UPLOADS_DIR, filename), result.buffer);

    const url = `/uploads/${filename}`;
    res.json({ url, kind, imageUrl: url });
  } catch (err: any) {
    console.error("[generate] 生成失败", err);
    res.status(502).json({ error: err?.message ?? "生成失败" });
  }
});
