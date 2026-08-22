// 简单的 JSON 文件存储层，用于个人单工作空间 Demo 场景
// 不引入数据库，直接以 JSON 文件持久化，读写通过内存队列避免并发写坏文件
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = path.resolve(__dirname, "../../data");
export const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
export const PROJECTS_DIR = path.join(DATA_DIR, "projects");

// 确保数据目录存在
async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

// 每个文件维护一条写入队列，保证同一文件的写操作串行执行
const writeQueues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = writeQueues.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);
  // 避免 Map 无限增长，链式完成后清理（不影响返回值）
  writeQueues.set(key, next.catch(() => undefined));
  return next;
}

/**
 * 读取 JSON 文件，若不存在则返回默认值并写入默认值
 */
export async function readJson<T>(filePath: string, defaultValue: T): Promise<T> {
  await ensureDir(path.dirname(filePath));
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await writeJson(filePath, defaultValue);
      return defaultValue;
    }
    throw err;
  }
}

/**
 * 写入 JSON 文件（原子写：先写临时文件再 rename，避免写入过程中崩溃导致文件损坏）
 */
export async function writeJson<T>(filePath: string, value: T): Promise<void> {
  return enqueue(filePath, async () => {
    await ensureDir(path.dirname(filePath));
    const tmpPath = `${filePath}.tmp-${process.pid}`;
    await fs.writeFile(tmpPath, JSON.stringify(value, null, 2), "utf-8");
    await fs.rename(tmpPath, filePath);
  });
}

export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}

/**
 * 列出目录下所有 .json 文件名（不含扩展名），目录不存在时返回空数组
 */
export async function listJsonFiles(dir: string): Promise<string[]> {
  await ensureDir(dir);
  const entries = await fs.readdir(dir);
  return entries.filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -".json".length));
}

/**
 * 删除 JSON 文件，文件不存在时静默忽略
 */
export async function removeJson(filePath: string): Promise<void> {
  return enqueue(filePath, async () => {
    await fs.rm(filePath, { force: true });
  });
}
