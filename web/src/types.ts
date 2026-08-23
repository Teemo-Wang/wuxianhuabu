// 前端共享类型，结构与 server/src/types.ts 保持一致

export interface CustomApiModelConfig {
  kind: "custom-api";
  method: "GET" | "POST" | "PUT";
  endpoint: string;
  headers: Record<string, string>;
  bodyTemplate: string;
  responseImagePath: string;
  responseIsUrl: boolean;
}

export interface ComfyUiModelConfig {
  kind: "comfyui";
  baseUrl: string;
  workflow: Record<string, any>;
  promptNodeId: string;
  promptInputField: string;
  imageNodeId?: string;
  imageInputField?: string;
  outputNodeId: string;
}

export type ModelConfig = (CustomApiModelConfig | ComfyUiModelConfig) & {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
};

/** 创建/编辑模型时使用的输入类型（不含服务端生成的 id / createdAt） */
export type ModelConfigInput = (CustomApiModelConfig | ComfyUiModelConfig) & {
  name: string;
  color?: string;
};

export interface ThemeConfig {
  [cssVarName: string]: string;
}

/** 首页项目列表条目 */
export interface ProjectSummary {
  id: string;
  name: string;
  thumbnail: string | null;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 单个项目的完整数据（进入编辑页时拉取） */
export interface ProjectFile {
  id: string;
  name: string;
  nodes: any[];
  edges: any[];
  viewport?: { x: number; y: number; zoom: number };
  createdAt: string;
  updatedAt: string;
}

/** 文本节点数据。额外增加索引签名以兼容 React Flow 的 Record<string, unknown> 约束 */
export interface TextNodeData {
  kind: "text";
  content: string;
  [key: string]: unknown;
}

/** 图片节点数据 */
export interface ImageNodeData {
  kind: "image";
  url: string;
  /** 是否由生成产生（区分用户上传 vs AI 生成，便于 UI 展示角标） */
  generated?: boolean;
  sourcePrompt?: string;
  [key: string]: unknown;
}

/** 视频节点数据 */
export interface VideoNodeData {
  kind: "video";
  url: string;
  generated?: boolean;
  sourcePrompt?: string;
  [key: string]: unknown;
}

/** 音频节点数据 */
export interface AudioNodeData {
  kind: "audio";
  url: string;
  generated?: boolean;
  sourcePrompt?: string;
  [key: string]: unknown;
}

/** 生成中占位节点数据 */
export interface GeneratingNodeData {
  kind: "generating";
  prompt: string;
  [key: string]: unknown;
}

export type AppNodeData = TextNodeData | ImageNodeData | VideoNodeData | AudioNodeData | GeneratingNodeData;
