// 无限画布核心：封装 React Flow，负责节点渲染、连线、多选、右键/双击新增节点
import { useCallback, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useReactFlow,
  type NodeMouseHandler,
  type OnConnectStart,
  type OnConnectEnd,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCanvasStore } from "../store/canvasStore";
import { TextNode } from "../nodes/TextNode";
import { ImageNode } from "../nodes/ImageNode";
import { VideoNode } from "../nodes/VideoNode";
import { AudioNode } from "../nodes/AudioNode";
import { GeneratingNode } from "../nodes/GeneratingNode";
import { AddNodeMenu, type AddNodeMenuState, type NodeMenuType } from "./AddNodeMenu";
import { useAgentStore } from "../store/agentStore";

const nodeTypes = {
  text: TextNode,
  image: ImageNode,
  video: VideoNode,
  audio: AudioNode,
  generating: GeneratingNode,
};

export function Canvas() {
  const {
    nodes,
    edges,
    viewport,
    loaded,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setViewport,
    addNode,
    connectNodes,
  } = useCanvasStore();
  const openAgentPanel = useAgentStore((s) => s.openPanel);

  const { screenToFlowPosition } = useReactFlow();
  const [menu, setMenu] = useState<AddNodeMenuState | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // 记录当前正在拖拽的连线起点节点 id（从某个节点的 Handle 拖出时记录），
  // 用于「拖到空白处松手 -> 弹出节点选择菜单 -> 选完自动连线」这套类似 ComfyUI 的交互
  const connectingFromRef = useRef<string | null>(null);

  const openMenuAt = useCallback(
    (clientX: number, clientY: number, connectFromId?: string) => {
      const flowPos = screenToFlowPosition({ x: clientX, y: clientY });
      setMenu({ screenX: clientX, screenY: clientY, flowX: flowPos.x, flowY: flowPos.y, connectFromId });
    },
    [screenToFlowPosition]
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      openMenuAt((event as MouseEvent).clientX, (event as MouseEvent).clientY);
    },
    [openMenuAt]
  );

  // 双击空白画布区域新增节点（需与节点内部的双击编辑区分：仅当事件目标是 pane 本身）
  const handleWrapperDoubleClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.classList.contains("react-flow__pane")) return;
      openMenuAt(event.clientX, event.clientY);
    },
    [openMenuAt]
  );

  // 记录连线拖拽的起点节点，供 onConnectEnd 判断「拖到空白处」时使用
  const handleConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectingFromRef.current = params.nodeId ?? null;
  }, []);

  // 连线拖拽结束：如果落在有效 Handle 上，React Flow 会走 onConnect 正常连线；
  // 如果落在空白画布上（没有 toHandle），则弹出新建节点菜单，选择类型后自动创建节点并连线
  const handleConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      const sourceId = connectingFromRef.current;
      connectingFromRef.current = null;
      // toHandle 为空表示鼠标松开时没有落在任何节点的 Handle 上（即拖到了空白画布），
      // 这种情况下弹出节点选择菜单；若落在了有效 Handle 上，onConnect 已经处理过连线，这里跳过
      if (!sourceId || connectionState.toHandle) return;

      const point =
        "changedTouches" in event ? event.changedTouches[0] : (event as MouseEvent);
      // 携带这条连线的起点节点 id，供选择节点类型后自动连线使用
      openMenuAt(point.clientX, point.clientY, sourceId);
    },
    [openMenuAt]
  );

  const handleSelectType = (type: NodeMenuType) => {
    if (!menu) return;
    const position = { x: menu.flowX, y: menu.flowY };
    const newNode =
      type === "text"
        ? addNode({ type: "text", position, data: { kind: "text", content: "" } })
        : type === "image"
        ? addNode({ type: "image", position, data: { kind: "image", url: "" } })
        : type === "video"
        ? addNode({ type: "video", position, data: { kind: "video", url: "" } })
        : addNode({ type: "audio", position, data: { kind: "audio", url: "" } });
    if (menu.connectFromId) {
      connectNodes([menu.connectFromId], newNode.id);
    }
    setMenu(null);
  };

  // 双击节点：打开 Agent 面板并以该节点为引用（对应 TapNow 的“选中节点交给 Agent”）
  const handleNodeDoubleClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === "generating") return;
      openAgentPanel([node.id]);
    },
    [openAgentPanel]
  );

  if (!loaded) {
    return (
      <div className="flex h-full w-full items-center justify-center text-text-secondary">
        画布加载中…
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative h-full w-full" onDoubleClick={handleWrapperDoubleClick}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        nodeTypes={nodeTypes}
        defaultViewport={viewport}
        onMoveEnd={(_e, vp) => setViewport(vp)}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeDoubleClick={handleNodeDoubleClick}
        onPaneClick={() => setMenu(null)}
        zoomOnDoubleClick={false}
        selectionOnDrag
        selectionMode={SelectionMode.Partial}
        panOnDrag={[1, 2]}
        // 触摸板双指滑动走 panOnScroll（平移画布），双指捏合缩放走 zoomOnPinch；
        // 关掉 zoomOnScroll 避免双指滑动被当成滚轮缩放
        panOnScroll
        panOnScrollSpeed={1}
        zoomOnScroll={false}
        zoomOnPinch
        minZoom={0.1}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--color-panel-border)" />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(0,0,0,0.4)"
          style={{ backgroundColor: "var(--color-panel-bg)" }}
        />
      </ReactFlow>

      {menu && (
        <AddNodeMenu state={menu} onSelect={handleSelectType} onClose={() => setMenu(null)} />
      )}
    </div>
  );
}
