import React from "react";
import { RefreshCw } from "lucide-react";
import { Button, Select } from "../ui";

export default function CVATSyncCard({
  cvatTasks = [],
  selectedCvatTaskId,
  onSelectTaskId,
  onPullFromCVAT,
  isPulling,
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200">
          <RefreshCw className={`w-3.5 h-3.5 text-zinc-400 ${isPulling ? "animate-spin" : ""}`} />
          <span>Đồng bộ nhãn từ CVAT</span>
        </div>
        <span className="text-[10px] text-zinc-400 bg-zinc-850 border border-zinc-750 px-1.5 py-0.2 rounded font-mono font-medium">
          2-Way Sync
        </span>
      </div>

      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Kéo tọa độ khớp và cờ <span className="text-zinc-200 font-medium">Occluded (nét đứt)</span> đã sửa trên CVAT về Web.
      </p>

      <div className="space-y-2 pt-0.5">
        {cvatTasks.length > 0 ? (
          <Select
            size="sm"
            value={selectedCvatTaskId}
            onChange={(e) => onSelectTaskId(e.target.value)}
          >
            {cvatTasks.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.id} — {t.name} ({t.size || "?"} ảnh)
              </option>
            ))}
          </Select>
        ) : (
          <div className="text-[11px] text-zinc-500 bg-zinc-950/60 border border-zinc-800/60 rounded-lg px-3 py-2 text-center">
            Chưa có task nào từ Studio. Hãy tạo task tại trang <span className="text-zinc-300">CVAT Task Hub</span> trước.
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={onPullFromCVAT}
          disabled={isPulling || !selectedCvatTaskId}
          isLoading={isPulling}
          loadingText="Đang kéo nhãn từ CVAT..."
          icon={RefreshCw}
          className="w-full text-xs font-medium"
          title="Kéo nhãn đã sửa trên CVAT về Web Studio"
        >
          Kéo nhãn đã sửa từ CVAT
        </Button>
      </div>
    </div>
  );
}
