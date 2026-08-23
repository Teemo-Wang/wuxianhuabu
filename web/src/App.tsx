// 应用入口：在「首页工作区」和「项目画布编辑」两个视图之间切换，并负责初始化加载主题/模型数据
import { useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { Canvas } from "./canvas/Canvas";
import { TopRightToolbar } from "./canvas/TopRightToolbar";
import { SelectionActionBar } from "./canvas/SelectionActionBar";
import { ModelManagerModal } from "./panels/ModelManagerModal";
import { ThemeSettingsModal } from "./panels/ThemeSettingsModal";
import { ImagePreviewModal } from "./panels/ImagePreviewModal";
import { ImageEditorModal } from "./panels/ImageEditorModal";
import { SkillLibraryModal } from "./panels/SkillLibraryModal";
import { ComfyWorkflowLibraryModal } from "./panels/ComfyWorkflowLibraryModal";
import { HomePage } from "./home/HomePage";
import { useCanvasStore } from "./store/canvasStore";
import { useModelStore } from "./store/modelStore";
import { useThemeStore } from "./store/themeStore";

type View = { name: "home" } | { name: "project"; projectId: string };

function App() {
  const loadProject = useCanvasStore((s) => s.loadProject);
  const resetCanvas = useCanvasStore((s) => s.resetCanvas);
  const projectName = useCanvasStore((s) => s.projectName);
  const loadModels = useModelStore((s) => s.loadModels);
  const loadTheme = useThemeStore((s) => s.loadTheme);

  const [view, setView] = useState<View>({ name: "home" });
  const [modelsOpen, setModelsOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [comfyWorkflowsOpen, setComfyWorkflowsOpen] = useState(false);

  useEffect(() => {
    void loadTheme();
    void loadModels();
  }, [loadModels, loadTheme]);

  const openProject = (projectId: string) => {
    setView({ name: "project", projectId });
    void loadProject(projectId);
  };

  const goHome = () => {
    resetCanvas();
    setView({ name: "home" });
  };

  return (
    <div className="relative h-screen w-screen bg-canvas">
      {view.name === "home" ? (
        <HomePage
          onOpenProject={openProject}
          onOpenModels={() => setModelsOpen(true)}
          onOpenTheme={() => setThemeOpen(true)}
          onOpenSkills={() => setSkillsOpen(true)}
          onOpenComfyWorkflows={() => setComfyWorkflowsOpen(true)}
        />
      ) : (
        <ReactFlowProvider>
          <Canvas />
          <TopRightToolbar
            projectName={projectName}
            onOpenModels={() => setModelsOpen(true)}
            onOpenTheme={() => setThemeOpen(true)}
            onOpenSkills={() => setSkillsOpen(true)}
            onOpenComfyWorkflows={() => setComfyWorkflowsOpen(true)}
            onGoHome={goHome}
          />
          <SelectionActionBar />
        </ReactFlowProvider>
      )}

      <ModelManagerModal open={modelsOpen} onClose={() => setModelsOpen(false)} />
      <ThemeSettingsModal open={themeOpen} onClose={() => setThemeOpen(false)} />
      <SkillLibraryModal open={skillsOpen} onClose={() => setSkillsOpen(false)} />
      <ComfyWorkflowLibraryModal open={comfyWorkflowsOpen} onClose={() => setComfyWorkflowsOpen(false)} />
      <ImagePreviewModal />
      <ImageEditorModal />
    </div>
  );
}

export default App;
