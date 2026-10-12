import React from "react";
import { Sparkles, Layers, BarChart3, Database, ShieldCheck, Box } from "lucide-react";

export default function Sidebar({ activeTab, onSelectTab }) {
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
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between select-none">
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-slate-800/80 space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold text-slate-100 tracking-tight text-base leading-none">
              PoseFlow <span className="text-cyan-400 text-xs uppercase px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 ml-1">AI</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">YOLO 26 + CVAT Local</div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Menu Chính
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-start space-x-3 px-3.5 py-3 rounded-xl transition-all text-left ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-500/15 to-blue-500/5 text-cyan-400 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${isActive ? "text-cyan-400" : "text-slate-400"}`} />
                <div>
                  <div className={`text-sm font-medium leading-none ${isActive ? "text-cyan-300" : "text-slate-300"}`}>
                    {item.label}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1 leading-tight">{item.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Spec Card */}
      <div className="p-4 m-3 rounded-xl bg-slate-950/80 border border-slate-800/80">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span className="flex items-center space-x-1 font-medium text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Active Model</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
            COCO-17
          </span>
        </div>
        <div className="text-xs font-semibold text-slate-200">YOLO 26 Pose Engine</div>
        <div className="text-[11px] text-slate-400 truncate mt-0.5">yolo26-pose.pt</div>
        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Active Learning:</span>
          <span className="text-cyan-400 font-medium">Enabled</span>
        </div>
      </div>
    </aside>
  );
}
