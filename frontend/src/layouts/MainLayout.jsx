import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({
  activeTab,
  onSelectTab,
  health,
  onRefreshHealth,
  isRefreshing,
  selectedModelType = "yolo",
  availableModels = [],
  onSelectModelType,
  onOpenCVATConfig,
  children,
}) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("poseflow_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("poseflow_sidebar_collapsed", String(next));
      } catch {}
      return next;
    });
  };

  // Hỗ trợ phím tắt Ctrl + B hoặc Cmd + B để đóng/mở sidebar nhanh
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B")) {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans antialiased">
      {/* Sidebar cố định bên trái (Hỗ trợ đóng/mở thu gọn) */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        selectedModelType={selectedModelType}
        availableModels={availableModels}
        isCollapsed={isSidebarCollapsed}
        onToggleSidebar={toggleSidebar}
      />

      {/* Vùng làm việc chính */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          health={health}
          onRefreshHealth={onRefreshHealth}
          isRefreshing={isRefreshing}
          selectedModelType={selectedModelType}
          availableModels={availableModels}
          onSelectModelType={onSelectModelType}
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleSidebar={toggleSidebar}
          onOpenCVATConfig={onOpenCVATConfig}
        />

        <main className="flex-1 overflow-y-auto p-4 lg:p-6 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
