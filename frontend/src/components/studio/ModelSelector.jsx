import React from "react";
import { Cpu, Zap, Trophy, ShieldCheck } from "lucide-react";

export default function ModelSelector({
  availableModels = [],
  selectedModelType = "yolo",
  onSelectModelType,
  disabled = false,
}) {
  const getModelIcon = (id) => {
    switch (id) {
      case "vitpose":
        return <ShieldCheck className="w-3.5 h-3.5 text-zinc-300 shrink-0" />;
      case "rtmpose":
        return <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />;
      default:
        return <Zap className="w-3.5 h-3.5 text-sky-300 shrink-0" />;
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 shadow-xs space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200">
          <Cpu className="w-3.5 h-3.5 text-zinc-400" />
          <span>Mô hình AI Pose</span>
        </div>
        <span className="text-[10px] text-zinc-400 bg-zinc-850 border border-zinc-750 px-1.5 py-0.2 rounded-full font-mono font-medium">
          {availableModels.length} Models
        </span>
      </div>

      {/* Compact Radio Cards */}
      <div className="space-y-1.5">
        {availableModels.map((m) => {
          const isSelected = selectedModelType === m.id;
          const cleanName = m.name.split("(")[0].trim();
          const cleanSpeed = m.speed.replace(/^[⚡🚀🧠]\s*/, "");

          return (
            <div
              key={m.id}
              onClick={() => !disabled && onSelectModelType(m.id)}
              className={`px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer relative flex items-center justify-between select-none ${
                isSelected
                  ? "bg-zinc-900/90 border-zinc-600 text-zinc-100 shadow-xs before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-4.5 before:bg-white before:rounded-r"
                  : "bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900/40 hover:border-zinc-700/80 text-zinc-400"
              } ${disabled ? "opacity-60 pointer-events-none" : ""}`}
            >
              {/* Left: Icon + Title & Speed in tight hierarchy */}
              <div className="flex items-center space-x-2 min-w-0">
                <div
                  className={`p-1 rounded shrink-0 ${
                    isSelected ? "bg-zinc-800 text-zinc-100" : "bg-zinc-900 text-zinc-500"
                  }`}
                >
                  {getModelIcon(m.id)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center space-x-1.5 truncate">
                    <span
                      className={`text-xs font-medium truncate leading-tight ${
                        isSelected ? "text-zinc-100 font-semibold" : "text-zinc-300"
                      }`}
                    >
                      {cleanName}
                    </span>
                    {m.active_version && m.active_version !== "v0_base" && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold shrink-0">
                        {m.active_version}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono truncate leading-none mt-0.5">
                    {cleanSpeed} • {m.version_badge || m.badge}
                  </div>
                </div>
              </div>

              {/* Right: mAP score + Custom Radio Indicator */}
              <div className="flex items-center space-x-2 shrink-0 ml-2">
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-zinc-850 text-zinc-300 border border-zinc-750/70">
                  {m.ap_score ? m.ap_score.split(" ")[0] : "mAP"}
                </span>
                <div
                  className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors ${
                    isSelected
                      ? "border-white bg-white text-zinc-950"
                      : "border-zinc-700 bg-zinc-900"
                  }`}
                >
                  {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
