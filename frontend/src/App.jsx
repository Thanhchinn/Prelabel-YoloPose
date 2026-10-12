import React, { useState, useEffect } from "react";
import MainLayout from "./layouts/MainLayout";
import StudioView from "./views/StudioView";
import CVATSyncView from "./views/CVATSyncView";
import AnalyticsView from "./views/AnalyticsView";
import { api } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState("studio");
  const [health, setHealth] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [targetTaskId, setTargetTaskId] = useState(101);

  // Task ID to view in Studio (when clicking "Xem Web" from CVAT Hub)
  const [viewTaskId, setViewTaskId] = useState(null);

  useEffect(() => {
    fetchHealth();
    // Tự động kiểm tra sức khỏe mỗi 20 giây
    const interval = setInterval(fetchHealth, 20000);
    return () => clearInterval(interval);
  }, []);

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
    // Chuyển sang Studio view và truyền task ID để pull + xem
    setViewTaskId(taskId);
    setActiveTab("studio");
  };

  return (
    <MainLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      health={health}
      onRefreshHealth={fetchHealth}
      isRefreshing={isRefreshing}
    >
      {activeTab === "studio" && (
        <StudioView
          onNavigateToCVAT={() => setActiveTab("cvat")}
          viewTaskId={viewTaskId}
          onClearViewTask={() => setViewTaskId(null)}
        />
      )}
      {activeTab === "cvat" && (
        <CVATSyncView
          onEvaluateTask={handleEvaluateTask}
          onViewTask={handleViewTask}
        />
      )}
      {activeTab === "analytics" && (
        <AnalyticsView initialTaskId={targetTaskId} />
      )}
    </MainLayout>
  );
}
