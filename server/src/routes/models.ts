// 模型配置的 CRUD：支持自定义 API 与 ComfyUI 两种接入方式
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dataFile, readJson, writeJson } from "../lib/jsonStore.js";
import type { ModelConfig } from "../types.js";

const MODELS_FILE = dataFile("models.json");

export const modelsRouter = Router();

// 获取全部模型配置列表
modelsRouter.get("/", async (_req, res) => {
  const models = await readJson<ModelConfig[]>(MODELS_FILE, []);
  res.json(models);
});

// 新增一个模型配置
modelsRouter.post("/", async (req, res) => {
  const models = await readJson<ModelConfig[]>(MODELS_FILE, []);
  const body = req.body as Omit<ModelConfig, "id" | "createdAt">;

  if (!body || (body.kind !== "custom-api" && body.kind !== "comfyui")) {
    res.status(400).json({ error: "kind 必须为 custom-api 或 comfyui" });
    return;
  }
  if (!body.name || typeof body.name !== "string") {
    res.status(400).json({ error: "name 不能为空" });
    return;
  }

  const model: ModelConfig = {
    ...body,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
  } as ModelConfig;

  models.push(model);
  await writeJson(MODELS_FILE, models);
  res.status(201).json(model);
});

// 更新指定模型配置
modelsRouter.put("/:id", async (req, res) => {
  const models = await readJson<ModelConfig[]>(MODELS_FILE, []);
  const idx = models.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "模型不存在" });
    return;
  }
  const body = req.body as Partial<ModelConfig>;
  models[idx] = { ...models[idx], ...body, id: models[idx].id, createdAt: models[idx].createdAt } as ModelConfig;
  await writeJson(MODELS_FILE, models);
  res.json(models[idx]);
});

// 删除指定模型配置
modelsRouter.delete("/:id", async (req, res) => {
  const models = await readJson<ModelConfig[]>(MODELS_FILE, []);
  const next = models.filter((m) => m.id !== req.params.id);
  if (next.length === models.length) {
    res.status(404).json({ error: "模型不存在" });
    return;
  }
  await writeJson(MODELS_FILE, next);
  res.status(204).end();
});
