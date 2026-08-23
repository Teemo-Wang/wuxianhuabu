// Skill 库的 CRUD：每个 skill 是一段预设好的 Markdown 提示词模板
// （文生图提示词模板 / 图片反推文字 / 图转视频提示词模板等），供 Skill 节点选择加载
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { dataFile, readJson, writeJson } from "../lib/jsonStore.js";
import type { SkillEntry } from "../types.js";

const SKILLS_FILE = dataFile("skills.json");

export const skillsRouter = Router();

skillsRouter.get("/", async (_req, res) => {
  const skills = await readJson<SkillEntry[]>(SKILLS_FILE, []);
  res.json(skills);
});

skillsRouter.post("/", async (req, res) => {
  const { name, content } = req.body as Partial<SkillEntry>;
  if (!name || typeof name !== "string" || !name.trim()) {
    res.status(400).json({ error: "name 不能为空" });
    return;
  }
  const skills = await readJson<SkillEntry[]>(SKILLS_FILE, []);
  const now = new Date().toISOString();
  const skill: SkillEntry = {
    id: randomUUID(),
    name: name.trim(),
    content: typeof content === "string" ? content : "",
    createdAt: now,
    updatedAt: now,
  };
  skills.push(skill);
  await writeJson(SKILLS_FILE, skills);
  res.status(201).json(skill);
});

skillsRouter.put("/:id", async (req, res) => {
  const skills = await readJson<SkillEntry[]>(SKILLS_FILE, []);
  const idx = skills.findIndex((s) => s.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: "Skill 不存在" });
    return;
  }
  const { name, content } = req.body as Partial<SkillEntry>;
  skills[idx] = {
    ...skills[idx],
    name: typeof name === "string" && name.trim() ? name.trim() : skills[idx].name,
    content: typeof content === "string" ? content : skills[idx].content,
    updatedAt: new Date().toISOString(),
  };
  await writeJson(SKILLS_FILE, skills);
  res.json(skills[idx]);
});

skillsRouter.delete("/:id", async (req, res) => {
  const skills = await readJson<SkillEntry[]>(SKILLS_FILE, []);
  const next = skills.filter((s) => s.id !== req.params.id);
  if (next.length === skills.length) {
    res.status(404).json({ error: "Skill 不存在" });
    return;
  }
  await writeJson(SKILLS_FILE, next);
  res.status(204).end();
});
