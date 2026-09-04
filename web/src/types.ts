// 前端共享类型，结构与 server/src/types.ts 保持一致

export type MediaOutputType = "image" | "video" | "audio";

export interface CustomApiModelConfig {
  kind: "custom-api";
  method: "GET" | "POST" | "PUT";
  endpoint: string;
  headers: Record<string, string>;
  bodyTemplate: string;
  responseImagePath: string;
  responseIsUrl: boolean;
  /**
   * 是否通过「简易模式」创建/编辑（适用于 OpenAI 兼容的 images 接口，如各类中转/代理服务）。
   * 为 true 时，上面几个字段（endpoint/headers/bodyTemplate/...）是根据下面的简易字段自动生成的，
   * 编辑时会优先展示简易表单；为 false/未设置则是通过「高级模式」手动配置的旧模型。
   */
  simpleMode?: boolean;
  /** 简易模式：API 根地址，如 https://api.openai.com/v1 */
  simpleBaseUrl?: string;
  /** 简易模式：API 密钥（Bearer Token） */
  simpleApiKey?: string;
  /** 简易模式：请求体里的 model 字段 */
  simpleModelName?: string;
  /** 简易模式：图片尺寸，如 1024x1024 */
  simpleSize?: string;
  /** 简易模式：响应格式，对应 OpenAI 的 response_format 参数 */
  simpleResponseFormat?: "url" | "b64_json";
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
  maskNodeId?: string;
  maskInputField?: string;
}

export type ModelConfig = (CustomApiModelConfig | ComfyUiModelConfig) & {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
  outputType?: MediaOutputType;
};

/** 创建/编辑模型时使用的输入类型（不含服务端生成的 id / createdAt） */
export type ModelConfigInput = (CustomApiModelConfig | ComfyUiModelConfig) & {
  name: string;
  color?: string;
  outputType?: MediaOutputType;
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
  /** 素材命名：双击节点头部标签可修改，最长 MAX_NODE_NAME_LENGTH 个字符 */
  name?: string;
  [key: string]: unknown;
}

/** 图片节点数据 */
export interface ImageNodeData {
  kind: "image";
  url: string;
  /** 是否由生成产生（区分用户上传 vs AI 生成，便于 UI 展示角标） */
  generated?: boolean;
  sourcePrompt?: string;
  /** 素材命名：双击节点头部标签可修改，最长 MAX_NODE_NAME_LENGTH 个字符 */
  name?: string;
  [key: string]: unknown;
}

/** 视频节点数据 */
export interface VideoNodeData {
  kind: "video";
  url: string;
  generated?: boolean;
  sourcePrompt?: string;
  /** 素材命名：双击节点头部标签可修改，最长 MAX_NODE_NAME_LENGTH 个字符 */
  name?: string;
  [key: string]: unknown;
}

/** 音频节点数据 */
export interface AudioNodeData {
  kind: "audio";
  url: string;
  generated?: boolean;
  sourcePrompt?: string;
  /** 素材命名：双击节点头部标签可修改，最长 MAX_NODE_NAME_LENGTH 个字符 */
  name?: string;
  [key: string]: unknown;
}

/** 生成中占位节点数据 */
export interface GeneratingNodeData {
  kind: "generating";
  prompt: string;
  targetKind?: MediaOutputType;
  [key: string]: unknown;
}

/** ComfyUI 工作流节点的单个输入/输出槎位 */
export interface ComfyWorkflowIOSlot {
  /** 槎位唯一 id，同时作为该节点上 Handle 的 id */
  id: string;
  /** 显示名称 */
  label: string;
  /** workflow JSON 中对应的节点 ID */
  nodeId: string;
  /** 输入槎位需要：该节点 inputs 下要写入的字段名；输出槎位不需要 */
  field?: string;
  /** 数据类型，决定这个槎位怎么取值/怎么展示 */
  type: "text" | "image";
}

/** ComfyUI 工作流节点：把一份 workflow 直接绑定到画布节点上，
 * 按配置好的输入/输出槎位在节点两侧渲染对应数量的 Handle */
export interface ComfyWorkflowNodeData {
  kind: "comfy-workflow";
  name: string;
  baseUrl: string;
  workflow: Record<string, any>;
  inputs: ComfyWorkflowIOSlot[];
  outputs: ComfyWorkflowIOSlot[];
  status: "idle" | "running" | "error";
  errorMessage?: string;
  /** 每个输出槎位最近一次的结果地址，key 为槎位 id */
  results: Record<string, string>;
  /** 若这个节点是从工作流库加载的，记录库条目 id，方便后续「同步更新」 */
  libraryId?: string;
  [key: string]: unknown;
}

/** Skill 节点：承载一段预设好的 Markdown 提示词模板（文生图模板/图片反推/图转视频提示词等） */
export interface SkillNodeData {
  kind: "skill";
  /** 关联的 skill 库条目 id，null 表示这是一份未保存到库的临时内容 */
  skillId: string | null;
  name: string;
  content: string;
  [key: string]: unknown;
}

/** Skill 库条目（后端 data/skills.json 持久化） */
export interface SkillEntry {
  id: string;
  name: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

/** ComfyUI 工作流库条目（后端 data/comfy-workflows.json 持久化），
 * 保存好之后可以在任意 ComfyUI 工作流节点里「从库加载」复用，不用每次重新粘贴 workflow JSON */
export interface ComfyWorkflowEntry {
  id: string;
  name: string;
  baseUrl: string;
  workflow: Record<string, any>;
  inputs: ComfyWorkflowIOSlot[];
  outputs: ComfyWorkflowIOSlot[];
  createdAt: string;
  updatedAt: string;
}

export type AppNodeData =
  | TextNodeData
  | ImageNodeData
  | VideoNodeData
  | AudioNodeData
  | ComfyWorkflowNodeData
  | SkillNodeData
  | GeneratingNodeData;
