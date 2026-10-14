import React from "react";
import { Sliders, Zap, Play } from "lucide-react";
import { Button } from "../ui";

export default function ConfidenceControls({
  confThreshold,
  onChangeConfThreshold,
  kptConfThreshold,
  onChangeKptConfThreshold,
  onRunPredictSingle,
  onRunPredictAll,
  isPredictingSingle = false,
  isPredictingAll = false,
  hasImages = false,
  hasSelectedImage = false,
  imagesCount = 0,
  activeModelName = "AI Pose",
  kptStats = { visible: 0, total: 17 },
  bboxStats = { visible: 0, total: 0 },
}) {
  const isAnyPredicting = isPredictingSingle || isPredictingAll;
  const cleanModelName = (activeModelName || "AI Pose").replace(/\s*\(.*?\)/g, "").trim();

  const visibleKpts = kptStats?.visible ?? 0;
  const totalKpts = kptStats?.total ?? 17;
  const visibleBboxes = bboxStats?.visible ?? 0;
  const totalBboxes = bboxStats?.total ?? 0;

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-1.5 text-xs font-medium text-zinc-200">
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Ngưỡng tin cậy (Confidence)</span>
        </div>
        <span className="text-[10px] text-zinc-500 font-mono">Bbox / Keypoints</span>
      </div>

      {/* Slider 1: Bbox Conf */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-medium">Bbox Conf:</span>
            {hasSelectedImage && totalBboxes > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/80 text-zinc-300 border border-zinc-750">
                {visibleBboxes}/{totalBboxes} đối tượng
              </span>
            )}
          </div>
          <span className="text-zinc-200 font-mono font-medium text-[11px] tabular-nums">
            {confThreshold.toFixed(2)}{" "}
            <span className="text-zinc-500 text-[10px]">({Math.round(confThreshold * 100)}%)</span>
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.95"
          step="0.05"
          value={confThreshold}
          onChange={(e) => onChangeConfThreshold(parseFloat(e.target.value))}
          className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-750 transition-colors"
        />
      </div>

      {/* Slider 2: Keypoint Conf */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <div className="flex items-center space-x-1.5">
            <span className="text-zinc-400 font-medium">Keypoint Conf:</span>
            {hasSelectedImage && (
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded border font-medium ${
                  visibleKpts >= 12
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : visibleKpts >= 8
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                }`}
              >
                {visibleKpts}/{totalKpts} khớp hiển thị
              </span>
            )}
          </div>
          <span className="text-zinc-200 font-mono font-medium text-[11px] tabular-nums">
            {kptConfThreshold.toFixed(2)}{" "}
            <span className="text-zinc-500 text-[10px]">({Math.round(kptConfThreshold * 100)}%)</span>
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.95"
          step="0.05"
          value={kptConfThreshold}
          onChange={(e) => onChangeKptConfThreshold(parseFloat(e.target.value))}
          className="w-full accent-zinc-200 cursor-pointer h-1.5 bg-zinc-800 rounded-lg hover:bg-zinc-750 transition-colors"
        />
      </div>

      {/* Action Buttons */}
      <div className="pt-1 space-y-1.5">
        {/* Nút 1: Chạy ngay trên ảnh hiện tại (Primary) */}
        <Button
          variant="primary"
          size="md"
          onClick={onRunPredictSingle}
          disabled={isAnyPredicting || !hasSelectedImage}
          isLoading={isPredictingSingle}
          loadingText="Đang phân tích ảnh này..."
          icon={Zap}
          className="w-full text-xs font-medium whitespace-nowrap"
          title={`Chạy ngay mô hình ${cleanModelName} trên bức ảnh đang xem`}
        >
          <span className="truncate">Chạy ảnh này ({cleanModelName})</span>
        </Button>

        {/* Nút 2: Chạy hàng loạt trên toàn bộ album (Secondary) */}
        <Button
          variant="secondary"
          size="sm"
          onClick={onRunPredictAll}
          disabled={isAnyPredicting || !hasImages}
          isLoading={isPredictingAll}
          loadingText={`Đang chạy hàng loạt (${imagesCount} ảnh)...`}
          icon={Play}
          className="w-full text-[11px] whitespace-nowrap"
          title={`Chạy suy luận ${activeModelName} trên toàn bộ ${imagesCount} ảnh`}
        >
          <span className="truncate">Chạy tất cả ({imagesCount} ảnh)</span>
        </Button>
      </div>
    </div>
  );
}
