// 节点类型的极简线性图标：纯 SVG 描边绘制，不使用 emoji / 图标字体，
// 颜色跟随 currentColor，方便随主题（尤其 hover 时切换为强调色）联动
import type { NodeMenuType } from "./AddNodeMenu";

interface Props {
  type: NodeMenuType;
  className?: string;
}

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function TextGlyph({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <line x1="5" y1="7" x2="19" y2="7" />
      <line x1="5" y1="12" x2="19" y2="12" />
      <line x1="5" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function ImageGlyph({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M4 16l5-4 3 2.5 3-3 5 4.5" />
    </svg>
  );
}

function VideoGlyph({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <rect x="4" y="6" width="12" height="12" rx="2" />
      <path d="M16 10.5l4.2-2.4a.8.8 0 0 1 1.2.7v6.4a.8.8 0 0 1-1.2.7L16 13.5" />
    </svg>
  );
}

function AudioGlyph({ className }: { className?: string }) {
  return (
    <svg {...commonProps} className={className}>
      <line x1="4" y1="12" x2="4" y2="12" />
      <line x1="7" y1="9" x2="7" y2="15" />
      <line x1="10" y1="6" x2="10" y2="18" />
      <line x1="13" y1="10" x2="13" y2="14" />
      <line x1="16" y1="7" x2="16" y2="17" />
      <line x1="19" y1="10" x2="19" y2="14" />
    </svg>
  );
}

const GLYPHS: Record<NodeMenuType, typeof TextGlyph> = {
  text: TextGlyph,
  image: ImageGlyph,
  video: VideoGlyph,
  audio: AudioGlyph,
};

export function NodeTypeIcon({ type, className }: Props) {
  const Glyph = GLYPHS[type];
  return <Glyph className={className} />;
}
