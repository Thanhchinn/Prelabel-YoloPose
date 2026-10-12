import React from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayout({ activeTab, onSelectTab, health, onRefreshHealth, isRefreshing, children }) {
  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar cố định bên trái */}
      <Sidebar activeTab={activeTab} onSelectTab={onSelectTab} />

      {/* Vùng làm việc chính */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header health={health} onRefreshHealth={onRefreshHealth} isRefreshing={isRefreshing} />
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  );
}
