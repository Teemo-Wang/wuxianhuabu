// 右上角工具栏：模型管理入口、主题设置入口、保存状态提示
import { useCanvasStore } from "../store/canvasStore";

const SAVE_STATUS_LABEL: Record<string, string> = {
  idle: "",
  saving: "保存中…",
  saved: "已保存",
  error: "保存失败",
};

interface Props {
  projectName: string;
  onOpenModels: () => void;
  onOpenTheme: () => void;
  onGoHome: () => void;
}

export function TopRightToolbar({ projectName, onOpenModels, onOpenTheme, onGoHome }: Props) {
  const saveStatus = useCanvasStore((s) => s.saveStatus);

  return (
    <>
      {/* 左上角显示当前项目名，与左侧新增节点按钮保持视觉分离 */}
      <div className="absolute left-16 top-4 z-20 flex items-center">
        <span className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow">
          {projectName || "未命名项目"}
        </span>
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <span className="text-[11px] text-text-secondary">{SAVE_STATUS_LABEL[saveStatus]}</span>
        <button
          type="button"
          className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow hover:border-accent hover:text-accent"
          onClick={onGoHome}
        >
          首页
        </button>
        <button
          type="button"
          className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow hover:border-accent hover:text-accent"
          onClick={onOpenModels}
        >
          模型管理
        </button>
        <button
          type="button"
          className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow hover:border-accent hover:text-accent"
          onClick={onOpenTheme}
        >
          主题外观
        </button>
      </div>
    </>
  );
}
