// Express 服务入口：提供项目/画布持久化、模型配置、上传、生成代理等接口
import express from "express";
import cors from "cors";
import { UPLOADS_DIR } from "./lib/jsonStore.js";
import { migrateLegacyCanvas } from "./lib/migrateLegacyCanvas.js";
import { projectsRouter } from "./routes/projects.js";
import { modelsRouter } from "./routes/models.js";
import { themeRouter } from "./routes/theme.js";
import { uploadRouter } from "./routes/upload.js";
import { generateRouter } from "./routes/generate.js";
import { comfyWorkflowRouter } from "./routes/comfyWorkflow.js";
import { comfyWorkflowLibraryRouter } from "./routes/comfyWorkflowLibrary.js";
import { skillsRouter } from "./routes/skills.js";
import { agentRouter } from "./routes/agent.js";

const app = express();
const PORT = Number(process.env.PORT ?? 8787);

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// 静态资源：上传/生成的图片文件
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/projects", projectsRouter);
app.use("/api/models", modelsRouter);
app.use("/api/theme", themeRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/generate", generateRouter);
app.use("/api/comfy-workflow", comfyWorkflowRouter);
app.use("/api/comfy-workflows", comfyWorkflowLibraryRouter);
app.use("/api/skills", skillsRouter);
app.use("/api/agent", agentRouter);

// 统一错误处理，避免未捕获异常导致进程退出
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[unhandled]", err);
  res.status(500).json({ error: err?.message ?? "服务器内部错误" });
});

// 兼容旧版本单画布数据：若存在 data/canvas.json 且尚无任何项目，则迁移为「未命名项目」
await migrateLegacyCanvas();

app.listen(PORT, () => {
  console.log(`node-canvas-studio server listening on http://localhost:${PORT}`);
});
