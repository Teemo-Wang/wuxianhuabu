// 兼容旧版本数据：早期版本只有单一 data/canvas.json，没有「项目」概念。
// 服务启动时检测该文件是否存在且尚未迁移过，若是则包装成第一个项目，避免用户升级后画布内容丢失。
import { randomUUID } from "node:crypto";
import path from "node:path";
import { promises as fs } from "node:fs";
import { PROJECTS_DIR, dataFile, listJsonFiles, readJson, writeJson } from "./jsonStore.js";
import type { CanvasSnapshot, ProjectFile } from "../types.js";

export async function migrateLegacyCanvas(): Promise<void> {
  const legacyPath = dataFile("canvas.json");
  const legacyExists = await fs
    .access(legacyPath)
    .then(() => true)
    .catch(() => false);
  if (!legacyExists) return;

  const existingProjectIds = await listJsonFiles(PROJECTS_DIR);
  if (existingProjectIds.length > 0) return; // 已经有项目了，不再迁移，避免重复导入

  const legacy = await readJson<CanvasSnapshot | null>(legacyPath, null);
  if (!legacy || (legacy.nodes.length === 0 && legacy.edges.length === 0)) {
    // 旧文件是空画布，直接删除即可，不需要迁移出一个空项目
    await fs.rm(legacyPath, { force: true });
    return;
  }

  const now = new Date().toISOString();
  const project: ProjectFile = {
    id: randomUUID(),
    name: "未命名项目",
    nodes: legacy.nodes,
    edges: legacy.edges,
    viewport: legacy.viewport,
    createdAt: legacy.updatedAt ?? now,
    updatedAt: legacy.updatedAt ?? now,
  };
  await writeJson(path.join(PROJECTS_DIR, `${project.id}.json`), project);
  await fs.rm(legacyPath, { force: true });
  console.log(`[migrate] 已将旧版本单画布数据迁移为项目「${project.name}」(${project.id})`);
}
