// 服务端共享类型定义
// 说明：为保持 Demo 简单，未使用 monorepo 共享包，前端 web/src/types.ts 中维护结构一致的类型

/** 画布节点通用结构，具体内容由 data 字段区分类型 */
export interface CanvasNodeData {
  id: string;
  type: "text" | "image" | "video" | "audio" | "comfy-workflow" | "skill" | "generating";
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

/** ComfyUI 工作流节点的单个输入/输出槎位（与前端 types.ts 保持一致） */
export interface ComfyWorkflowIOSlot {
  id: string;
  label: string;
  nodeId: string;
  field?: string;
  type: "text" | "image";
}

/** Skill 库条目：预设好的一段 Markdown 提示词模板 */
export interface SkillEntry {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** 画布连线 */
export interface CanvasEdgeData {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

/** 单个项目的完整数据（画布 + 元信息），落盘为 data/projects/{id}.json */
export interface ProjectFile {
  id: string;
  name: string;
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  viewport?: { x: number; y: number; zoom: number };
  createdAt: string;
  updatedAt: string;
}

/** 画布快照（不含项目元信息），用于前端读取/保存画布内容 */
export interface CanvasSnapshot {
  nodes: CanvasNodeData[];
  edges: CanvasEdgeData[];
  viewport?: { x: number; y: number; zoom: number };
  updatedAt: string;
}

/** 首页项目列表里的一个项目条目（个人使用场景下，一个工作空间内可以有多个项目） */
export interface ProjectSummary {
  id: string;
  name: string;
  /** 项目封面缩略图地址，取自画布中第一张有效图片节点，可能为空 */
  thumbnail: string | null;
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 自定义 HTTP API 模型配置 */
export interface CustomApiModelConfig {
  kind: "custom-api";
  method: "GET" | "POST" | "PUT";
  endpoint: string;
  /** 额外请求头，例如 Authorization */
  headers: Record<string, string>;
  /**
   * 请求体模板（JSON 字符串），支持占位符：
   * {{prompt}} - 生成面板输入的文本
   * {{images}} - 引用的图片 URL 数组（JSON 数组占位，替换时会整体替换为 JSON）
   * {{image0}}, {{image1}} ... - 按顺序引用的单张图片 URL
   */
  bodyTemplate: string;
  /** 从响应 JSON 中提取图片地址的路径，点号分隔，如 data.images.0.url */
  responseImagePath: string;
  /** 响应图片地址是否已经是完整可访问 URL（否则视为 base64） */
  responseIsUrl: boolean;
}

/** ComfyUI 工作流模型配置 */
export interface ComfyUiModelConfig {
  kind: "comfyui";
  /** ComfyUI 服务地址，如 http://127.0.0.1:8188 */
  baseUrl: string;
  /** 导出的 API 格式 workflow JSON（节点图） */
  workflow: Record<string, any>;
  /** 承载正向提示词的节点 ID */
  promptNodeId: string;
  /** 该节点 inputs 中承载文本的字段名，通常为 text */
  promptInputField: string;
  /** 承载输入图片的节点 ID（LoadImage 节点），可选 */
  imageNodeId?: string;
  imageInputField?: string;
  /** 输出图片节点 ID（SaveImage 节点） */
  outputNodeId: string;
}

export type ModelConfig = (CustomApiModelConfig | ComfyUiModelConfig) & {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
};

export interface GenerateRequestBody {
  modelId: string;
  prompt: string;
  /** 引用的上游图片资源地址（相对路径 /uploads/xxx 或外部 URL） */
  images: string[];
}

export interface GenerateResultBody {
  imageUrl: string;
}

/** 主题色配置，前端持久化后同步一份到后端方便多端共享（个人使用场景可选） */
export interface ThemeConfig {
  [cssVarName: string]: string;
}
