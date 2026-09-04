// 节点头部可编辑的素材命名：默认展示态是一段截断显示的文字，双击后切换为输入框编辑，
// 编辑态和展示态都限制最大长度，避免过长的命名把节点头部撑爆或挤占类型标签的空间
import { useEffect, useRef, useState } from "react";

/** 素材命名最大长度：编辑时输入框会硬性限制，展示时超出的部分做省略处理 */
export const MAX_NODE_NAME_LENGTH = 20;

interface Props {
  name: string | undefined;
  placeholder: string;
  onChange: (name: string) => void;
}

export function EditableNodeName({ name, placeholder, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? "");
  const inputRef = useRef<HTMLInputElement>(null);

  // 进入编辑态时，用当前命名回填草稿并聚焦；等 input 挂载后再聚焦，避免抓不到焦点
  useEffect(() => {
    if (!editing) return;
    setDraft(name ?? "");
    const raf = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(raf);
  }, [editing, name]);

  const commit = () => {
    onChange(draft.trim().slice(0, MAX_NODE_NAME_LENGTH));
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className="nodrag ml-2 min-w-0 max-w-[140px] flex-1 rounded border border-accent bg-canvas px-1 py-0.5 text-[11px] text-text-primary outline-none"
        maxLength={MAX_NODE_NAME_LENGTH}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          } else if (e.key === "Escape") {
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <span
      className="nodrag ml-2 max-w-[140px] shrink-0 truncate text-right text-[11px] text-text-secondary hover:text-accent"
      title={name && name.length > MAX_NODE_NAME_LENGTH ? name : undefined}
      onDoubleClick={() => setEditing(true)}
    >
      {name || placeholder}
    </span>
  );
}
