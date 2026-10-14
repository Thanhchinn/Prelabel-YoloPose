import React, { useState, useEffect, useRef } from "react";
import {
  Server,
  Cpu,
  Layers,
  RefreshCw,
  PanelLeftOpen,
  Settings,
  FolderGit2,
  ChevronDown,
  Check,
  HelpCircle,
  Keyboard,
  X,
  Zap,
} from "lucide-react";
import { toast } from "../components/ui";

const DEFAULT_MODELS = [
  {
    id: "yolo",
    name: "YOLO 26 Pose",
    family: "YOLO",
    speed: "⚡ ~15-30ms",
    ap_score: "70-74 mAP",
    badge: "Real-time Fast",
    description: "Mô hình YOLO Pose tối ưu thời gian thực, rất nhanh cho pre-label hàng loạt.",
  },
  {
    id: "rtmpose",
    name: "RTMPose-m (OpenMMLab)",
    family: "RTMPose",
    speed: "🚀 ~35-65ms",
    ap_score: "75.8 mAP",
    badge: "Balanced SOTA",
    description: "Mô hình MMPose cân bằng hoàn hảo giữa tốc độ và độ chuẩn xác.",
  },
  {
    id: "vitpose",
    name: "ViTPose-Base (Transformer)",
    family: "ViTPose",
    speed: "🧠 ~120-250ms",
    ap_score: "77.4+ mAP",
    badge: "High Precision",
    description: "Mô hình Vision Transformer cho độ chuẩn xác cao nhất, xử lý tốt tư thế khó.",
  },
];

export default function Header({
  health,
  onRefreshHealth,
  isRefreshing,
  selectedModelType = "yolo",
  availableModels = [],
  onSelectModelType,
  isSidebarCollapsed = false,
  onToggleSidebar,
  onOpenCVATConfig,
}) {
  const isBackendOnline = health?.backend === "online";
  const cvatInfo = health?.cvat_local;
  const isCvatOnline = cvatInfo?.online;
  const isCvatAuth = cvatInfo?.authenticated;
  const cvatUser = cvatInfo?.username;

  // Interactive telemetry popover states
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [showFastApiPopover, setShowFastApiPopover] = useState(false);
  const [showCvatPopover, setShowCvatPopover] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);

  const modelDropdownRef = useRef(null);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Lắng nghe phím tắt toàn cục: '?' hoặc 'Ctrl+K' / 'Cmd+K' để mở Shortcuts Cheat Sheet
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName) || e.target?.isContentEditable) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsShortcutsModalOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setIsModelDropdownOpen(false);
        setIsShortcutsModalOpen(false);
        setShowFastApiPopover(false);
        setShowCvatPopover(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const modelsList = availableModels && availableModels.length > 0 ? availableModels : DEFAULT_MODELS;

  const currentModel =
    modelsList.find((m) => m.id === selectedModelType) ||
    modelsList[0] || {
      name: "YOLO 26 Pose",
      badge: "Real-time Fast",
    };

  const handleSelectModel = (modelId) => {
    if (onSelectModelType) {
      onSelectModelType(modelId);
      const chosen = modelsList.find((m) => m.id === modelId);
      toast.success("Đã chuyển mô hình AI", {
        description: `Mô hình ${chosen?.name || modelId} hiện là active model cho toàn hệ thống.`,
        metadata: [{ label: "Active Model", value: chosen?.name?.split("(")[0].trim() || modelId }],
      });
    }
    setIsModelDropdownOpen(false);
  };

  return (
    <>
      <header className="h-14 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Title / Breadcrumb (Only show expand button when sidebar is collapsed) */}
        <div className="flex items-center space-x-2.5">
          {isSidebarCollapsed && onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-800/80 transition-colors cursor-pointer mr-1"
              title="Mở rộng sidebar (Ctrl+B)"
            >
              <PanelLeftOpen className="w-4 h-4 text-zinc-300" />
            </button>
          )}

          <div className="flex items-center space-x-2 text-xs">
            <FolderGit2 className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-200 font-semibold tracking-tight">PoseFlow Studio</span>
            <span className="text-zinc-700">/</span>
            <span className="text-zinc-400 font-medium">Multi-Model AI Engine</span>
          </div>
        </div>

        {/* Live Interactive Telemetry Badges */}
        <div className="flex items-center space-x-2 sm:space-x-2.5">
          {/* 1. FastAPI Online Telemetry Badge (Hover Popover) */}
          <div
            className="relative"
            onMouseEnter={() => setShowFastApiPopover(true)}
            onMouseLeave={() => setShowFastApiPopover(false)}
          >
            <div className="flex items-center space-x-2 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800/80 text-xs hover:border-zinc-700 transition-colors cursor-help">
              <Server className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 hidden sm:inline">FastAPI</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isBackendOnline ? "bg-emerald-500 ring-2 ring-emerald-500/20" : "bg-rose-500"
                }`}
              />
              <span className={`text-[11px] font-medium ${isBackendOnline ? "text-zinc-300" : "text-rose-400"}`}>
                {isBackendOnline ? "Online" : "Offline"}
              </span>
            </div>

            {/* FastAPI Hover Telemetry Popover */}
            {showFastApiPopover && (
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-3 z-50 text-left animate-in fade-in zoom-in-95 pointer-events-auto">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Server className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-xs font-semibold text-zinc-200">FastAPI Backend</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                      isBackendOnline
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {isBackendOnline ? "200 OK • Healthy" : "Offline"}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Endpoint:</span>
                    <span className="text-zinc-300">http://localhost:8000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Khung Pose:</span>
                    <span className="text-zinc-300">17 Keypoints (COCO)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Engine:</span>
                    <span className="text-zinc-300">{health?.yolo26_model?.mode || "Live Detection"}</span>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-850 flex items-center justify-between">
                  <span className="text-[10px] text-zinc-500">Độ trễ: ~10-18ms</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshHealth && onRefreshHealth();
                    }}
                    disabled={isRefreshing}
                    className="text-[11px] text-zinc-300 hover:text-white flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>Ping kiểm tra</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Global Model Telemetry Dropdown Badge */}
          <div className="relative" ref={modelDropdownRef}>
            <button
              type="button"
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border text-xs transition-all cursor-pointer ${
                isModelDropdownOpen
                  ? "bg-zinc-850 border-zinc-600 text-zinc-100 shadow-xs ring-1 ring-zinc-500/30"
                  : "bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300"
              }`}
              title="Click để chuyển đổi mô hình AI đang chạy toàn cục"
            >
              <Cpu className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-400 hidden sm:inline">Model:</span>
              <span className="font-mono text-[11px] font-semibold text-zinc-100 truncate max-w-[150px] flex items-center space-x-1">
                <span>{currentModel.name.replace(/\s*\(.*?\)/g, "").trim()}</span>
                {currentModel.active_version && currentModel.active_version !== "v0_base" && (
                  <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                    {currentModel.active_version}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-zinc-500 transition-transform duration-200 ${
                  isModelDropdownOpen ? "rotate-180 text-zinc-300" : ""
                }`}
              />
            </button>

            {/* Model Selector Dropdown Popover */}
            {isModelDropdownOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-2.5 z-50 text-left animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-850 pb-2 mb-1.5">
                  <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                    Chuyển đổi Active Model toàn cục
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                    3 Models
                  </span>
                </div>

                <div className="space-y-1">
                  {modelsList.map((model) => {
                    const isSelected = model.id === selectedModelType;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        onClick={() => handleSelectModel(model.id)}
                        className={`w-full group flex items-start space-x-2.5 p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          isSelected
                            ? "bg-zinc-900 border-zinc-600 shadow-xs"
                            : "bg-zinc-950 border-zinc-850/80 hover:bg-zinc-900/60 hover:border-zinc-700"
                        }`}
                      >
                        <div className="pt-0.5">
                          <span
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected
                                ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                                : "border-zinc-700 bg-zinc-900"
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 truncate">
                              <span
                                className={`text-xs font-semibold truncate ${
                                  isSelected ? "text-zinc-100" : "text-zinc-300 group-hover:text-zinc-100"
                                }`}
                              >
                                {model.name}
                              </span>
                              {model.active_version && model.active_version !== "v0_base" && (
                                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold shrink-0">
                                  {model.active_version}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-zinc-500 shrink-0 ml-1">
                              {model.speed?.split(" ")[1] || model.speed}
                            </span>
                          </div>
                          <p className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                            {model.version_badge || model.badge || model.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-850 px-2 flex items-center justify-between text-[10px] text-zinc-500">
                  <span>* Áp dụng ngay cho Studio & CVAT Hub</span>
                  <span className="font-mono">Global Sync</span>
                </div>
              </div>
            )}
          </div>

          {/* 3. CVAT Status Telemetry Badge (Hover Popover + Click Modal) */}
          <div
            className="relative"
            onMouseEnter={() => setShowCvatPopover(true)}
            onMouseLeave={() => setShowCvatPopover(false)}
          >
            <button
              onClick={onOpenCVATConfig}
              className={`flex items-center space-x-2 px-2.5 py-1 rounded-md border text-xs cursor-pointer transition-colors ${
                isCvatOnline && isCvatAuth
                  ? "bg-zinc-900/80 border-zinc-800/80 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-300"
                  : isCvatOnline
                  ? "bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15 text-amber-300"
                  : "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/15 text-rose-300"
              }`}
              title="Click để mở Cấu hình tài khoản CVAT"
            >
              <Layers className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 hidden sm:inline">CVAT:</span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isCvatOnline && isCvatAuth
                    ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                    : isCvatOnline
                    ? "bg-amber-400 ring-2 ring-amber-400/20 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span className="font-mono text-[11px] font-medium truncate max-w-[110px]">
                {isCvatOnline && isCvatAuth
                  ? cvatUser || "Online"
                  : isCvatOnline
                  ? "Chưa đăng nhập"
                  : "Offline"}
              </span>
            </button>

            {/* CVAT Hover Telemetry Popover */}
            {showCvatPopover && (
              <div className="absolute top-full mt-2 right-0 w-72 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-xl p-3 z-50 text-left animate-in fade-in zoom-in-95 pointer-events-auto">
                <div className="flex items-center justify-between border-b border-zinc-850 pb-2 mb-2">
                  <div className="flex items-center space-x-1.5">
                    <Layers className="w-3.5 h-3.5 text-zinc-300" />
                    <span className="text-xs font-semibold text-zinc-200">CVAT Local Server</span>
                  </div>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                      isCvatOnline && isCvatAuth
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : isCvatOnline
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    {isCvatOnline && isCvatAuth ? "Connected" : isCvatOnline ? "Unauthenticated" : "Offline"}
                  </span>
                </div>

                <div className="space-y-1.5 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Máy chủ:</span>
                    <span className="text-zinc-300">{cvatInfo?.host || "http://localhost:8080"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Tài khoản:</span>
                    <span className="text-zinc-300 font-medium">{cvatInfo?.username || "Chưa cấu hình"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Phiên bản:</span>
                    <span className="text-zinc-300">{cvatInfo?.version || "CVAT Local 2.x"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Đồng bộ:</span>
                    <span className="text-emerald-400 font-sans text-[10px]">2-Way Active Learning</span>
                  </div>
                </div>

                <div className="pt-2 mt-2 border-t border-zinc-850 flex items-center justify-between gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenCVATConfig && onOpenCVATConfig();
                    }}
                    className="flex-1 text-[11px] text-zinc-300 hover:text-white flex items-center justify-center space-x-1 px-2 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  >
                    <Settings className="w-3 h-3 text-zinc-400" />
                    <span>Cài đặt CVAT</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRefreshHealth && onRefreshHealth();
                    }}
                    disabled={isRefreshing}
                    className="text-[11px] text-zinc-300 hover:text-white flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                    title="Kiểm tra lại kết nối CVAT"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>Ping</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. Keyboard Shortcuts Cheat Sheet Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="flex items-center space-x-1 px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer shrink-0"
            title="Bảng tra cứu phím tắt toàn hệ thống (Phím tắt: ? hoặc Ctrl+K)"
          >
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
            <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-300 font-medium hidden sm:inline">
              ? / ⌘K
            </kbd>
          </button>

          {/* Refresh Status Button */}
          <button
            onClick={onRefreshHealth}
            disabled={isRefreshing}
            className="p-1.5 rounded-md bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800/80 hover:border-zinc-700 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            title="Làm mới trạng thái kết nối máy chủ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-zinc-200" : ""}`} />
          </button>
        </div>
      </header>

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {isShortcutsModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsShortcutsModalOpen(false)}
        >
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-2xl w-full p-5 sm:p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-200">
                  <Keyboard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100 tracking-tight flex items-center space-x-2">
                    <span>Bảng tra cứu phím tắt (Cheat Sheet)</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      PoseFlow AI
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Thao tác nhanh trên bàn phím cho kiểm định và gán nhãn AI Pose.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <kbd className="font-mono text-[10px] px-1.5 py-0.5 bg-zinc-950 border border-zinc-750 rounded text-zinc-400">
                  ESC
                </kbd>
                <button
                  onClick={() => setIsShortcutsModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Shortcuts Sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Section 1: Studio Canvas & Navigation */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-zinc-200 font-semibold border-b border-zinc-850 pb-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Studio Canvas & Soi ảnh</span>
                </div>
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Soi ảnh gốc (Hold to Peek)</span>
                    <kbd className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-amber-300 font-medium text-[11px]">
                      Space (Giữ)
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Xem ảnh trước</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      ← hoặc A
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Xem ảnh kế tiếp</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      → hoặc D
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Vừa khít khung ảnh (Fit)</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      F
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Di chuyển ảnh (Pan)</span>
                    <span className="text-zinc-400 text-[10px]">Kéo chuột trái (Zoom &gt; 1)</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Layer Visualization Toggles */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center space-x-1.5 text-zinc-200 font-semibold border-b border-zinc-850 pb-1.5">
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>Hiển thị Lớp nhãn AI</span>
                </div>
                <div className="space-y-2 font-mono">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Bật / Tắt Bounding Box</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      B
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Bật / Tắt Khung xương (Bones)</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      S
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Bật / Tắt 17 Điểm khớp (Pts)</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      K
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">Bật / Tắt Nhãn tên khớp</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-750 text-zinc-200 text-[11px]">
                      L
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-400 font-sans">HUD kỹ thuật khi Hover</span>
                    <span className="text-zinc-400 text-[10px]">Rê chuột gần khớp</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 3: System Shortcuts */}
            <div className="bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
              <div className="flex items-center space-x-2 text-zinc-400">
                <span className="font-semibold text-zinc-300">Phím tắt toàn cục:</span>
                <span>
                  <kbd className="font-mono text-[11px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-750 rounded text-zinc-200">
                    Ctrl + B
                  </kbd>{" "}
                  (Đóng/Mở Sidebar)
                </span>
                <span className="text-zinc-600">•</span>
                <span>
                  <kbd className="font-mono text-[11px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-750 rounded text-zinc-200">
                    ?
                  </kbd>{" "}
                  hoặc{" "}
                  <kbd className="font-mono text-[11px] px-1.5 py-0.5 bg-zinc-900 border border-zinc-750 rounded text-zinc-200">
                    Ctrl + K
                  </kbd>{" "}
                  (Mở Cheat Sheet)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsShortcutsModalOpen(false)}
                className="px-3 py-1 rounded-lg bg-zinc-100 text-zinc-950 font-medium hover:bg-white transition-colors cursor-pointer shrink-0"
              >
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
