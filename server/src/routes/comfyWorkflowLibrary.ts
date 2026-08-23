// ComfyUI 工作流库的 CRUD：保存好的工作流配置（服务地址 + workflow JSON + 输入输出槎位），
// 可以在任意 ComfyUI 工作流节点里直接加载复用，不用每次重新粘贴/配置
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dataFile, readJson, writeJson } from "../lib/jsonStore.js";
import type { ComfyWorkflowEntry } from "../types.js";

const WORKFLOWS_FILE = dataFile("comfy-workflows.json");

export const comfyWorkflowLibraryRouter = Router();

comfyWorkflowLibraryRouter.get("/", async (_req, res) => {
  const workflows = await readJson<ComfyWorkflowEntry[]>(WORKFLOWS_FILE, []);
  res.json(workflows);
});

comfyWorkflowLibraryRouter.post("/", async (req, res) => {
  const body = req.body as Partial<ComfyWorkflowEntry>;
  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    res.status(400).json({ error: "name 不能为空" });
    return;
  }
  const workflows = await readJson<ComfyWorkflowEntry[]>(WORKFLOWS_FILE, []);
  const now = new Date().toISOString();
  const entry: ComfyWorkflowEntry = {
    id: randomUUID(),
    name: body.name.trim(),
    baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : "",
    workflow: body.workflow ?? {},
    inputs: Array.isArray(body.inputs) ? body.inputs : [],
    outputs: Array.isArray(body.outputs) ? body.outputs : [],
    createdAt: now,
    updatedAt: now,
  };
  workflows.push(entry);
  await writeJson(WORKFLOWS_FILE, workflows);
  res.status(201).json(entry);
});

comfyWorkflowLibraryRouter.put("/:id", async (req, res) => {
  const workflows = await readJson<ComfyWorkflowEntry[]>(WORKFLOWS_FILE, []);
  const idx = workflows.findIndex((w) => w.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "工作流不存在" });
    return;
  }
  const body = req.body as Partial<ComfyWorkflowEntry>;
  workflows[idx] = {
    ...workflows[idx],
    name: typeof body.name === "string" && body.name.trim() ? body.name.trim() : workflows[idx].name,
    baseUrl: typeof body.baseUrl === "string" ? body.baseUrl : workflows[idx].baseUrl,
    workflow: body.workflow ?? workflows[idx].workflow,
    inputs: Array.isArray(body.inputs) ? body.inputs : workflows[idx].inputs,
    outputs: Array.isArray(body.outputs) ? body.outputs : workflows[idx].outputs,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(WORKFLOWS_FILE, workflows);
  res.json(workflows[idx]);
});

comfyWorkflowLibraryRouter.delete("/:id", async (req, res) => {
  const workflows = await readJson<ComfyWorkflowEntry[]>(WORKFLOWS_FILE, []);
  const next = workflows.filter((w) => w.id !== req.params.id);
  if (next.length === workflows.length) {
    res.status(404).json({ error: "工作流不存在" });
    return;
  }
  await writeJson(WORKFLOWS_FILE, next);
  res.status(204).end();
});
