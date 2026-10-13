import React from "react";
import { RefreshCw, Loader2 } from "lucide-react";

export default function CVATSyncCard({
  cvatTasks = [],
  selectedCvatTaskId,
  onSelectTaskId,
  onPullFromCVAT,
  isPulling,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isPulling ? "animate-spin" : ""}`} />
          <span>Đồng bộ nhãn từ CVAT</span>
        </div>
        <span className="text-[10px] text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
          2-Way Sync
        </span>
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        Kéo tọa độ khớp và cờ <span className="text-amber-300 font-semibold">Occluded (nét đứt)</span> đã sửa trên CVAT về Web.
      </p>

      <div className="space-y-2 pt-0.5">
        {cvatTasks.length > 0 ? (
          <select
            value={selectedCvatTaskId}
            onChange={(e) => onSelectTaskId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none cursor-pointer focus:border-cyan-500/60"
          >
            {cvatTasks.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} — {t.name} ({t.size || "?"} ảnh)
              </option>
            ))}
          </select>
        ) : (
          <div className="text-[11px] text-slate-500 bg-slate-950/60 border border-slate-700/50 rounded-xl px-3 py-2.5 text-center">
            Chưa có task nào từ Studio. Hãy tạo task tại trang <span className="text-cyan-400">CVAT Task Hub</span> trước.
          </div>
        )}

        <button
          onClick={onPullFromCVAT}
          disabled={isPulling || !selectedCvatTaskId}
          className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-amber-500/25 to-amber-600/20 hover:from-amber-500/35 hover:to-amber-600/30 text-amber-300 border border-amber-500/40 flex items-center justify-center space-x-2 transition-all disabled:opacity-40 cursor-pointer shadow-sm active:scale-[0.99]"
          title="Kéo nhãn đã sửa trên CVAT về Web Studio"
        >
          {isPulling ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
              <span>Đang kéo nhãn từ CVAT...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-amber-300" />
              <span>Kéo nhãn đã sửa từ CVAT về Web</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
