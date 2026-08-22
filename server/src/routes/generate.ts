// 生成接口：根据 modelId 分发到自定义 API 或 ComfyUI 两种执行器，
// 生成结果统一落盘到 data/uploads，返回本服务可访问的 URL
import { Router } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataFile, readJson, UPLOADS_DIR } from "../lib/jsonStore.js";
import type { GenerateRequestBody, ModelConfig } from "../types.js";
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

function extFromContentType(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  return ".png";
}

generateRouter.post("/", async (req, res) => {
  const { modelId, prompt, images = [] } = req.body as GenerateRequestBody;

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

  try {
    let result: { buffer: Buffer; contentType: string };

    if (model.kind === "custom-api") {
      result = await callCustomApiModel(model, prompt ?? "", images ?? []);
    } else if (model.kind === "comfyui") {
      let imageFilename: string | undefined;
      if (model.imageNodeId && images && images.length > 0) {
        const buf = await resolveImageBuffer(images[0]);
        imageFilename = await uploadImageToComfyUi(model.baseUrl, buf, `${randomUUID()}.png`);
      }
      result = await runComfyUiWorkflow(model, prompt ?? "", imageFilename);
    } else {
      res.status(400).json({ error: "未知的模型类型" });
      return;
    }

    const ext = extFromContentType(result.contentType);
    const filename = `${randomUUID()}${ext}`;
    await fs.writeFile(path.join(UPLOADS_DIR, filename), result.buffer);

    res.json({ imageUrl: `/uploads/${filename}` });
  } catch (err: any) {
    console.error("[generate] 生成失败", err);
    res.status(502).json({ error: err?.message ?? "生成失败" });
  }
});
