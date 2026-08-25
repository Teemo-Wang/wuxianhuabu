// 临时的 mock OpenAI 兼容图片生成服务，用于验证「简易模式」自定义 API 模型接入链路
// 用法：node scripts/mock-openai-server.mjs
import http from "node:http";

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/v1/images/generations") {
    const auth = req.headers["authorization"];
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      console.log("[mock-openai] Authorization:", auth);
      console.log("[mock-openai] 收到请求体:", body);
      const parsed = JSON.parse(body);
      res.setHeader("Content-Type", "application/json");
      if (parsed.response_format === "b64_json") {
        res.end(JSON.stringify({ data: [{ b64_json: PNG_1PX_BASE64 }] }));
      } else {
        res.end(JSON.stringify({ data: [{ url: "http://localhost:4322/fake-image.png" }] }));
      }
    });
    return;
  }
  if (req.method === "GET" && req.url === "/fake-image.png") {
    res.setHeader("Content-Type", "image/png");
    res.end(Buffer.from(PNG_1PX_BASE64, "base64"));
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

server.listen(4322, () => console.log("mock openai-compatible server on http://localhost:4322"));
