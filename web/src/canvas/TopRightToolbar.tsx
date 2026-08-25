// 右上角工具栏：模型管理入口、主题设置入口、保存状态提示
// 左上角：首页按钮 + 项目名（支持双击直接改名，无边框，弱化为文字标签）
import { useEffect, useRef, useState } from "react";
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
  onOpenSkills: () => void;
  onOpenComfyWorkflows: () => void;
  onOpenAgent: () => void;
  onGoHome: () => void;
}

export function TopRightToolbar({
  projectName,
  onOpenModels,
  onOpenTheme,
  onOpenSkills,
  onOpenComfyWorkflows,
  onOpenAgent,
  onGoHome,
}: Props) {
  const saveStatus = useCanvasStore((s) => s.saveStatus);
  const renameCurrentProject = useCanvasStore((s) => s.renameCurrentProject);

  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(projectName);
  const inputRef = useRef<HTMLInputElement>(null);

  // 项目名从后端加载完成后同步进草稿，避免刚进入编辑页时显示空字符串
  useEffect(() => {
    if (!editing) setDraftName(projectName);
  }, [projectName, editing]);

  const startEditing = () => {
    setDraftName(projectName);
    setEditing(true);
  };

  const commitRename = () => {
    setEditing(false);
    const trimmed = draftName.trim();
    if (trimmed) {
      void renameCurrentProject(trimmed);
    } else {
      setDraftName(projectName);
    }
  };

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  return (
    <>
      {/* 左上角：首页按钮 + 当前项目名（双击可直接改名），与左侧新增节点按钮保持视觉分离 */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <button
          type="button"
          className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow hover:border-accent hover:text-accent"
          onClick={onGoHome}
        >
          首页
        </button>
        {editing ? (
          <input
            ref={inputRef}
            autoFocus
            className="nodrag rounded-md bg-transparent px-1 py-1.5 text-sm text-text-primary outline-none"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraftName(projectName);
                setEditing(false);
              }
            }}
          />
        ) : (
          <span
            className="cursor-text rounded-md px-1 py-1.5 text-sm text-text-primary"
            title="双击修改项目名"
            onDoubleClick={startEditing}
          >
            {projectName || "未命名项目"}
          </span>
        )}
      </div>

      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <span className="text-[11px] text-text-secondary">{SAVE_STATUS_LABEL[saveStatus]}</span>
        <button
          type="button"
          className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow hover:border-accent hover:text-accent"
          onClick={onOpenAgent}
        >
          Agent
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
          onClick={onOpenComfyWorkflows}
        >
          工作流库
        </button>
        <button
          type="button"
          className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary shadow hover:border-accent hover:text-accent"
          onClick={onOpenSkills}
        >
          Skill 库
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
