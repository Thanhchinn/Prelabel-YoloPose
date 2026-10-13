import React from "react";
import { Cpu, Zap, Trophy, ShieldCheck, Check } from "lucide-react";

export default function ModelSelector({
  availableModels = [],
  selectedModelType = "yolo",
  onSelectModelType,
  disabled = false,
}) {
  const getModelIcon = (id) => {
    switch (id) {
      case "vitpose":
        return <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />;
      case "rtmpose":
        return <Trophy className="w-4 h-4 text-cyan-400 shrink-0" />;
      default:
        return <Zap className="w-4 h-4 text-emerald-400 shrink-0" />;
    }
  };

  const getBadgeStyle = (id, isSelected) => {
    switch (id) {
      case "vitpose":
        return isSelected
          ? "bg-purple-500/20 text-purple-200 border-purple-500/40"
          : "bg-purple-500/10 text-purple-300 border-purple-500/20";
      case "rtmpose":
        return isSelected
          ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40"
          : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20";
      default:
        return isSelected
          ? "bg-emerald-500/20 text-emerald-200 border-emerald-500/40"
          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/20";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
          <span>Mô hình AI Pose (Architecture)</span>
        </div>
        <span className="text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-full font-mono font-medium">
          {availableModels.length} Models Sẵn Sàng
        </span>
      </div>

      {/* 3 Model Options */}
      <div className="space-y-1.5">
        {availableModels.map((m) => {
          const isSelected = selectedModelType === m.id;
          return (
            <div
              key={m.id}
              onClick={() => !disabled && onSelectModelType(m.id)}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? "bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/60 border-cyan-500/60 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/30"
                  : "bg-slate-950/50 border-slate-800/80 hover:bg-slate-800/40 hover:border-slate-700/80 text-slate-300"
              } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
            >
              {/* Top Row: Icon + Name + mAP score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 min-w-0">
                  {getModelIcon(m.id)}
                  <span
                    className={`text-xs font-semibold truncate ${
                      isSelected ? "text-cyan-200" : "text-slate-200 group-hover:text-slate-100"
                    }`}
                  >
                    {m.name}
                  </span>
                </div>

                <div className="flex items-center space-x-1.5 shrink-0 ml-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono font-semibold bg-slate-800/90 text-cyan-300 border border-slate-700/60">
                    {m.ap_score}
                  </span>
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-cyan-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Row: Speed & Tag Badge */}
              <div className="flex items-center justify-between mt-1.5 text-[11px] text-slate-400 pl-6">
                <span className="font-mono text-[10px] text-slate-300/90">{m.speed}</span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${getBadgeStyle(
                    m.id,
                    isSelected
                  )}`}
                >
                  {m.badge}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
