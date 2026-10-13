import React from "react";
import { Server, Cpu, Layers, RefreshCw, PanelLeftOpen, PanelLeftClose } from "lucide-react";

export default function Header({
  health,
  onRefreshHealth,
  isRefreshing,
  selectedModelType = "yolo",
  isSidebarCollapsed = false,
  onToggleSidebar,
}) {
  const isBackendOnline = health?.backend === "online";
  const isCvatOnline = health?.cvat_local?.online;

  const getModelLabel = () => {
    switch (selectedModelType) {
      case "vitpose":
        return { name: "ViTPose-Base", color: "text-purple-400" };
      case "rtmpose":
        return { name: "RTMPose-m", color: "text-cyan-400" };
      default:
        return { name: "YOLO 26 Pose", color: "text-emerald-400" };
    }
  };

  const modelLabel = getModelLabel();

  return (
    <header className="h-16 bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Title / Breadcrumb + Sidebar Toggle Button */}
      <div className="flex items-center space-x-3">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 border border-slate-700/60 transition-all cursor-pointer shadow-sm"
            title={isSidebarCollapsed ? "Mở rộng sidebar (Ctrl+B)" : "Thu gọn sidebar (Ctrl+B)"}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        )}

        <div className="flex items-center space-x-2 text-sm text-slate-400">
          <span className="text-slate-200 font-semibold tracking-wide">PosePreLabel Studio</span>
          <span>/</span>
          <span className="text-cyan-400 font-medium">Multi-Model AI Engine</span>
        </div>
      </div>



      {/* Live System Status Badges */}
      <div className="flex items-center space-x-3">
        {/* Backend Status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <Server className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-300">FastAPI</span>
          <span className={`w-2 h-2 rounded-full ${isBackendOnline ? "bg-emerald-400 animate-pulse" : "bg-rose-500"}`} />
          <span className={isBackendOnline ? "text-emerald-400 font-medium" : "text-rose-400"}>
            {isBackendOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Model Status (Dynamic) */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-300">Model:</span>
          <span className={`font-semibold font-mono ${modelLabel.color}`}>
            {modelLabel.name}
          </span>
        </div>

        {/* CVAT Local Status */}
        <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <Layers className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-300">CVAT Local</span>
          <span className={`w-2 h-2 rounded-full ${isCvatOnline ? "bg-emerald-400" : "bg-amber-400"}`} />
          <span className={isCvatOnline ? "text-emerald-400 font-medium" : "text-amber-400"}>
            {isCvatOnline ? "Connected (8080)" : "Standby"}
          </span>
        </div>

        {/* Refresh button */}
        <button
          onClick={onRefreshHealth}
          disabled={isRefreshing}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
          title="Làm mới trạng thái kết nối"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
        </button>
      </div>
    </header>
  );
}
