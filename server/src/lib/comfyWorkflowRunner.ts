// 通用 ComfyUI 工作流执行器：与 lib/comfyui.ts（面向「模型」抽象、固定 prompt/image/output 三个槎位）不同，
// 这里服务于「ComfyUI 工作流节点」——节点自带完整 workflow，并可以配置任意数量的输入/输出槎位
import { randomUUID } from "node:crypto";

export interface WorkflowInputValue {
  nodeId: string;
  field: string;
  type: "text" | "image";
  /** 文本类型直接传字符串；图片类型传图片的 Buffer（由调用方先读取/下载好） */
  value: string | Buffer;
}

export interface WorkflowOutputSpec {
  /** 槎位 id，用于回传结果时让前端知道这是哪个输出槎位产出的 */
  slotId: string;
  nodeId: string;
}

export interface WorkflowOutputResult {
  slotId: string;
  buffer: Buffer;
  contentType: string;
}

/** 上传一张图片到 ComfyUI 的 input 目录，返回 ComfyUI 侧的文件名 */
async function uploadImage(baseUrl: string, buffer: Buffer, filename: string): Promise<string> {
  const form = new FormData();
  form.append("image", new Blob([buffer]), filename);
  form.append("overwrite", "true");
  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/upload/image`, { method: "POST", body: form as any });
  if (!res.ok) throw new Error(`上传图片到 ComfyUI 失败: HTTP ${res.status}`);
  const json = (await res.json()) as { name: string };
  return json.name;
}

/**
 * 深拷贝 workflow，并把每个输入槎位的值写入对应节点的对应字段。
 * 图片类型的值会先上传到 ComfyUI，再把返回的文件名写入字段。
 */
async function buildPrompt(
  baseUrl: string,
  workflow: Record<string, any>,
  inputs: WorkflowInputValue[]
): Promise<Record<string, any>> {
  const cloned = JSON.parse(JSON.stringify(workflow));

  for (const input of inputs) {
    const node = cloned[input.nodeId];
    if (!node) {
      throw new Error(`workflow 中找不到节点 ID「${input.nodeId}」，请检查输入槎位配置`);
    }
    node.inputs = node.inputs ?? {};

    if (input.type === "image") {
      const buffer = Buffer.isBuffer(input.value) ? input.value : Buffer.from(input.value as string);
      const filename = await uploadImage(baseUrl, buffer, `${randomUUID()}.png`);
      node.inputs[input.field] = filename;
    } else {
      node.inputs[input.field] = String(input.value);
    }
  }

  return cloned;
}

interface ComfyHistoryImage {
  filename: string;
  subfolder: string;
  type: string;
}

/**
 * 提交工作流到 ComfyUI 队列，轮询 /history 直到完成，
 * 然后按 outputs 配置的每个节点 ID 分别取出产出的第一张图片
 */
export async function runComfyWorkflow(
  baseUrl: string,
  workflow: Record<string, any>,
  inputs: WorkflowInputValue[],
  outputs: WorkflowOutputSpec[],
  opts: { timeoutMs?: number; pollIntervalMs?: number } = {}
): Promise<WorkflowOutputResult[]> {
  const base = baseUrl.replace(/\/$/, "");
  const clientId = randomUUID();
  const promptId = randomUUID();
  const prompt = await buildPrompt(base, workflow, inputs);

  let submitRes: Response;
  try {
    submitRes = await fetch(`${base}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, client_id: clientId, prompt_id: promptId }),
    });
  } catch (err: any) {
    throw new Error(`无法连接到 ComfyUI 服务（${base}），请检查地址是否正确、服务是否已启动`);
  }
  if (!submitRes.ok) {
    const text = await submitRes.text().catch(() => "");
    throw new Error(`提交 ComfyUI 任务失败: HTTP ${submitRes.status} ${text}`);
  }
  const submitJson = (await submitRes.json()) as { prompt_id?: string };
  const finalPromptId = submitJson.prompt_id ?? promptId;

  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const pollIntervalMs = opts.pollIntervalMs ?? 1500;
  const startedAt = Date.now();
  const results: WorkflowOutputResult[] = [];
  const pending = new Set(outputs.map((o) => o.slotId));

  while (Date.now() - startedAt < timeoutMs && pending.size > 0) {
    const historyRes = await fetch(`${base}/history/${finalPromptId}`);
    if (historyRes.ok) {
      const historyJson = (await historyRes.json()) as Record<string, any>;
      const entry = historyJson[finalPromptId];
      if (entry && entry.outputs) {
        for (const output of outputs) {
          if (!pending.has(output.slotId)) continue;
          const outputNode = entry.outputs[output.nodeId];
          const images: ComfyHistoryImage[] | undefined = outputNode?.images;
          if (images && images.length > 0) {
            const img = images[0];
            const viewUrl = `${base}/view?filename=${encodeURIComponent(
              img.filename
            )}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${encodeURIComponent(
              img.type ?? "output"
            )}`;
            const viewRes = await fetch(viewUrl);
            if (!viewRes.ok) throw new Error(`从 ComfyUI 获取输出「${output.slotId}」失败: HTTP ${viewRes.status}`);
            const arrayBuffer = await viewRes.arrayBuffer();
            const contentType = viewRes.headers.get("content-type") ?? "image/png";
            results.push({ slotId: output.slotId, buffer: Buffer.from(arrayBuffer), contentType });
            pending.delete(output.slotId);
          }
        }
      }
    }
    if (pending.size > 0) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
  }

  if (pending.size > 0) {
    throw new Error(`等待 ComfyUI 生成结果超时，未完成的输出槎位: ${[...pending].join(", ")}`);
  }

  return results;
}
