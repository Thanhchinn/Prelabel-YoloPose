import React from "react";
import { Sparkles, Layers, BarChart3, ShieldCheck, Box, Cpu, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";

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
    switch (selectedModelType) {
      case "vitpose":
        return {
          name: "ViTPose-Base",
          fullName: "ViTPose-Base (Transformer)",
          file: "usyd-community/vitpose-base-simple",
          badge: "ViT-B",
          color: "text-purple-400",
          border: "border-purple-500/30 bg-purple-500/10",
        };
      case "rtmpose":
        return {
          name: "RTMPose-m",
          fullName: "RTMPose-m (OpenMMLab)",
          file: "rtmpose-m_simcc-body7.onnx",
          badge: "SimCC SOTA",
          color: "text-cyan-400",
          border: "border-cyan-500/30 bg-cyan-500/10",
        };
      default:
        return {
          name: "YOLO 26 Pose",
          fullName: "YOLO 26 Pose Engine",
          file: "yolo26-pose.pt",
          badge: "COCO-17",
          color: "text-emerald-400",
          border: "border-emerald-500/30 bg-emerald-500/10",
        };
    }
  };

  const modelInfo = getModelDetails();

  return (
    <aside
      className={`relative bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none transition-all duration-300 ease-in-out shrink-0 z-30 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Brand Header */}
      <div>
        <div className={`h-16 flex items-center border-b border-slate-800/80 px-3.5 transition-all ${
          isCollapsed ? "justify-center" : "justify-between"
        }`}>
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Box className="w-5 h-5 text-white" />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="font-bold text-slate-100 tracking-tight text-base leading-none truncate">
                  PoseFlow <span className="text-cyan-400 text-xs uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 ml-1">AI</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 truncate">Multi-Model Pose Studio</div>
              </div>
            )}
          </div>

          {/* Nút đóng/mở sidebar nằm gọn gàng trên thanh header sidebar */}
          <button
            onClick={onToggleSidebar}
            className={`p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors cursor-pointer shrink-0 ${
              isCollapsed ? "hidden" : "block"
            }`}
            title="Thu gọn sidebar (Ctrl+B)"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Nút mở rộng khi sidebar đang thu gọn */}
        {isCollapsed && (
          <div className="p-2 flex justify-center border-b border-slate-800/40">
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-cyan-300 border border-slate-700/60 transition-all cursor-pointer"
              title="Mở rộng sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
            </button>
          </div>
        )}



        {/* Navigation Items */}
        <div className="p-3 space-y-1.5">
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Menu Chính
            </div>
          )}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div key={item.id} className="relative group">
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center rounded-xl transition-all cursor-pointer ${
                    isCollapsed ? "justify-center p-3" : "space-x-3 px-3.5 py-2.5 text-left"
                  } ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/5 text-cyan-400 border border-cyan-500/30 shadow-sm"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-slate-200"}`} />
                  {!isCollapsed && (
                    <div className="min-w-0">
                      <div className={`text-xs font-semibold leading-none truncate ${isActive ? "text-cyan-300" : "text-slate-300"}`}>
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 leading-tight truncate">{item.desc}</div>
                    </div>
                  )}
                </button>

                {/* Floating Tooltip in collapsed mode */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 hidden group-hover:flex flex-col z-50 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 shadow-2xl whitespace-nowrap pointer-events-none animate-fadeIn">
                    <span className="text-xs font-bold text-slate-100">{item.label}</span>
                    <span className="text-[10px] text-slate-400">{item.desc}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Model Spec Card at bottom */}
      <div className="p-2.5 m-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80">
        {isCollapsed ? (
          <div
            className="flex flex-col items-center justify-center p-1.5 cursor-pointer"
            title={`Active: ${modelInfo.fullName} (${modelInfo.file})`}
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className={`text-[9px] font-mono mt-1 px-1 py-0.5 rounded font-bold ${modelInfo.border} ${modelInfo.color}`}>
              {modelInfo.badge}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span className="flex items-center space-x-1 font-medium text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active Model</span>
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border font-mono font-semibold ${modelInfo.border} ${modelInfo.color}`}>
                {modelInfo.badge}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate">{modelInfo.name}</div>
            <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">{modelInfo.file}</div>
            <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
              <span>Trạng thái:</span>
              <span className="text-cyan-400 font-medium text-[10px]">Sẵn sàng</span>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
