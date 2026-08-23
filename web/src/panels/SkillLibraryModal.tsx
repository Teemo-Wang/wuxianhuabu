// Skill 库管理弹窗：集中查看/新建/编辑/删除所有已保存的 Skill（预设提示词模板）
import { useEffect, useState } from "react";
import { useSkillStore } from "../store/skillStore";
import type { SkillEntry } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

function emptyDraft() {
  return { name: "", content: "" };
}

export function SkillLibraryModal({ open, onClose }: Props) {
  const skills = useSkillStore((s) => s.skills);
  const loaded = useSkillStore((s) => s.loaded);
  const loadSkills = useSkillStore((s) => s.loadSkills);
  const createSkill = useSkillStore((s) => s.createSkill);
  const updateSkill = useSkillStore((s) => s.updateSkill);
  const deleteSkill = useSkillStore((s) => s.deleteSkill);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) void loadSkills();
  }, [open, loadSkills]);

  useEffect(() => {
    if (!open) {
      setSelectedId(null);
      setDraft(emptyDraft());
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const startCreate = () => {
    setSelectedId("__new__");
    setDraft(emptyDraft());
    setError(null);
  };

  const startEdit = (skill: SkillEntry) => {
    setSelectedId(skill.id);
    setDraft({ name: skill.name, content: skill.content });
    setError(null);
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setError("请填写 Skill 名称");
      return;
    }
    if (selectedId && selectedId !== "__new__") {
      await updateSkill(selectedId, draft);
    } else {
      const created = await createSkill(draft.name.trim(), draft.content);
      setSelectedId(created.id);
    }
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-[760px] flex-col rounded-xl border border-panel-border bg-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-panel-border px-4 py-3">
          <span className="text-sm font-semibold text-text-primary">Skill 库</span>
          <button type="button" className="text-text-secondary hover:text-text-primary" onClick={onClose}>
            关闭
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* 左侧：库条目列表 */}
          <div className="w-60 shrink-0 border-r border-panel-border p-2">
            <button
              type="button"
              className="mb-2 w-full rounded-md border border-panel-border px-2 py-1 text-xs text-text-primary hover:border-accent hover:text-accent"
              onClick={startCreate}
            >
              + 新建 Skill
            </button>
            <div className="flex flex-col gap-1 overflow-y-auto">
              {!loaded ? (
                <p className="px-2 py-1.5 text-xs text-text-secondary">加载中…</p>
              ) : skills.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-text-secondary">
                  还没有保存任何 Skill，点击上方「新建 Skill」创建
                </p>
              ) : (
                skills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`rounded-md px-2 py-1.5 text-left text-xs ${
                      selectedId === s.id ? "bg-accent/10 text-accent" : "text-text-primary hover:bg-accent/5"
                    }`}
                    onClick={() => startEdit(s)}
                  >
                    <div className="truncate">{s.name}</div>
                    <div className="truncate text-[10px] text-text-secondary">
                      更新于 {new Date(s.updatedAt).toLocaleString()}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 右侧：编辑区 */}
          <div className="flex-1 overflow-y-auto p-4">
            {!selectedId ? (
              <p className="text-sm text-text-secondary">从左侧选择一个 Skill 查看/编辑，或新建一个。</p>
            ) : (
              <div className="flex h-full flex-col gap-3">
                <label className="flex flex-col gap-1 text-xs text-text-secondary">
                  名称
                  <input
                    className="rounded-md border border-panel-border bg-canvas p-1.5 text-sm text-text-primary outline-none focus:border-accent"
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-xs text-text-secondary">
                  内容（Markdown）
                  <textarea
                    className="min-h-[240px] flex-1 resize-none rounded-md border border-panel-border bg-canvas p-2 font-mono text-xs text-text-primary outline-none focus:border-accent"
                    placeholder="预设好的完整提示词内容，例如文生图提示词模板 / 图片反推 / 图转视频提示词模板"
                    value={draft.content}
                    onChange={(e) => setDraft({ ...draft, content: e.target.value })}
                  />
                </label>

                {error && <p className="text-xs text-red-400">{error}</p>}

                <div className="flex items-center justify-between pt-1">
                  {selectedId !== "__new__" ? (
                    <button
                      type="button"
                      className="rounded-md border border-panel-border px-3 py-1.5 text-xs text-red-400 hover:border-red-400"
                      onClick={async () => {
                        await deleteSkill(selectedId);
                        setSelectedId(null);
                      }}
                    >
                      删除
                    </button>
                  ) : (
                    <span />
                  )}
                  <button
                    type="button"
                    className="rounded-md bg-accent px-4 py-1.5 text-xs font-medium text-accent-fg hover:opacity-90"
                    onClick={() => void handleSave()}
                  >
                    保存
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
