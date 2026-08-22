// 主题设置弹窗：可视化编辑 CSS 颜色变量，实时预览并持久化
import { THEME_FIELDS, useThemeStore } from "../store/themeStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ThemeSettingsModal({ open, onClose }: Props) {
  const theme = useThemeStore((s) => s.theme);
  const setThemeValue = useThemeStore((s) => s.setThemeValue);
  const resetTheme = useThemeStore((s) => s.resetTheme);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[420px] rounded-xl border border-panel-border bg-panel shadow-2xl">
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">主题外观</span>
          <button type="button" className="text-text-secondary hover:text-text-primary" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="flex max-h-[60vh] flex-col gap-3 overflow-y-auto p-4">
          {THEME_FIELDS.map((field) => (
            <label key={field.key} className="flex items-center justify-between gap-3 text-sm text-text-primary">
              <span>{field.label}</span>
              <span className="flex items-center gap-2">
                {field.type === "color" ? (
                  <>
                    <input
                      type="color"
                      className="h-7 w-9 cursor-pointer rounded border border-panel-border bg-transparent"
                      value={theme[field.key] ?? "#000000"}
                      onChange={(e) => setThemeValue(field.key, e.target.value)}
                    />
                    <input
                      className="w-24 rounded-md border border-panel-border bg-canvas px-1.5 py-1 text-xs text-text-primary outline-none focus:border-accent"
                      value={theme[field.key] ?? ""}
                      onChange={(e) => setThemeValue(field.key, e.target.value)}
                    />
                  </>
                ) : (
                  <input
                    className="w-24 rounded-md border border-panel-border bg-canvas px-1.5 py-1 text-xs text-text-primary outline-none focus:border-accent"
                    value={theme[field.key] ?? ""}
                    onChange={(e) => setThemeValue(field.key, e.target.value)}
                  />
                )}
              </span>
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2 border-t border-panel-border px-4 py-3">
          <button
            type="button"
            className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
            onClick={resetTheme}
          >
            恢复默认
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
            onClick={onClose}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
}
