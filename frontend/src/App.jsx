import React, { useState, useEffect } from "react";
import MainLayout from "./layouts/MainLayout";
import StudioView from "./views/StudioView";
import CVATSyncView from "./views/CVATSyncView";
import AnalyticsView from "./views/AnalyticsView";
import ModelBenchmarkView from "./views/ModelBenchmarkView";
import RetrainView from "./views/RetrainView";
import CVATConfigModal from "./components/common/CVATConfigModal";
import { api } from "./services/api";
import { ToastProvider } from "./context/ToastContext";

export default function App() {
  const [activeTab, setActiveTab] = useState("studio");
  const [health, setHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState(null);
  const [isCVATConfigOpen, setIsCVATConfigOpen] = useState(false);

  // Task ID to view in Studio (when clicking "Xem Web" from CVAT Hub)
  const [viewTaskId, setViewTaskId] = useState(null);

  // Global Active AI Model state
  const [selectedModelType, setSelectedModelType] = useState("yolo");
  const [availableModels, setAvailableModels] = useState([
    {
      id: "yolo",
      name: "YOLO 26 Pose",
      family: "YOLO",
      speed: "⚡ ~15-30ms",
      ap_score: "70-74 mAP",
      badge: "Real-time Fast",
      description: "Mô hình YOLO Pose mặc định tối ưu thời gian thực, rất nhanh cho pre-label hàng loạt.",
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
      description: "Mô hình Vision Transformer cho độ chuẩn xác cao nhất, xử lý tốt tư thế khó & che khuất.",
    },
  ]);

  useEffect(() => {
    fetchHealth();
    fetchModels();
    // Tự động kiểm tra sức khỏe mỗi 20 giây
    const interval = setInterval(fetchHealth, 20000);
    return () => clearInterval(interval);
  }, []);

  const fetchModels = async () => {
    try {
      const data = await api.getModels();
      if (Array.isArray(data) && data.length > 0) {
        setAvailableModels(data);
      }
    } catch (err) {
      console.warn("Could not fetch models:", err);
    }
  };

  const fetchHealth = async () => {
    setIsRefreshing(true);
    try {
      const data = await api.getHealth();
      setHealth(data);
    } catch (err) {
      setHealth({
        backend: "offline",
        yolo26_model: { loaded: false, mode: "Offline" },
        cvat_local: { online: false },
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleEvaluateTask = (taskId) => {
    setTargetTaskId(taskId);
    setActiveTab("analytics");
  };

  const handleViewTask = (taskId) => {
    setViewTaskId(taskId);
    setActiveTab("studio");
  };

  return (
    <ToastProvider>
      <MainLayout
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        health={health}
        onRefreshHealth={fetchHealth}
        isRefreshing={isRefreshing}
        selectedModelType={selectedModelType}
        availableModels={availableModels}
        onSelectModelType={setSelectedModelType}
        onOpenCVATConfig={() => setIsCVATConfigOpen(true)}
      >
        {activeTab === "studio" && (
          <StudioView
            onNavigateToCVAT={() => setActiveTab("cvat")}
            viewTaskId={viewTaskId}
            onClearViewTask={() => setViewTaskId(null)}
            selectedModelType={selectedModelType}
            onSelectModelType={setSelectedModelType}
            availableModels={availableModels}
          />
        )}
        {activeTab === "cvat" && (
          <CVATSyncView
            onEvaluateTask={handleEvaluateTask}
            onViewTask={handleViewTask}
            selectedModelType={selectedModelType}
            onSelectModelType={setSelectedModelType}
            availableModels={availableModels}
            health={health}
            onOpenCVATConfig={() => setIsCVATConfigOpen(true)}
          />
        )}
        {activeTab === "retrain" && (
          <RetrainView
            selectedModelType={selectedModelType}
            onSelectModelType={setSelectedModelType}
            onNavigateToStudio={() => setActiveTab("studio")}
            onRefreshModels={fetchModels}
          />
        )}
        {activeTab === "analytics" && (
          <AnalyticsView
            initialTaskId={targetTaskId}
            onClearTargetTask={() => setTargetTaskId(null)}
            selectedModelType={selectedModelType}
            availableModels={availableModels}
            onNavigateToCVAT={() => setActiveTab("cvat")}
          />
        )}
        {activeTab === "benchmark" && (
          <ModelBenchmarkView
            onNavigateToStudio={() => setActiveTab("studio")}
            selectedModelType={selectedModelType}
            onSelectModelType={setSelectedModelType}
          />
        )}

        {/* CVAT Settings Modal */}
        <CVATConfigModal
          isOpen={isCVATConfigOpen}
          onClose={() => setIsCVATConfigOpen(false)}
          onConfigSaved={fetchHealth}
        />
      </MainLayout>
    </ToastProvider>
  );
}
