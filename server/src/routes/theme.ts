// 主题色配置的读取与保存（个人使用，单一配置即可）
import { Router } from "express";
import { dataFile, readJson, writeJson } from "../lib/jsonStore.js";
import type { ThemeConfig } from "../types.js";

const THEME_FILE = dataFile("theme.json");

export const themeRouter = Router();

themeRouter.get("/", async (_req, res) => {
  const theme = await readJson<ThemeConfig>(THEME_FILE, {});
  res.json(theme);
});

themeRouter.put("/", async (req, res) => {
  const body = req.body as ThemeConfig;
  if (typeof body !== "object" || body === null) {
    res.status(400).json({ error: "主题配置必须为对象" });
    return;
  }
  await writeJson(THEME_FILE, body);
  res.json({ ok: true });
});
