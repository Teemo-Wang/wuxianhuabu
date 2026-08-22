// 自定义 HTTP API 模型接入：根据用户配置的 endpoint/headers/bodyTemplate 发起请求，
// 并按 responseImagePath 从响应 JSON 中取出图片地址（URL 或 base64）
import type { CustomApiModelConfig } from "../types.js";

/**
 * 按点号路径从对象中取值，支持数组下标，如 "data.images.0.url"
 */
function getByPath(obj: any, pathStr: string): any {
  return pathStr
    .split(".")
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

/**
 * 将 bodyTemplate 中的占位符替换为实际值：
 * {{prompt}} -> 文本，会做 JSON 字符串转义
 * {{images}} -> 图片 URL 数组，整体替换为 JSON 数组
 * {{image0}} {{image1}} ... -> 单个图片 URL 字符串
 */
function renderBodyTemplate(template: string, prompt: string, images: string[]): string {
  let rendered = template;

  rendered = rendered.replaceAll("{{images}}", JSON.stringify(images));
  images.forEach((img, idx) => {
    rendered = rendered.replaceAll(`{{image${idx}}}`, JSON.stringify(img).slice(1, -1));
  });
  // prompt 最后替换，且需要转义引号防止破坏 JSON 结构
  const escapedPrompt = JSON.stringify(prompt).slice(1, -1);
  rendered = rendered.replaceAll("{{prompt}}", escapedPrompt);

  return rendered;
}

/**
 * 调用自定义 API 模型，返回图片的 Buffer 与 contentType。
 * 若响应给的是可访问 URL，则由本函数二次下载转成 Buffer，保证前端统一通过本服务落盘的图片访问。
 */
export async function callCustomApiModel(
  config: CustomApiModelConfig,
  prompt: string,
  images: string[]
): Promise<{ buffer: Buffer; contentType: string }> {
  const bodyStr = renderBodyTemplate(config.bodyTemplate, prompt, images);

  let body: BodyInit | undefined;
  const headers: Record<string, string> = { ...config.headers };
  if (config.method !== "GET") {
    body = bodyStr;
    if (!Object.keys(headers).some((h) => h.toLowerCase() === "content-type")) {
      headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(config.endpoint, {
    method: config.method,
    headers,
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`调用自定义模型接口失败: HTTP ${res.status} ${text}`);
  }

  const json = await res.json();
  const value = getByPath(json, config.responseImagePath);
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(
      `自定义模型响应中未找到图片数据，responseImagePath="${config.responseImagePath}"`
    );
  }

  if (config.responseIsUrl) {
    const imgRes = await fetch(value);
    if (!imgRes.ok) {
      throw new Error(`下载模型返回的图片失败: HTTP ${imgRes.status}`);
    }
    const arrayBuffer = await imgRes.arrayBuffer();
    const contentType = imgRes.headers.get("content-type") ?? "image/png";
    return { buffer: Buffer.from(arrayBuffer), contentType };
  }

  // base64（可能带 data:image/xxx;base64, 前缀）
  const match = /^data:(.+);base64,(.*)$/.exec(value);
  if (match) {
    return { buffer: Buffer.from(match[2], "base64"), contentType: match[1] };
  }
  return { buffer: Buffer.from(value, "base64"), contentType: "image/png" };
}
