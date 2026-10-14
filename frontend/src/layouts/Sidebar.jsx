import React from "react";
import { Sparkles, Layers, BarChart3, Box, Cpu, PanelLeftClose, PanelLeftOpen, Zap } from "lucide-react";

export default function Sidebar({
  activeTab,
  onSelectTab,
  selectedModelType = "yolo",
  availableModels = [],
  isCollapsed = false,
  onToggleSidebar,
}) {
  const menuItems = [
    {
      id: "studio",
      label: "Pre-label Studio",
      icon: Sparkles,
      desc: "Upload & AI Keypoints Canvas",
    },
    {
      id: "cvat",
      label: "CVAT Task Hub",
      icon: Layers,
      desc: "Sync Tasks & Export Retrain",
    },
    {
      id: "retrain",
      label: "Active Learning",
      icon: Zap,
      desc: "Retrain 3 Models & Lineage",
    },
    {
      id: "analytics",
      label: "Quality & Metrics",
      icon: BarChart3,
      desc: "PCK, NME & Correction Rate",
    },
    {
      id: "benchmark",
      label: "Model Benchmark",
      icon: Cpu,
      desc: "So Sánh 3 Models (YOLO/RTM/ViT)",
    },
  ];

  const getModelDetails = () => {
    const curModel = availableModels.find((m) => m.id === selectedModelType);
    const badge = curModel?.version_badge || curModel?.badge;
    const isRetrained = curModel?.active_version && curModel.active_version !== "v0_base";

    switch (selectedModelType) {
      case "vitpose":
        return {
          name: curModel?.name || "ViTPose-Base",
          fullName: "ViTPose-Base (Transformer)",
          file: isRetrained ? `vitpose_${curModel.active_version}` : "usyd-community/vitpose-base-simple",
          badge: badge || "ViT-B",
        };
      case "rtmpose":
        return {
          name: curModel?.name || "RTMPose-m",
          fullName: "RTMPose-m (OpenMMLab)",
          file: isRetrained ? `rtmpose_${curModel.active_version}.onnx` : "rtmpose-m_simcc-body7.onnx",
          badge: badge || "SimCC",
        };
      default:
        return {
          name: curModel?.name || "YOLO 26 Pose",
          fullName: "YOLO 26 Pose Engine",
          file: isRetrained ? `yolo_retrained_${curModel.active_version}.pt` : "yolo26-pose.pt",
          badge: badge || "COCO-17",
        };
    }
  };

  const modelInfo = getModelDetails();

  return (
    <aside
      className={`relative bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between select-none transition-all duration-200 ease-in-out shrink-0 z-30 ${
        isCollapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div
          className={`h-14 flex items-center border-b border-zinc-800/80 px-3 transition-all ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-100 shrink-0">
              <Box className="w-4 h-4 text-zinc-300" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="font-semibold text-zinc-100 tracking-tight text-sm leading-none flex items-center space-x-1.5 truncate">
                  <span>PoseFlow</span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                    AI
                  </span>
                </div>
                <div className="text-[11px] text-zinc-500 mt-1 truncate">Keypoint Pre-labeling</div>
              </div>
            )}
          </div>

          <button
            onClick={onToggleSidebar}
            className={`p-1 rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900 transition-colors cursor-pointer shrink-0 ${
              isCollapsed ? "hidden" : "block"
            }`}
            title="Thu gọn sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="p-2 flex justify-center border-b border-zinc-800/40">
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 transition-colors cursor-pointer"
              title="Mở rộng sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-3.5 h-3.5 text-zinc-400" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <div className="p-2 space-y-0.5">
          {!isCollapsed && (
            <div className="px-2.5 py-1 text-[10px] font-medium tracking-wider text-zinc-500 uppercase font-mono">
              Menu Điều Hướng
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center rounded-lg transition-all cursor-pointer relative ${
                    isCollapsed ? "justify-center p-2.5" : "space-x-2.5 px-2.5 py-1.5 text-left"
                  } ${
                    isActive
                      ? "bg-zinc-900/80 text-white font-medium border border-zinc-800/80 shadow-xs before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-5 before:bg-white before:rounded-r"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  />
                  {!isCollapsed && (
                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs leading-tight truncate ${
                          isActive ? "text-white font-medium" : "text-zinc-300"
                        }`}
                      >
                        {item.label}
                      </div>
                      <div className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5 leading-tight">
                        {item.desc}
                      </div>
                    </div>
                  )}
                </button>

                {/* Floating Tooltip in collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2.5 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col z-50 bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap pointer-events-none">
                    <span className="text-xs font-medium text-zinc-100">{item.label}</span>
                    <span className="text-[10px] text-zinc-400">{item.desc}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hardware / Engine Status Card at bottom */}
      <div className="p-2.5 m-2 rounded-lg bg-zinc-900/50 border border-zinc-800/80 space-y-2">
        {isCollapsed ? (
          <div
            className="flex flex-col items-center justify-center p-1.5 cursor-pointer"
            title={`Active Engine: ${modelInfo.fullName} (${modelInfo.file})`}
          >
            <Cpu className="w-4 h-4 text-zinc-400" />
            <span className="relative flex h-1.5 w-1.5 mt-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-[10px] uppercase font-mono font-semibold text-zinc-400 tracking-wider">
                <Cpu className="w-3 h-3 text-zinc-400" />
                <span>Active Engine</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium bg-zinc-800/90 text-zinc-300 border border-zinc-700/60">
                {modelInfo.badge}
              </span>
            </div>

            <div className="space-y-0.5">
              <div className="text-xs font-medium text-zinc-200 truncate">{modelInfo.name}</div>
              <div className="text-[11px] text-zinc-400 font-mono truncate">{modelInfo.file}</div>
            </div>

            <div className="pt-2 border-t border-zinc-800/70 flex items-center justify-between text-[11px]">
              <span className="text-zinc-500">Trạng thái:</span>
              <span className="text-emerald-400 font-mono text-[11px] flex items-center space-x-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                </span>
                <span>Sẵn sàng</span>
              </span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
