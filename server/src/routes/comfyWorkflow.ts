// ComfyUI 工作流节点的执行接口：接收节点自带的 workflow + 输入槎位取值 + 输出槎位配置，
// 提交给 ComfyUI 执行，产出的图片统一落盘到 data/uploads 并返回可访问 URL
import { Router } from "express";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR } from "../lib/jsonStore.js";
import { runComfyWorkflow, type WorkflowInputValue, type WorkflowOutputSpec } from "../lib/comfyWorkflowRunner.js";

export const comfyWorkflowRouter = Router();

interface RunRequestInput {
  nodeId: string;
  field: string;
  type: "text" | "image";
  /** 文本类型直接传字符串；图片类型传图片地址（本地 /uploads/xxx 或外部 URL） */
  value: string;
}

interface RunRequestBody {
  baseUrl: string;
  workflow: Record<string, any>;
  inputs: RunRequestInput[];
  outputs: WorkflowOutputSpec[];
}

/** 将图片引用（本地 /uploads/xxx 或外部 URL）解析为 Buffer */
async function resolveImageBuffer(imageRef: string): Promise<Buffer> {
  if (imageRef.startsWith("/uploads/")) {
    return fs.readFile(path.join(UPLOADS_DIR, path.basename(imageRef)));
  }
  const res = await fetch(imageRef);
  if (!res.ok) throw new Error(`下载引用图片失败: ${imageRef}`);
  return Buffer.from(await res.arrayBuffer());
}

function extFromContentType(contentType: string): string {
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  return ".png";
}

comfyWorkflowRouter.post("/run", async (req, res) => {
  const { baseUrl, workflow, inputs = [], outputs = [] } = req.body as RunRequestBody;

  if (!baseUrl || !workflow) {
    res.status(400).json({ error: "缺少 baseUrl 或 workflow" });
    return;
  }
  if (outputs.length === 0) {
    res.status(400).json({ error: "至少需要配置一个输出槎位" });
    return;
  }

  try {
    const resolvedInputs: WorkflowInputValue[] = await Promise.all(
      inputs.map(async (input): Promise<WorkflowInputValue> => {
        if (input.type === "image") {
          const buffer = await resolveImageBuffer(input.value);
          return { nodeId: input.nodeId, field: input.field, type: "image", value: buffer };
        }
        return { nodeId: input.nodeId, field: input.field, type: "text", value: input.value };
      })
    );

    const results = await runComfyWorkflow(baseUrl, workflow, resolvedInputs, outputs);

    const persisted = await Promise.all(
      results.map(async (r) => {
        const filename = `${randomUUID()}${extFromContentType(r.contentType)}`;
        await fs.writeFile(path.join(UPLOADS_DIR, filename), r.buffer);
        return { slotId: r.slotId, imageUrl: `/uploads/${filename}` };
      })
    );

    res.json({ results: persisted });
  } catch (err: any) {
    console.error("[comfy-workflow] 执行失败", err);
    res.status(502).json({ error: err?.message ?? "执行失败" });
  }
});
