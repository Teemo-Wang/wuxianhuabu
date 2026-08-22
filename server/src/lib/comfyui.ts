// ComfyUI 工作流接入：提交 prompt -> 轮询 history -> 通过 /view 取图
import { randomUUID } from "node:crypto";
import type { ComfyUiModelConfig } from "../types.js";

interface ComfyHistoryOutputImage {
  filename: string;
  subfolder: string;
  type: string;
}

/**
 * 深拷贝一份 workflow，并把提示词/图片输入注入到指定节点的指定字段
 */
function buildPrompt(
  config: ComfyUiModelConfig,
  prompt: string,
  imageFilename?: string
): Record<string, any> {
  const workflow = JSON.parse(JSON.stringify(config.workflow));

  const promptNode = workflow[config.promptNodeId];
  if (!promptNode) {
    throw new Error(`ComfyUI workflow 中找不到 promptNodeId=${config.promptNodeId} 对应的节点`);
  }
  promptNode.inputs = promptNode.inputs ?? {};
  promptNode.inputs[config.promptInputField] = prompt;

  if (config.imageNodeId && imageFilename) {
    const imageNode = workflow[config.imageNodeId];
    if (!imageNode) {
      throw new Error(`ComfyUI workflow 中找不到 imageNodeId=${config.imageNodeId} 对应的节点`);
    }
    imageNode.inputs = imageNode.inputs ?? {};
    imageNode.inputs[config.imageInputField ?? "image"] = imageFilename;
  }

  return workflow;
}

/**
 * 上传一张图片到 ComfyUI 的 input 目录，供 LoadImage 节点引用
 * 返回 ComfyUI 侧的文件名，用于填充 workflow 的图片输入字段
 */
export async function uploadImageToComfyUi(
  baseUrl: string,
  imageBuffer: Buffer,
  filename: string
): Promise<string> {
  const form = new FormData();
  const blob = new Blob([imageBuffer]);
  form.append("image", blob, filename);
  form.append("overwrite", "true");

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/upload/image`, {
    method: "POST",
    body: form as any,
  });
  if (!res.ok) {
    throw new Error(`上传图片到 ComfyUI 失败: HTTP ${res.status}`);
  }
  const json = (await res.json()) as { name: string };
  return json.name;
}

/**
 * 提交 workflow 到 ComfyUI 队列，轮询 /history/{prompt_id} 直到完成，
 * 然后取出 outputNodeId 产出的第一张图片，通过 /view 下载并以 Buffer 返回
 */
export async function runComfyUiWorkflow(
  config: ComfyUiModelConfig,
  prompt: string,
  imageFilename: string | undefined,
  opts: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<{ buffer: Buffer; contentType: string }> {
  const base = config.baseUrl.replace(/\/$/, "");
  const clientId = randomUUID();
  const promptId = randomUUID();
  const workflow = buildPrompt(config, prompt, imageFilename);

  const submitRes = await fetch(`${base}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId, prompt_id: promptId }),
  });
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "");
    throw new Error(`提交 ComfyUI 任务失败: HTTP ${submitRes.status} ${text}`);
  }
  const submitJson = (await submitRes.json()) as { prompt_id?: string };
  const finalPromptId = submitJson.prompt_id ?? promptId;

  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const pollIntervalMs = opts.pollIntervalMs ?? 1500;
  const startedAt = Date.now();

  // 轮询 history 直到该 prompt_id 出现结果
  while (Date.now() - startedAt < timeoutMs) {
    const historyRes = await fetch(`${base}/history/${finalPromptId}`);
    if (historyRes.ok) {
      const historyJson = (await historyRes.json()) as Record<string, any>;
      const entry = historyJson[finalPromptId];
      if (entry && entry.outputs) {
        const outputNode = entry.outputs[config.outputNodeId];
        const images: ComfyHistoryOutputImage[] | undefined = outputNode?.images;
        if (images && images.length > 0) {
          const img = images[0];
          const viewUrl = `${base}/view?filename=${encodeURIComponent(
            img.filename
          )}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${encodeURIComponent(
            img.type ?? "output"
          )}`;
          const viewRes = await fetch(viewUrl);
          if (!viewRes.ok) {
            throw new Error(`从 ComfyUI 获取生成图片失败: HTTP ${viewRes.status}`);
          }
          const arrayBuffer = await viewRes.arrayBuffer();
          const contentType = viewRes.headers.get("content-type") ?? "image/png";
          return { buffer: Buffer.from(arrayBuffer), contentType };
        }
      }
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error("等待 ComfyUI 生成结果超时，请检查工作流是否正常运行");
}
