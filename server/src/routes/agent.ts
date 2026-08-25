// 画布 Agent：保存对话模型配置，并代理聊天请求
import { Router } from "express";
import { dataFile, readJson, writeJson } from "../lib/jsonStore.js";
import { runAgentChat, type AgentSettings, type AgentChatRequest } from "../lib/agentChat.js";

const SETTINGS_FILE = dataFile("agent-settings.json");

const emptySettings = (): AgentSettings => ({
  baseUrl: "",
  apiKey: "",
  modelName: "gpt-4o-mini",
});

export const agentRouter = Router();

agentRouter.get("/settings", async (_req, res) => {
  const settings = await readJson<AgentSettings>(SETTINGS_FILE, emptySettings());
  res.json(settings);
});

agentRouter.put("/settings", async (req, res) => {
  const body = req.body as Partial<AgentSettings>;
  const current = await readJson<AgentSettings>(SETTINGS_FILE, emptySettings());
  const next: AgentSettings = {
    baseUrl: typeof body.baseUrl === "string" ? body.baseUrl.trim() : current.baseUrl,
    apiKey: typeof body.apiKey === "string" ? body.apiKey.trim() : current.apiKey,
    modelName: typeof body.modelName === "string" ? body.modelName.trim() : current.modelName,
  };
  await writeJson(SETTINGS_FILE, next);
  res.json(next);
});

agentRouter.post("/chat", async (req, res) => {
  const settings = await readJson<AgentSettings>(SETTINGS_FILE, emptySettings());
  if (!settings.baseUrl || !settings.apiKey || !settings.modelName) {
    res.status(400).json({ error: "请先在 Agent 面板里填写对话模型的 API 地址、密钥和模型名称" });
    return;
  }

  const body = req.body as AgentChatRequest;
  if (!body?.message || typeof body.message !== "string") {
    res.status(400).json({ error: "请输入要跟 Agent 说的话" });
    return;
  }

  try {
    const result = await runAgentChat(settings, {
      message: body.message,
      history: Array.isArray(body.history) ? body.history : [],
      canvas: body.canvas ?? { nodes: [], selectedIds: [] },
      models: Array.isArray(body.models) ? body.models : [],
    });
    res.json(result);
  } catch (err: any) {
    console.error("[agent] 对话失败", err);
    res.status(502).json({ error: err?.message ?? "Agent 对话失败" });
  }
});
