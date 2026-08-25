// 画布右侧 Agent 聊天面板：配置对话模型后，可以让它看画布、写提示词、摆节点、触发生成
import { useEffect } from "react";
import { useCanvasAgentStore } from "../store/canvasAgentStore";

export function AgentPanel() {
  const open = useCanvasAgentStore((s) => s.open);
  const messages = useCanvasAgentStore((s) => s.messages);
  const input = useCanvasAgentStore((s) => s.input);
  const sending = useCanvasAgentStore((s) => s.sending);
  const settings = useCanvasAgentStore((s) => s.settings);
  const settingsOpen = useCanvasAgentStore((s) => s.settingsOpen);
  const errorMessage = useCanvasAgentStore((s) => s.errorMessage);
  const setOpen = useCanvasAgentStore((s) => s.setOpen);
  const setInput = useCanvasAgentStore((s) => s.setInput);
  const setSettingsOpen = useCanvasAgentStore((s) => s.setSettingsOpen);
  const patchSettings = useCanvasAgentStore((s) => s.patchSettings);
  const loadSettings = useCanvasAgentStore((s) => s.loadSettings);
  const saveSettings = useCanvasAgentStore((s) => s.saveSettings);
  const send = useCanvasAgentStore((s) => s.send);

  useEffect(() => {
    if (open) void loadSettings();
  }, [open, loadSettings]);

  if (!open) return null;

  return (
    <div className="absolute bottom-4 right-4 top-16 z-30 flex w-[340px] flex-col overflow-hidden rounded-xl border border-panel-border bg-panel shadow-2xl">
      <div className="flex items-center justify-between border-b border-panel-border px-3 py-2">
        <span className="text-sm font-semibold text-text-primary">画布 Agent</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="text-xs text-text-secondary hover:text-accent"
            onClick={() => setSettingsOpen(!settingsOpen)}
          >
            {settingsOpen ? "收起配置" : "配置"}
          </button>
          <button
            type="button"
            className="text-xs text-text-secondary hover:text-text-primary"
            onClick={() => setOpen(false)}
          >
            关闭
          </button>
        </div>
      </div>

      {settingsOpen && (
        <div className="flex flex-col gap-2 border-b border-panel-border p-3">
          <p className="text-[11px] text-text-secondary">
            填一个能聊天的模型（和 ChatGPT 兼容的接口即可），Agent 才能看画布、帮你写提示词。
          </p>
          <input
            className="rounded-md border border-panel-border bg-canvas px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
            placeholder="API 地址，填到 /v1 为止"
            value={settings.baseUrl}
            onChange={(e) => patchSettings({ baseUrl: e.target.value })}
          />
          <input
            className="rounded-md border border-panel-border bg-canvas px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
            placeholder="API 密钥"
            type="password"
            value={settings.apiKey}
            onChange={(e) => patchSettings({ apiKey: e.target.value })}
          />
          <input
            className="rounded-md border border-panel-border bg-canvas px-2 py-1.5 text-xs text-text-primary outline-none focus:border-accent"
            placeholder="模型名称，如 gpt-4o-mini"
            value={settings.modelName}
            onChange={(e) => patchSettings({ modelName: e.target.value })}
          />
          <button
            type="button"
            className="self-end rounded-md bg-accent px-3 py-1 text-xs text-accent-fg hover:opacity-90"
            onClick={() => void saveSettings()}
          >
            保存配置
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 && (
          <p className="text-xs leading-5 text-text-secondary">
            选中画布上的图或文字，然后跟我说：比如「按这张图生成一张更亮的」「让它动起来做成视频」。我会帮你写提示词并点生成。
          </p>
        )}
        {messages.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-xs leading-5 ${
              m.role === "user"
                ? "ml-auto bg-accent/15 text-text-primary"
                : "bg-canvas text-text-primary"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <p className="text-[11px] text-text-secondary">正在想…</p>}
      </div>

      {errorMessage && <p className="px-3 pb-1 text-[11px] text-red-400">{errorMessage}</p>}

      <div className="flex gap-2 border-t border-panel-border p-3">
        <textarea
          className="h-16 flex-1 resize-none rounded-md border border-panel-border bg-canvas p-2 text-xs text-text-primary outline-none focus:border-accent"
          placeholder="跟 Agent 说话，Enter 发送"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <button
          type="button"
          disabled={sending}
          className="self-end rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90 disabled:opacity-50"
          onClick={() => void send()}
        >
          发送
        </button>
      </div>
    </div>
  );
}
