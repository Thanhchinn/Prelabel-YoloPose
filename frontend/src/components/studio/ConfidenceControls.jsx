import React from "react";
import { Sliders, Zap, Play, Loader2 } from "lucide-react";

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
}) {
  const isAnyPredicting = isPredictingSingle || isPredictingAll;
  const cleanModelName = (activeModelName || "AI Pose").replace(/\s*\(.*?\)/g, "").trim();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ngưỡng tin cậy (Confidence)</span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">Bbox / Keypoints</span>
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span>Bbox Conf:</span>
          <span className="text-cyan-400 font-mono font-medium">{confThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={confThreshold}
          onChange={(e) => onChangeConfThreshold(parseFloat(e.target.value))}
          className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
        />
      </div>

      <div>
        <div className="flex justify-between text-[11px] text-slate-400 mb-1">
          <span>Keypoint Conf:</span>
          <span className="text-cyan-400 font-mono font-medium">{kptConfThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={kptConfThreshold}
          onChange={(e) => onChangeKptConfThreshold(parseFloat(e.target.value))}
          className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
        />
      </div>

      {/* Action Buttons: 1-Click Single Image OR Full Batch */}
      <div className="pt-1.5 space-y-2">
        {/* Nút 1: Chạy ngay trên ảnh hiện tại (~35ms siêu nhanh) */}
        <button
          onClick={onRunPredictSingle}
          disabled={isAnyPredicting || !hasSelectedImage}
          className="w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/25 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99] whitespace-nowrap"
          title={`Chạy ngay mô hình ${cleanModelName} trên bức ảnh đang xem (~35ms)`}
        >
          {isPredictingSingle ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="truncate">Đang phân tích ảnh này...</span>
            </>
          ) : (
            <>
              <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
              <span className="truncate">Chạy ảnh này ({cleanModelName})</span>
            </>
          )}
        </button>


        {/* Nút 2: Chạy hàng loạt trên toàn bộ album */}
        <button
          onClick={onRunPredictAll}
          disabled={isAnyPredicting || !hasImages}
          className="w-full py-1.5 px-3 rounded-xl font-medium text-[11px] flex items-center justify-center space-x-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/70 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
          title={`Chạy suy luận ${activeModelName} trên toàn bộ ${imagesCount} ảnh`}
        >
          {isPredictingAll ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
              <span className="truncate">Đang chạy hàng loạt ({imagesCount} ảnh)...</span>
            </>
          ) : (
            <>
              <Play className="w-3 h-3 text-cyan-400 shrink-0" />
              <span className="truncate">Chạy toàn bộ {imagesCount > 0 ? `${imagesCount} ảnh` : ""}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

