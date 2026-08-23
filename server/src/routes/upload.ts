// 本地文件上传：接收前端拖拽/选择的图片，落盘到 data/uploads，返回可访问 URL
import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { UPLOADS_DIR } from "../lib/jsonStore.js";

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // 保留原始扩展名（图片/视频/音频都靠这个扩展名决定前端 <img>/<video>/<audio> 怎么渲染）
    const ext = path.extname(file.originalname) || "";
    cb(null, `${randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  // 单文件最大 200MB：图片通常很小，但视频节点上传的素材可能达到几十上百 MB
  limits: { fileSize: 200 * 1024 * 1024 },
});

export const uploadRouter = Router();

uploadRouter.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "未接收到文件" });
    return;
  }
  res.status(201).json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.filename,
  });
});
