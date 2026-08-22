// 项目（工作区）管理：一个「工作空间」下可以有多个项目，每个项目对应一份独立的画布数据
// 落盘为 data/projects/{id}.json，首页展示项目列表，进入项目后编辑画布
import { Router } from "express";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { PROJECTS_DIR, listJsonFiles, readJson, removeJson, writeJson } from "../lib/jsonStore.js";
import type { CanvasSnapshot, ProjectFile, ProjectSummary } from "../types.js";

export const projectsRouter = Router();

function projectFilePath(id: string): string {
  return path.join(PROJECTS_DIR, `${id}.json`);
}

/** 从画布节点中找到第一张有效图片作为项目封面 */
function extractThumbnail(nodes: ProjectFile["nodes"]): string | null {
  for (const node of nodes) {
    if (node.type === "image") {
      const url = node.data?.url;
      if (typeof url === "string" && url) return url;
    }
  }
  return null;
}

function toSummary(project: ProjectFile): ProjectSummary {
  return {
    id: project.id,
    name: project.name,
    thumbnail: extractThumbnail(project.nodes ?? []),
    nodeCount: (project.nodes ?? []).length,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

// 获取项目列表（首页用），按更新时间倒序
projectsRouter.get("/", async (_req, res) => {
  const ids = await listJsonFiles(PROJECTS_DIR);
  const projects = await Promise.all(
    ids.map((id) => readJson<ProjectFile | null>(projectFilePath(id), null))
  );
  const summaries = projects
    .filter((p): p is ProjectFile => p !== null)
    .map(toSummary)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(summaries);
});

// 新建项目
projectsRouter.post("/", async (req, res) => {
  const name = typeof req.body?.name === "string" && req.body.name.trim() ? req.body.name.trim() : "未命名项目";
  const now = new Date().toISOString();
  const project: ProjectFile = {
    id: randomUUID(),
    name,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(projectFilePath(project.id), project);
  res.status(201).json(toSummary(project));
});

// 获取单个项目的完整画布数据（进入项目编辑页时调用）
projectsRouter.get("/:id", async (req, res) => {
  const project = await readJson<ProjectFile | null>(projectFilePath(req.params.id), null);
  if (!project) {
    res.status(404).json({ error: "项目不存在" });
    return;
  }
  res.json(project);
});

// 重命名项目
projectsRouter.patch("/:id", async (req, res) => {
  const project = await readJson<ProjectFile | null>(projectFilePath(req.params.id), null);
  if (!project) {
    res.status(404).json({ error: "项目不存在" });
    return;
  }
  const name = req.body?.name;
  if (typeof name === "string" && name.trim()) {
    project.name = name.trim();
    project.updatedAt = new Date().toISOString();
    await writeJson(projectFilePath(project.id), project);
  }
  res.json(toSummary(project));
});

// 保存项目画布内容（编辑页里防抖调用）
projectsRouter.put("/:id/canvas", async (req, res) => {
  const project = await readJson<ProjectFile | null>(projectFilePath(req.params.id), null);
  if (!project) {
    res.status(404).json({ error: "项目不存在" });
    return;
  }
  const body = req.body as Partial<CanvasSnapshot>;
  if (!Array.isArray(body.nodes) || !Array.isArray(body.edges)) {
    res.status(400).json({ error: "nodes 和 edges 必须为数组" });
    return;
  }
  project.nodes = body.nodes as ProjectFile["nodes"];
  project.edges = body.edges as ProjectFile["edges"];
  project.viewport = body.viewport ?? project.viewport;
  project.updatedAt = new Date().toISOString();
  await writeJson(projectFilePath(project.id), project);
  res.json({ ok: true, updatedAt: project.updatedAt });
});

// 删除项目
projectsRouter.delete("/:id", async (req, res) => {
  const filePath = projectFilePath(req.params.id);
  const exists = await readJson<ProjectFile | null>(filePath, null);
  if (!exists) {
    res.status(404).json({ error: "项目不存在" });
    return;
  }
  await removeJson(filePath);
  res.status(204).end();
});
