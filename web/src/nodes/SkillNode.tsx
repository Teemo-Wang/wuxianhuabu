// Skill 节点：承载一段预设好的 Markdown 提示词模板（文生图模板 / 图片反推 / 图转视频提示词等）
// 可以从 Skill 库选择已有条目加载，也可以直接编辑内容并另存为库条目
import { memo, useEffect, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useCanvasStore } from "../store/canvasStore";
import { useSkillStore } from "../store/skillStore";
import type { SkillNodeData } from "../types";

function SkillNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as SkillNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const skills = useSkillStore((s) => s.skills);
  const loadSkills = useSkillStore((s) => s.loadSkills);
  const createSkill = useSkillStore((s) => s.createSkill);
  const updateSkill = useSkillStore((s) => s.updateSkill);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState(nodeData.name);
  const [draftContent, setDraftContent] = useState(nodeData.content);

  useEffect(() => {
    void loadSkills();
  }, [loadSkills]);

  const applySkill = (skillId: string) => {
    const skill = skills.find((s) => s.id === skillId);
    if (!skill) return;
    updateNodeData(id, { skillId: skill.id, name: skill.name, content: skill.content });
    setPickerOpen(false);
  };

  const startEdit = () => {
    setDraftName(nodeData.name);
    setDraftContent(nodeData.content);
    setEditing(true);
  };

  const saveEditOnlyHere = () => {
    // 仅更新当前节点内容，不回写库；一旦手动改过内容就与原库条目脱钩
    updateNodeData(id, { skillId: null, name: draftName || "未命名 Skill", content: draftContent });
    setEditing(false);
  };

  const saveAndSyncToLibrary = async () => {
    const name = draftName.trim() || "未命名 Skill";
    if (nodeData.skillId) {
      const updated = await updateSkill(nodeData.skillId, { name, content: draftContent });
      updateNodeData(id, { skillId: updated.id, name: updated.name, content: updated.content });
    } else {
      const created = await createSkill(name, draftContent);
      updateNodeData(id, { skillId: created.id, name: created.name, content: created.content });
    }
    setEditing(false);
  };

  return (
    <div
      className={`group relative w-[260px] rounded-node border bg-node-bg p-2 shadow-sm transition-colors ${
        selected ? "border-accent" : "border-node-border"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-accent !w-2 !h-2" />
      <Handle type="source" position={Position.Right} className="!bg-accent !w-2 !h-2" />

      <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-text-secondary">
        <span>Skill</span>
        <div className="relative">
          <button
            type="button"
            className="nodrag rounded-md border border-panel-border px-1.5 py-0.5 hover:border-accent hover:text-accent"
            onClick={() => setPickerOpen((v) => !v)}
          >
            选择
          </button>
          {pickerOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
              <div className="nodrag absolute right-0 top-6 z-50 max-h-56 w-56 overflow-y-auto rounded-lg border border-panel-border bg-panel p-1 shadow-xl">
                {skills.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-text-secondary">
                    Skill 库为空，点击下方「编辑」新建一个
                  </div>
                ) : (
                  skills.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent/10 ${
                        s.id === nodeData.skillId ? "text-accent" : "text-text-primary"
                      }`}
                      onClick={() => applySkill(s.id)}
                    >
                      <span className="truncate">{s.name}</span>
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {editing ? (
        <div className="nodrag flex flex-col gap-1.5">
          <input
            className="rounded-md border border-panel-border bg-canvas p-1 text-sm text-text-primary outline-none focus:border-accent"
            placeholder="Skill 名称"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
          />
          <textarea
            autoFocus
            className="h-28 w-full resize-none rounded-md border border-panel-border bg-canvas p-1.5 font-mono text-xs text-text-primary outline-none focus:border-accent"
            placeholder="# Skill 名称\n\n预设好的完整提示词内容（Markdown）"
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              className="rounded-md border border-panel-border px-2 py-1 text-[11px] text-text-secondary hover:border-accent hover:text-accent"
              onClick={saveEditOnlyHere}
            >
              仅用于此节点
            </button>
            <button
              type="button"
              className="rounded-md bg-accent px-2 py-1 text-[11px] font-medium text-accent-fg hover:opacity-90"
              onClick={() => void saveAndSyncToLibrary()}
            >
              保存到库
            </button>
          </div>
        </div>
      ) : (
        <div
          className="nodrag min-h-[4rem] cursor-text rounded-md border border-panel-border bg-canvas p-2"
          onDoubleClick={startEdit}
        >
          <div className="mb-1 text-sm font-medium text-text-primary">
            {nodeData.name || "未命名 Skill"}
          </div>
          <div className="line-clamp-3 whitespace-pre-wrap text-[11px] text-text-secondary">
            {nodeData.content || "双击编辑此 Skill 的提示词内容…"}
          </div>
        </div>
      )}
    </div>
  );
}

export const SkillNode = memo(SkillNodeComponent);
