// 首页工作区：展示当前工作空间内的全部项目，可新建/打开/重命名/删除
// 参考 TapNow 首页的项目网格布局（个人使用场景下不做团队/多工作空间区分）
import { useEffect, useState } from "react";
import { useProjectStore } from "../store/projectStore";
import type { ProjectSummary } from "../types";

interface Props {
  onOpenProject: (projectId: string) => void;
  onOpenModels: () => void;
  onOpenTheme: () => void;
  onOpenSkills: () => void;
  onOpenComfyWorkflows: () => void;
}

function formatUpdatedAt(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "刚刚编辑";
  if (diffMin < 60) return `编辑于 ${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `编辑于 ${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `编辑于 ${diffDay} 天前`;
  return `编辑于 ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function HomePage({ onOpenProject, onOpenModels, onOpenTheme, onOpenSkills, onOpenComfyWorkflows }: Props) {
  const projects = useProjectStore((s) => s.projects);
  const loaded = useProjectStore((s) => s.loaded);
  const loadProjects = useProjectStore((s) => s.loadProjects);
  const createProject = useProjectStore((s) => s.createProject);
  const renameProject = useProjectStore((s) => s.renameProject);
  const deleteProject = useProjectStore((s) => s.deleteProject);

  const [menuForId, setMenuForId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleCreate = async () => {
    const project = await createProject();
    onOpenProject(project.id);
  };

  const startRename = (project: ProjectSummary) => {
    setMenuForId(null);
    setRenamingId(project.id);
    setRenameValue(project.name);
  };

  const commitRename = async () => {
    if (renamingId && renameValue.trim()) {
      await renameProject(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleDelete = async (id: string) => {
    setMenuForId(null);
    await deleteProject(id);
  };

  return (
    <div className="h-screen w-screen overflow-y-auto bg-canvas">
      {/* 顶部导航条 */}
      <header className="flex items-center justify-between border-b border-panel-border px-6 py-3">
        <span className="text-sm font-semibold text-text-primary">Teemo-无限画布</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary hover:border-accent hover:text-accent"
            onClick={onOpenModels}
          >
            模型管理
          </button>
          <button
            type="button"
            className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary hover:border-accent hover:text-accent"
            onClick={onOpenComfyWorkflows}
          >
            工作流库
          </button>
          <button
            type="button"
            className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary hover:border-accent hover:text-accent"
            onClick={onOpenSkills}
          >
            Skill 库
          </button>
          <button
            type="button"
            className="rounded-md border border-panel-border bg-panel px-3 py-1.5 text-xs text-text-primary hover:border-accent hover:text-accent"
            onClick={onOpenTheme}
          >
            主题外观
          </button>
        </div>
      </header>

      {/* 项目网格区域 */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="mb-4 text-sm font-medium text-text-secondary">我的项目</h1>

        {!loaded ? (
          <p className="text-sm text-text-secondary">加载中…</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {/* 新建项目卡片 */}
            <button
              type="button"
              className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-panel-border bg-panel text-text-secondary hover:border-accent hover:text-accent"
              onClick={handleCreate}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-current text-lg leading-none">
                +
              </span>
              <span className="text-sm">新建项目</span>
            </button>

            {projects.map((project) => (
              <div key={project.id} className="group relative">
                <button
                  type="button"
                  className="block w-full overflow-hidden rounded-xl border border-panel-border bg-node-bg text-left transition-colors hover:border-accent"
                  onClick={() => onOpenProject(project.id)}
                >
                  <div className="flex aspect-[4/3] items-center justify-center overflow-hidden bg-panel">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-xs text-text-secondary">暂无内容</span>
                    )}
                  </div>
                  <div className="px-3 py-2">
                    {renamingId === project.id ? (
                      <input
                        autoFocus
                        className="w-full rounded border border-accent bg-canvas px-1 py-0.5 text-sm text-text-primary outline-none"
                        value={renameValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={commitRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitRename();
                          if (e.key === "Escape") setRenamingId(null);
                        }}
                      />
                    ) : (
                      <p className="truncate text-sm text-text-primary">{project.name}</p>
                    )}
                    <p className="mt-0.5 text-xs text-text-secondary">{formatUpdatedAt(project.updatedAt)}</p>
                  </div>
                </button>

                {/* 卡片右上角的操作菜单入口 */}
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    className="rounded-md border border-panel-border bg-panel px-1.5 py-0.5 text-xs text-text-primary hover:border-accent hover:text-accent"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuForId(menuForId === project.id ? null : project.id);
                    }}
                  >
                    更多
                  </button>
                  {menuForId === project.id && (
                    <>
                      <div className="fixed inset-0 z-[5]" onClick={() => setMenuForId(null)} />
                      <div className="absolute right-0 top-7 z-10 w-28 rounded-md border border-panel-border bg-panel p-1 shadow-xl">
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1 text-left text-xs text-text-primary hover:bg-accent/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(project);
                          }}
                        >
                          重命名
                        </button>
                        <button
                          type="button"
                          className="block w-full rounded px-2 py-1 text-left text-xs text-red-400 hover:bg-red-400/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(project.id);
                          }}
                        >
                          删除
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {loaded && projects.length === 0 && (
          <p className="mt-4 text-xs text-text-secondary">
            还没有项目，点击「新建项目」开始你的第一个无限画布创作。
          </p>
        )}
      </main>
    </div>
  );
}
