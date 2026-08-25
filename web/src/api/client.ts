// 统一的后端 API 客户端，开发环境下经 vite proxy 转发到 :8787
import type {
  ComfyWorkflowEntry,
  ModelConfig,
  ModelConfigInput,
  ProjectFile,
  ProjectSummary,
  SkillEntry,
  ThemeConfig,
} from "../types";

const BASE = "/api";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let message = text;
    try {
      message = JSON.parse(text).error ?? text;
    } catch {
      /* 忽略解析失败，使用原始文本 */
    }
    throw new Error(message || `请求失败: HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export interface CanvasSnapshotDto {
  nodes: any[];
  edges: any[];
  viewport?: { x: number; y: number; zoom: number };
  updatedAt: string;
}

export const api = {
  // 项目（首页工作区）
  listProjects: () => request<ProjectSummary[]>("/projects"),
  createProject: (name?: string) =>
    request<ProjectSummary>("/projects", { method: "POST", body: JSON.stringify({ name }) }),
  getProject: (id: string) => request<ProjectFile>(`/projects/${id}`),
  renameProject: (id: string, name: string) =>
    request<ProjectSummary>(`/projects/${id}`, { method: "PATCH", body: JSON.stringify({ name }) }),
  deleteProject: (id: string) => request<void>(`/projects/${id}`, { method: "DELETE" }),
  saveProjectCanvas: (id: string, snapshot: Omit<CanvasSnapshotDto, "updatedAt">) =>
    request<{ ok: true; updatedAt: string }>(`/projects/${id}/canvas`, {
      method: "PUT",
      body: JSON.stringify(snapshot),
    }),

  // 模型
  listModels: () => request<ModelConfig[]>("/models"),
  createModel: (model: ModelConfigInput) =>
    request<ModelConfig>("/models", { method: "POST", body: JSON.stringify(model) }),
  updateModel: (id: string, model: Partial<ModelConfig>) =>
    request<ModelConfig>(`/models/${id}`, { method: "PUT", body: JSON.stringify(model) }),
  deleteModel: (id: string) => request<void>(`/models/${id}`, { method: "DELETE" }),

  // 主题
  getTheme: () => request<ThemeConfig>("/theme"),
  saveTheme: (theme: ThemeConfig) =>
    request<{ ok: true }>("/theme", { method: "PUT", body: JSON.stringify(theme) }),

  // 上传
  uploadFile: async (file: File): Promise<{ url: string; filename: string }> => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/upload`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`上传失败: HTTP ${res.status}`);
    return res.json();
  },

  // 生成
  generate: (payload: { modelId: string; prompt: string; images: string[]; mask?: string }) =>
    request<{ url: string; kind: "image" | "video" | "audio"; imageUrl: string }>("/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ComfyUI 工作流节点执行
  runComfyWorkflow: (payload: {
    baseUrl: string;
    workflow: Record<string, any>;
    inputs: Array<{ nodeId: string; field: string; type: "text" | "image"; value: string }>;
    outputs: Array<{ slotId: string; nodeId: string }>;
  }) =>
    request<{ results: Array<{ slotId: string; imageUrl: string }> }>("/comfy-workflow/run", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Skill 库
  listSkills: () => request<SkillEntry[]>("/skills"),
  createSkill: (name: string, content: string) =>
    request<SkillEntry>("/skills", { method: "POST", body: JSON.stringify({ name, content }) }),
  updateSkill: (id: string, patch: Partial<Pick<SkillEntry, "name" | "content">>) =>
    request<SkillEntry>(`/skills/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteSkill: (id: string) => request<void>(`/skills/${id}`, { method: "DELETE" }),

  // ComfyUI 工作流库
  listComfyWorkflows: () => request<ComfyWorkflowEntry[]>("/comfy-workflows"),
  createComfyWorkflow: (entry: Omit<ComfyWorkflowEntry, "id" | "createdAt" | "updatedAt">) =>
    request<ComfyWorkflowEntry>("/comfy-workflows", { method: "POST", body: JSON.stringify(entry) }),
  updateComfyWorkflow: (id: string, patch: Partial<Omit<ComfyWorkflowEntry, "id" | "createdAt" | "updatedAt">>) =>
    request<ComfyWorkflowEntry>(`/comfy-workflows/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteComfyWorkflow: (id: string) => request<void>(`/comfy-workflows/${id}`, { method: "DELETE" }),

  getAgentSettings: () =>
    request<{ baseUrl: string; apiKey: string; modelName: string }>("/agent/settings"),
  saveAgentSettings: (settings: { baseUrl: string; apiKey: string; modelName: string }) =>
    request<{ baseUrl: string; apiKey: string; modelName: string }>("/agent/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  agentChat: (payload: {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    canvas: {
      nodes: Array<{ id: string; kind: string; label: string; selected?: boolean }>;
      selectedIds: string[];
    };
    models: Array<{ id: string; name: string; kind: string; outputType: string }>;
  }) =>
    request<{
      say: string;
      actions: Array<{
        op: "add_text" | "generate";
        content?: string;
        x?: number;
        y?: number;
        prompt?: string;
        modelId?: string;
        referenceIds?: string[];
      }>;
    }>("/agent/chat", { method: "POST", body: JSON.stringify(payload) }),
};
