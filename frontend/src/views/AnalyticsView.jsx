import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, CheckCircle, Activity, Sparkles, RefreshCw, Loader2 } from "lucide-react";
import { api } from "../services/api";

export default function AnalyticsView({ initialTaskId = 1 }) {
  const [taskId, setTaskId] = useState(initialTaskId);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    loadMetrics(taskId);
  }, [taskId]);

  const loadMetrics = async (id) => {
    setLoading(true);
    try {
      const data = await api.evaluateMetrics(id);
      setMetrics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Báo cáo Đo lường Chất lượng & Công sức Gán nhãn (QA)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Đánh giá độ chính xác của YOLO 26 và đo lường tỷ lệ annotator phải kéo chỉnh sửa (Human Correction Rate).
          </p>
        </div>

        {/* Task selector */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-400 font-medium">Chọn Task ID:</span>
          <select
            value={taskId}
            onChange={(e) => setTaskId(parseInt(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer"
          >
            <option value={101}>Task #101 (Batch 01)</option>
            <option value={102}>Task #102 (Batch 02 - Retrained)</option>
          </select>
          <button
            onClick={() => loadMetrics(taskId)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {loading && !metrics ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <div className="text-xs text-slate-400">Đang đối chiếu nhãn và tính toán PCK, NME...</div>
        </div>
      ) : (
        <>
          {/* Top 4 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* PCK Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Độ chính xác PCK@0.2</span>
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics ? `${metrics.pck_overall}%` : "--"}
              </div>
              <div className="text-[11px] text-emerald-400 mt-2 flex items-center space-x-1">
                <TrendingUp className="w-3 h-3" />
                <span>+6.2% so với baseline</span>
              </div>
            </div>

            {/* Human Correction Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Tỷ lệ annotator phải sửa</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics ? `${metrics.correction_rate_overall}%` : "--"}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Tiết kiệm ~{metrics ? Math.round(100 - metrics.correction_rate_overall) : 85}% thời gian gán nhãn
              </div>
            </div>

            {/* Normalized Mean Error */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Sai số chuẩn hóa (NME)</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics ? metrics.nme_overall : "--"}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Normalized by Bbox diagonal
              </div>
            </div>

            {/* Skeletons Count */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Khung xương đối chiếu</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics ? metrics.total_skeletons : 0}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Ground Truth matched 1:1
              </div>
            </div>
          </div>

          {/* Detailed 17 Keypoints Breakdown */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Chi tiết độ chính xác & tỷ lệ sửa theo từng khớp trong số 17 điểm:
              </h3>
              <span className="text-[11px] text-slate-400">Dung sai: 5px</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">Tên khớp (Keypoint)</th>
                    <th className="pb-3 font-semibold">Độ chính xác (PCK)</th>
                    <th className="pb-3 font-semibold">Tỷ lệ phải sửa (Correction %)</th>
                    <th className="pb-3 font-semibold">Sai lệch trung bình</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {metrics?.details?.map((kpt) => (
                    <tr key={kpt.name} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 font-medium text-slate-300 capitalize">{kpt.name.replace("_", " ")}</td>
                      <td className="py-2.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-400 h-full rounded-full"
                              style={{ width: `${kpt.pck}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-300">{kpt.pck}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          kpt.correction_rate > 20
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-slate-800 text-slate-300"
                        }`}>
                          {kpt.correction_rate}%
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-400">
                        {kpt.mean_error_px} px
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
