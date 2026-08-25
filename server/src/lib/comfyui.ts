// ComfyUI 工作流接入：提交 prompt -> 轮询 history -> 通过 /view 取图
import { randomUUID } from "node:crypto";
import type { ComfyUiModelConfig } from "../types.js";

interface ComfyHistoryOutputFile {
  filename: string;
  subfolder: string;
  type: string;
}

function injectLoadImage(
  workflow: Record<string, any>,
  nodeId: string,
  field: string,
  filename: string,
  label: string
) {
  const node = workflow[nodeId];
  if (!node) {
    throw new Error(`ComfyUI workflow 中找不到${label}节点 ID=${nodeId}`);
  }
  node.inputs = node.inputs ?? {};
  node.inputs[field] = filename;
}

/**
 * 深拷贝一份 workflow，并把提示词/图片/蒙版输入注入到指定节点的指定字段
 */
function buildPrompt(
  config: ComfyUiModelConfig,
  prompt: string,
  imageFilename?: string,
  maskFilename?: string
): Record<string, any> {
  const workflow = JSON.parse(JSON.stringify(config.workflow));

  const promptNode = workflow[config.promptNodeId];
  if (!promptNode) {
    throw new Error(`ComfyUI workflow 中找不到 promptNodeId=${config.promptNodeId} 对应的节点`);
  }
  promptNode.inputs = promptNode.inputs ?? {};
  promptNode.inputs[config.promptInputField] = prompt;

  if (config.imageNodeId && imageFilename) {
    injectLoadImage(
      workflow,
      config.imageNodeId,
      config.imageInputField ?? "image",
      imageFilename,
      "图片输入"
    );
  }

  if (config.maskNodeId && maskFilename) {
    injectLoadImage(
      workflow,
      config.maskNodeId,
      config.maskInputField ?? "image",
      maskFilename,
      "蒙版输入"
    );
  }

  return workflow;
}

/** ComfyUI 历史记录里图片/视频/音频可能落在不同字段，按优先级取第一个文件 */
function pickOutputFile(outputNode: any): ComfyHistoryOutputFile | null {
  const lists = [outputNode?.images, outputNode?.gifs, outputNode?.videos, outputNode?.audio];
  for (const list of lists) {
    if (Array.isArray(list) && list[0]?.filename) {
      return list[0] as ComfyHistoryOutputFile;
    }
  }
  return null;
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
  opts: { timeoutMs?: number; pollIntervalMs?: number; maskFilename?: string } = {}
): Promise<{ buffer: Buffer; contentType: string }> {
  const base = config.baseUrl.replace(/\/$/, "");
  const clientId = randomUUID();
  const promptId = randomUUID();
  const workflow = buildPrompt(config, prompt, imageFilename, opts.maskFilename);

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
        const file = pickOutputFile(outputNode);
        if (file) {
          const viewUrl = `${base}/view?filename=${encodeURIComponent(
            file.filename
          )}&subfolder=${encodeURIComponent(file.subfolder ?? "")}&type=${encodeURIComponent(
            file.type ?? "output"
          )}`;
          const viewRes = await fetch(viewUrl);
          if (!viewRes.ok) {
            throw new Error(`从 ComfyUI 获取生成结果失败: HTTP ${viewRes.status}`);
          }
          const arrayBuffer = await viewRes.arrayBuffer();
          const headerType = viewRes.headers.get("content-type") ?? "";
          const contentType = contentTypeFromFilename(file.filename, headerType);
          return { buffer: Buffer.from(arrayBuffer), contentType };
        }
      }
    }
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }

  throw new Error("等待 ComfyUI 生成结果超时，请检查工作流是否正常运行");
}

function contentTypeFromFilename(filename: string, headerType: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) {
    if (lower.endsWith(".webm")) return "video/webm";
    return "video/mp4";
  }
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (headerType && !headerType.includes("octet-stream")) return headerType;
  return "image/png";
}
