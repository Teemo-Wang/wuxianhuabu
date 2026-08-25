// 「简易模式」自定义 API 模型：把用户只需要填的几个基础字段
// （API 地址、密钥、模型名、图片尺寸、响应格式）自动拼装成完整的
// endpoint / headers / bodyTemplate / responseImagePath / responseIsUrl 配置，
// 免去手写 JSON 请求体模板和响应路径的门槛。适用于 OpenAI 兼容的 images 接口
// （官方 API 或各类中转/代理服务，如 One API 类平台）
import type { CustomApiModelConfig } from "../types";

export interface SimpleApiFields {
  baseUrl: string;
  apiKey: string;
  modelName: string;
  size: string;
  responseFormat: "url" | "b64_json";
}

const DEFAULT_SIZE = "1024x1024";

export function defaultSimpleFields(): SimpleApiFields {
  return { baseUrl: "", apiKey: "", modelName: "", size: DEFAULT_SIZE, responseFormat: "url" };
}

/** 根据简易字段生成完整的自定义 API 模型配置 */
export function buildSimpleApiConfig(fields: SimpleApiFields): Omit<CustomApiModelConfig, "kind"> {
  const endpoint = `${fields.baseUrl.replace(/\/$/, "")}/images/generations`;
  // {{prompt}} 占位符会在实际请求时被替换为转义后的字符串，这里只需按 JSON 结构占位即可
  const bodyTemplate = JSON.stringify(
    {
      model: fields.modelName,
      prompt: "{{prompt}}",
      n: 1,
      size: fields.size,
      response_format: fields.responseFormat,
    },
    null,
    2
  );

  return {
    method: "POST",
    endpoint,
    headers: { Authorization: `Bearer ${fields.apiKey}` },
    bodyTemplate,
    responseImagePath: fields.responseFormat === "url" ? "data.0.url" : "data.0.b64_json",
    responseIsUrl: fields.responseFormat === "url",
    simpleMode: true,
    simpleBaseUrl: fields.baseUrl,
    simpleApiKey: fields.apiKey,
    simpleModelName: fields.modelName,
    simpleSize: fields.size,
    simpleResponseFormat: fields.responseFormat,
  };
}

/** 从已保存的模型配置里还原简易字段（编辑时回填表单用） */
export function simpleFieldsFromConfig(config: CustomApiModelConfig): SimpleApiFields {
  return {
    baseUrl: config.simpleBaseUrl ?? "",
    apiKey: config.simpleApiKey ?? "",
    modelName: config.simpleModelName ?? "",
    size: config.simpleSize ?? DEFAULT_SIZE,
    responseFormat: config.simpleResponseFormat ?? "url",
  };
}
