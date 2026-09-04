// 画布 Agent：调用 OpenAI 兼容的对话接口，让模型根据画布快照返回「说话 + 动作」
export interface AgentSettings {
  baseUrl: string;
  apiKey: string;
  modelName: string;
}

export interface AgentCanvasNode {
  id: string;
  kind: string;
  label: string;
  selected?: boolean;
}

export interface AgentChatRequest {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  canvas: {
    nodes: AgentCanvasNode[];
    selectedIds: string[];
  };
  models: Array<{ id: string; name: string; kind: string; outputType: string }>;
}

export type AgentAction =
  | { op: "add_text"; content: string; x?: number; y?: number }
  | { op: "generate"; prompt: string; modelId?: string; referenceIds?: string[] };

export interface AgentChatResult {
  say: string;
  actions: AgentAction[];
}

const SYSTEM_PROMPT = `你是无限画布上的创作助手。用户会用中文跟你说话，你会看到当前画布上有哪些节点、用户选中了哪些、以及已配置的生成模型。

请只返回一个 JSON 对象，不要输出其它文字，格式：
{"say":"给用户看的中文回复","actions":[...]}

actions 里可以放 0 到多个动作：
- {"op":"add_text","content":"写到画布上的文字"}
- {"op":"generate","prompt":"给生图/生视频模型用的提示词","modelId":"可选，不填则用当前模型","referenceIds":["要引用的节点id"]}

规则：
1. say 必须是简体中文，短、好懂。
2. 用户只是打招呼、问怎么用时，不要生成，只回复。
3. 用户说「帮我生成/画一张/让它动起来/写成视频」时，根据选中的节点写好 prompt，并给出 generate 动作。
4. 图生视频：如果用户想让图片动起来，prompt 写成视频描述，modelId 优先选 outputType 为 video 的模型；如果没有视频模型，在 say 里提醒用户先在模型管理里加一个「生成类型=视频」的模型，不要硬生成。
5. 局部修改、重绘类需求：把要改的地方写进 prompt，referenceIds 带上选中的图片节点。
6. referenceIds 只能用画布快照里真实存在的节点 id。
7. 没有合适模型时，不要瞎选，在 say 里说明。`;

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```/m.exec(trimmed);
  const raw = fence ? fence[1].trim() : trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0) {
    throw new Error("Agent 没有返回有效内容，请换一个对话模型再试");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

function normalizeActions(raw: unknown): AgentAction[] {
  if (!Array.isArray(raw)) return [];
  const actions: AgentAction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const op = (item as any).op;
    if (op === "add_text" && typeof (item as any).content === "string") {
      actions.push({
        op: "add_text",
        content: (item as any).content,
        x: typeof (item as any).x === "number" ? (item as any).x : undefined,
        y: typeof (item as any).y === "number" ? (item as any).y : undefined,
      });
    } else if (op === "generate" && typeof (item as any).prompt === "string") {
      actions.push({
        op: "generate",
        prompt: (item as any).prompt,
        modelId: typeof (item as any).modelId === "string" ? (item as any).modelId : undefined,
        referenceIds: Array.isArray((item as any).referenceIds)
          ? (item as any).referenceIds.filter((id: unknown) => typeof id === "string")
          : undefined,
      });
    }
  }
  return actions;
}

export async function runAgentChat(
  settings: AgentSettings,
  body: AgentChatRequest
): Promise<AgentChatResult> {
  const base = settings.baseUrl.replace(/\/$/, "");
  const endpoint = `${base}/chat/completions`;

  const canvasSummary =
    body.canvas.nodes.length === 0
      ? "画布是空的。"
      : body.canvas.nodes
          .map((n) => `- id=${n.id} 类型=${n.kind} 标签=${n.label}${n.selected ? "（已选中）" : ""}`)
          .join("\n");

  const modelSummary =
    body.models.length === 0
      ? "还没有配置任何生成模型。"
      : body.models.map((m) => `- id=${m.id} 名称=${m.name} 接入=${m.kind} 产出=${m.outputType}`).join("\n");

  const selected = body.canvas.selectedIds.length
    ? body.canvas.selectedIds.join(", ")
    : "无";

  const contextMessage = `当前画布节点：
${canvasSummary}

当前选中节点 id：${selected}

可用生成模型：
${modelSummary}`;

  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "system", content: contextMessage },
    ...body.history.slice(-12).map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: body.message },
  ];

  // 注：不传 temperature。部分模型（如某些推理模型）只支持默认值，
  // 传自定义 temperature 会被网关直接拒绝（400 unsupported_value）。
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${settings.apiKey}`,
    },
    body: JSON.stringify({
      model: settings.modelName,
      messages,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`对话模型调用失败: HTTP ${res.status} ${text}`.slice(0, 400));
  }

  const json = (await res.json()) as any;
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("对话模型没有返回内容");
  }

  let parsed: any;
  try {
    parsed = extractJson(content);
  } catch {
    return { say: content.trim(), actions: [] };
  }

  const say = typeof parsed.say === "string" && parsed.say.trim() ? parsed.say.trim() : "好的。";
  return { say, actions: normalizeActions(parsed.actions) };
}
