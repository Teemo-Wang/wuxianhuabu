// 临时的 mock 模型服务，用于本地联调验证「自定义 API」接入链路
// 用法：node scripts/mock-model-server.mjs
import http from "node:http";

const PNG_1PX_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/generate") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      console.log("[mock-model] 收到请求:", body);
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          data: {
            imageUrl: `data:image/png;base64,${PNG_1PX_BASE64}`,
          },
        })
      );
    });
    return;
  }
  res.statusCode = 404;
  res.end("not found");
});

server.listen(4321, () => console.log("mock model server on http://localhost:4321"));
