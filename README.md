# Node Canvas Studio（无限画布节点式生图工具 · Demo）

一个参考 [TapNow](https://tapnow.ai) 无限画布节点式创作体验的个人使用 Demo：
在无限画布上创建文本/图片/视频/音频节点，选中若干节点交给「Agent 面板」，选择模型（自定义 API 或 ComfyUI 工作流）生成新图片，结果自动落地为新节点并与输入节点连线。

## 目录结构

```
node-canvas-studio/
├── web/      前端：Vite + React 19 + TypeScript + @xyflow/react（React Flow）+ zustand + Tailwind CSS
└── server/   后端：Express 5 + TypeScript，JSON 文件存储（个人单工作空间场景，无需数据库）
```

## 功能对照（vs TapNow）

| TapNow 能力 | 本 Demo 实现 |
|---|---|
| 首页项目网格，展示全部项目 | 启动后先进入首页，展示当前工作空间下所有项目卡片（封面取自项目内第一张图片节点），支持新建/重命名/删除 |
| 无限画布，节点承载内容 | React Flow 画布，支持 pan/zoom/框选/小地图 |
| 左侧 `+` 新增节点 | 左上角悬浮 `+` 按钮 |
| 双击空白区域新增节点 | 已实现（双击画布空白处弹出菜单） |
| 右键菜单新增节点 | 已实现 |
| 从节点的连接点拖出连线，松手到空白处继续创建 | 拖拽任意节点的 Handle 到空白画布松手，弹出节点类型选择菜单，选完自动创建节点并连线（类似 ComfyUI 的节点连线体验） |
| 选中多个节点交给 Agent | 选中节点后画布下方浮现「交给 Agent」操作条 |
| Prompt 中 `@` 引用上游节点 | Agent 面板中「@ 添加引用」，引用文本节点内容会拼入 prompt，引用图片节点会作为图片输入 |
| 选择模型生成 | Agent 面板内选择已配置的模型（自定义 API / ComfyUI） |
| 生成结果作为新节点回到画布 | 生成过程中先出现「生成中」占位节点，完成后原地替换为图片节点 |
| 点击图片查看大图 | 点击任意图片节点缩略图，弹出对话框以原始比例（不裁剪）展示完整图片 |
| 视频 / 音频节点 | 支持上传视频、音频素材并直接在节点内播放预览；数据结构已预留 `generated` 标记，方便后续接入视频/音频生成模型 |
| 保存状态提示 | 右上角显示「保存中…/已保存/保存失败」 |

暂不包含：素材库（Asset Library）、模板、多人协作、团队/多工作空间、视频/音频生成模型接入——按你的需求这些先不做，后续可以按同样的模式扩展。

UI 上不使用任何图形化图标（emoji/icon 字体），所有按钮和状态提示均为纯文字，方便后续自定义主题时不需要额外适配图标颜色。

## 快速开始

需要 Node.js 18+（本机验证环境为 Node 25）。

```bash
# 1. 安装依赖
cd node-canvas-studio/server && npm install
cd ../web && npm install

# 2. 启动后端（默认端口 8787）
cd ../server && npm run dev

# 3. 启动前端（默认端口 5173，已配置 proxy 转发 /api 和 /uploads 到 8787）
cd ../web && npm run dev
```

打开 http://localhost:5173 即可使用，会先看到首页项目列表。项目数据持久化到 `server/data/projects/{projectId}.json`，模型配置和主题配置持久化到 `server/data/*.json`，上传/生成的图片保存在 `server/data/uploads/`。

> 如果你之前跑过旧版本（只有单一画布、没有首页），服务启动时会自动检测 `server/data/canvas.json`，把里面的内容迁移成第一个项目「未命名项目」，不会丢数据。

## 核心交互说明

- **首页 / 项目管理**：应用启动后先进入首页，可以看到当前工作空间下的所有项目卡片（卡片封面取项目里第一张图片节点，没有则显示「暂无内容」）。点击「新建项目」创建并直接进入编辑；点击已有卡片进入该项目的画布；鼠标悬停卡片右上角「更多」可重命名或删除。
- **新建节点**：进入项目画布后，左上角 `+`、双击画布空白处、右键画布空白处，三种方式都可以新建文本/图片/视频/音频节点。
- **从已有节点拖出连线继续创建**：从任意节点的连接点（Handle）按住拖出一条线，松手时若落在空白画布上，会弹出节点类型选择菜单，选完自动创建节点并连线，交互上类似 ComfyUI 的节点连接体验；若松手时落在另一个节点的连接点上，则直接建立两者之间的连接。
- **视频 / 音频节点**：点击节点内的上传区域选择本地视频/音频文件，上传完成后节点内会出现原生播放控件（`<video>` / `<audio>`）可直接预览播放；视频节点会按素材真实宽高比自适应显示（同图片节点逻辑），音频节点是固定高度的播放条。
- **查看完整图片**：点击任意图片节点的缩略图，会弹出对话框以 `object-contain` 方式完整展示原图（不裁剪、保持原始比例），点击对话框空白处或「关闭」按钮退出。
- **交给 Agent 生成**：
  1. 框选或 Shift 多选想要引用的节点，点击底部浮现的「交给 Agent」，或直接双击某个节点快速打开 Agent 面板；
  2. 在面板里可以继续用「@ 添加引用」增补引用节点，文本节点内容会自动拼接进最终 prompt，图片节点会作为图片输入传给模型；
  3. 选择模型，点击「生成」。生成请求发出后立刻在画布上出现一个「生成中」占位节点并与引用节点连线，生成完成后原地替换为结果图片节点。
- **返回首页**：项目画布右上角「首页」按钮可随时返回项目列表。
- **模型管理**：右上角「模型管理」，可以新增/编辑/删除两类模型：
  - **自定义 API**：配置 Endpoint、请求方法、请求头、请求体模板（支持 `{{prompt}}` `{{image0}}` `{{images}}` 占位符）、响应中图片字段的路径（点号路径，如 `data.images.0.url`），以及该字段是 URL 还是 base64。
  - **ComfyUI 工作流**：配置 ComfyUI 服务地址、导出的 API 格式 workflow JSON、承载提示词的节点 ID/字段名、承载图片输入的节点 ID/字段名（可选）、输出图片的节点 ID（通常是 SaveImage 节点）。
- **主题外观**：右上角「主题外观」，可视化编辑画布背景、面板背景/边框、主色、节点背景/边框、文字颜色、节点圆角等 CSS 变量，改动实时生效并持久化。深色主题下 React Flow 自带的缩放控件（Controls）/小地图（MiniMap）已改为跟随这些主题变量，不会再出现看不清的问题。

## 如何接入真实的自定义 API 模型

后端在 `server/src/lib/customApi.ts` 中实现。填写模型配置时：

- `endpoint` / `method` / `headers`：按你的服务要求填写，例如 `Authorization: Bearer xxx`。
- `bodyTemplate`：一段 JSON 字符串模板，发起请求前会做字符串替换：
  - `{{prompt}}` → 面板里输入的最终提示词（已做 JSON 转义）
  - `{{image0}}`、`{{image1}}`… → 按引用顺序取到的图片地址（字符串）
  - `{{images}}` → 全部图片地址组成的 JSON 数组
- `responseImagePath`：从响应 JSON 中取图片地址的点号路径，比如响应是 `{"data":{"images":[{"url":"..."}]}}`，就填 `data.images.0.url`。
- `responseIsUrl`：勾选表示该字段是一个可访问的图片 URL（后端会代为下载落盘）；不勾选则按 base64（支持 `data:image/png;base64,...` 前缀）解析。

## 如何接入 ComfyUI 工作流

后端在 `server/src/lib/comfyui.ts` 中实现，基于 ComfyUI 官方的 HTTP API：`POST /prompt` 提交、`GET /history/{prompt_id}` 轮询结果、`GET /view` 取图，图片输入通过 `POST /upload/image` 上传后填入 `LoadImage` 节点。参考：[ComfyUI Server API Routes](https://docs.comfy.org/development/comfyui-server/comms_routes)、[API Examples](https://docs.comfy.org/development/comfyui-server/api-examples)。

接入步骤：

1. 在 ComfyUI 网页版里搭好你的工作流，通过菜单「导出（API 格式）」得到一份 workflow JSON（不是普通的 workflow 导出，两者格式不同，一定要选 API 格式）。
2. 在模型管理里新建一个「ComfyUI 工作流」模型：
   - `baseUrl`：你的 ComfyUI 服务地址，如 `http://127.0.0.1:8188`；
   - `workflow`：粘贴上一步导出的 JSON；
   - `promptNodeId` / `promptInputField`：正向提示词所在节点的 ID，以及该节点 `inputs` 里承载文本的字段名（通常是 `CLIPTextEncode` 节点的 `text` 字段）；
   - `imageNodeId` / `imageInputField`（可选）：如果工作流里有图生图的 `LoadImage` 节点，填它的节点 ID 和字段名（通常是 `image`）；不填则该模型只支持文生图；
   - `outputNodeId`：产出图片的节点 ID（通常是 `SaveImage` 节点）。
3. 保存后即可在 Agent 面板中选择该模型生成。

节点 ID 可以在 ComfyUI 网页版打开「开发者模式」，或者直接查看导出的 API 格式 JSON 顶层的数字 key（每个 key 就是一个节点 ID）。

## 已知限制 / 后续可优化方向

- 目前是单工作空间（可以有多个项目，但没有团队/多工作空间概念）、无鉴权，仅适合本机个人使用；如果要多人协作或部署到公网，需要补充用户体系和鉴权。
- JSON 文件存储没有并发写锁之外的事务保证，高频并发写入场景建议换成 SQLite/Postgres。
- ComfyUI 接入目前用轮询 `/history` 判断完成，没有走 WebSocket 实时进度；工作流执行时间较长时前端只会显示一个通用的「生成中」占位，没有百分比进度。
- 视频/音频节点目前只支持上传本地素材并预览播放，尚未接入视频/音频生成模型（数据结构里的 `generated` 字段已经预留，接入方式可以参考图片节点 + 生成接口的实现模式）；素材库、模板等 TapNow 的其它能力也还没做。
- 首页项目卡片目前是网格视图，没有实现 TapNow 首页里的「个人/团队项目」切换、显示筛选、网格/列表视图切换等次要功能。

## 技术栈版本

- 前端：`react@19.2.8`、`@xyflow/react@12.11.3`、`zustand@5.0.15`、`vite@8.2.2`、`tailwindcss@3.4.19`
- 后端：`express@5.2.1`、`multer@2.2.0`、`nanoid@6.0.1`、`typescript@5.7.3`、`tsx@4.20.6`
