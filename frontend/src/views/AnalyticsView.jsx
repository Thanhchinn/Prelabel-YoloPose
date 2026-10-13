import React, { useState, useEffect } from "react";
import { BarChart3, TrendingUp, TrendingDown, CheckCircle, Activity, Sparkles, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export default function AnalyticsView({
  initialTaskId = 1,
  selectedModelType = "yolo",
  availableModels = [],
}) {
  const [taskId, setTaskId] = useState(initialTaskId);
  const [modelType, setModelType] = useState(selectedModelType);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");

  // Tasks từ CVAT cho dropdown
  const [cvatTasks, setCvatTasks] = useState([]);

  useEffect(() => {
    loadCVATTasks();
  }, []);

  useEffect(() => {
    setTaskId(initialTaskId);
  }, [initialTaskId]);

  useEffect(() => {
    if (selectedModelType) {
      setModelType(selectedModelType);
    }
  }, [selectedModelType]);

  useEffect(() => {
    if (taskId) loadMetrics(taskId, modelType);
  }, [taskId, modelType]);

  const loadCVATTasks = async () => {
    try {
      const res = await api.listCVATTasks();
      if (res && res.tasks) {
        setCvatTasks(res.tasks);
      }
    } catch (err) {
      console.error("Error loading CVAT tasks for analytics:", err);
    }
  };

  const loadMetrics = async (id, mType = modelType) => {
    setLoading(true);
    setError("");
    try {
      const data = await api.evaluateMetrics(id, mType);
      setMetrics(data);
    } catch (err) {
      console.error(err);
      setError("Không thể tính toán metrics cho Task #" + id + ". " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Đánh giá chất lượng PCK
  const getPCKLevel = (pck) => {
    if (pck >= 90) return { text: "Xuất sắc", color: "text-emerald-400" };
    if (pck >= 75) return { text: "Tốt", color: "text-cyan-400" };
    if (pck >= 50) return { text: "Trung bình", color: "text-amber-400" };
    return { text: "Cần cải thiện", color: "text-rose-400" };
  };

  // Bar chart cho keypoint
  const getBarColor = (pck) => {
    if (pck >= 90) return "bg-emerald-400";
    if (pck >= 75) return "bg-cyan-400";
    if (pck >= 50) return "bg-amber-400";
    return "bg-rose-400";
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-cyan-400" />
            <span>Báo cáo Đo lường Chất lượng & Công sức Gán nhãn (QA)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            So sánh dự đoán của <span className="text-cyan-300 font-semibold">{metrics?.model_name || "Mô hình AI"}</span> vs. nhãn Ground Truth trên CVAT → tính PCK, NME, Human Correction Rate.
          </p>
        </div>

        {/* Task & Model Selectors */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400 font-medium">Task:</span>
            {cvatTasks.length > 0 ? (
              <select
                value={taskId}
                onChange={(e) => setTaskId(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-cyan-500"
              >
                {cvatTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} — {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(parseInt(e.target.value) || 1)}
                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 outline-none"
                placeholder="Task ID"
              />
            )}
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-slate-400 font-medium">Model:</span>
            <select
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-cyan-500"
            >
              {(availableModels.length > 0 ? availableModels : [
                { id: "yolo", name: "YOLO 26 Pose" },
                { id: "rtmpose", name: "RTMPose-m (OpenMMLab)" },
                { id: "vitpose", name: "ViTPose-Base (Transformer)" },
              ]).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadMetrics(taskId, modelType)}
            disabled={loading}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer transition-colors"
            title="Làm mới đối chiếu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !metrics ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          <div className="text-xs text-slate-400">Đang đối chiếu nhãn và tính toán PCK, NME...</div>
        </div>
      ) : metrics ? (
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
                {metrics.pck_overall}%
              </div>
              <div className={`text-[11px] mt-2 flex items-center space-x-1 ${getPCKLevel(metrics.pck_overall).color}`}>
                {metrics.pck_overall >= 75 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{getPCKLevel(metrics.pck_overall).text}</span>
              </div>
              {/* Subtle gradient accent */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/60 to-cyan-500/20" />
            </div>

            {/* Human Correction Rate */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Tỷ lệ annotator phải sửa</span>
                <Activity className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics.correction_rate_overall}%
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Tiết kiệm ~{Math.round(100 - metrics.correction_rate_overall)}% thời gian gán nhãn
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500/60 to-orange-500/20" />
            </div>

            {/* Normalized Mean Error */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Sai số chuẩn hóa (NME)</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics.nme_overall}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Normalized by Bbox diagonal {metrics.nme_overall < 0.05 ? "✓ Tốt" : ""}
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/60 to-blue-500/20" />
            </div>

            {/* Skeletons Count */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Khung xương đối chiếu</span>
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="text-2xl font-bold text-slate-100 font-mono">
                {metrics.total_skeletons}
              </div>
              <div className="text-[11px] text-slate-400 mt-2">
                Ground Truth matched 1:1
              </div>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/60 to-violet-500/20" />
            </div>
          </div>

          {/* Visual PCK Bar Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Biểu đồ PCK theo từng khớp (17 Keypoints):
              </h3>
              <div className="flex items-center space-x-3 text-[10px] text-slate-500">
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" /> ≥90%</span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" /> ≥75%</span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> ≥50%</span>
                <span className="flex items-center space-x-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" /> &lt;50%</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {metrics.details?.map((kpt) => (
                <div key={kpt.name} className="flex items-center space-x-3 group">
                  <span className="text-[11px] text-slate-400 w-28 text-right font-mono capitalize truncate">
                    {kpt.name.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 bg-slate-800/60 h-4 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getBarColor(kpt.pck)}`}
                      style={{ width: `${kpt.pck}%` }}
                    />
                    <span className="absolute right-2 top-0 h-full flex items-center text-[10px] font-mono text-slate-300 font-medium">
                      {kpt.pck}%
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono w-14 text-right ${kpt.correction_rate > 20 ? "text-rose-400" : "text-slate-500"}`}>
                    sửa {kpt.correction_rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">
                Bảng chi tiết độ chính xác & tỷ lệ sửa theo từng khớp:
              </h3>
              <span className="text-[11px] text-slate-400">Dung sai PCK: α=0.2 | Correction: 5px</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                    <th className="pb-3 font-semibold">#</th>
                    <th className="pb-3 font-semibold">Tên khớp (Keypoint)</th>
                    <th className="pb-3 font-semibold">Độ chính xác (PCK)</th>
                    <th className="pb-3 font-semibold">Tỷ lệ phải sửa</th>
                    <th className="pb-3 font-semibold">Sai lệch TB (px)</th>
                    <th className="pb-3 font-semibold">Đánh giá</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {metrics.details?.map((kpt, idx) => (
                    <tr key={kpt.name} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 text-slate-500 font-mono">{idx}</td>
                      <td className="py-2.5 font-medium text-slate-300 capitalize">{kpt.name.replace(/_/g, " ")}</td>
                      <td className="py-2.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${getBarColor(kpt.pck)}`}
                              style={{ width: `${kpt.pck}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] text-slate-300">{kpt.pck}%</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                          kpt.correction_rate > 30
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : kpt.correction_rate > 10
                              ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                              : "bg-slate-800 text-slate-300"
                        }`}>
                          {kpt.correction_rate}%
                        </span>
                      </td>
                      <td className="py-2.5 font-mono text-slate-400">
                        {kpt.mean_error_px} px
                      </td>
                      <td className="py-2.5">
                        {kpt.pck >= 90 ? (
                          <span className="text-emerald-400 text-[10px] font-medium">✓ Xuất sắc</span>
                        ) : kpt.pck >= 75 ? (
                          <span className="text-cyan-400 text-[10px] font-medium">✓ Tốt</span>
                        ) : kpt.pck >= 50 ? (
                          <span className="text-amber-400 text-[10px] font-medium">⚠ TB</span>
                        ) : (
                          <span className="text-rose-400 text-[10px] font-medium">✗ Kém</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary Insight Card */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Tổng kết & Gợi ý</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-400">
              <div className="space-y-1">
                <div className="text-slate-300 font-medium">📊 Tổng quan</div>
                <p>PCK tổng: <span className={`font-semibold ${getPCKLevel(metrics.pck_overall).color}`}>{metrics.pck_overall}%</span></p>
                <p>NME: <span className="font-mono text-slate-300">{metrics.nme_overall}</span></p>
                <p>Số skeleton: <span className="font-mono text-slate-300">{metrics.total_skeletons}</span></p>
              </div>
              <div className="space-y-1">
                <div className="text-slate-300 font-medium">🎯 Khớp khó nhất</div>
                {metrics.details && (() => {
                  const sorted = [...metrics.details].sort((a, b) => a.pck - b.pck);
                  return sorted.slice(0, 3).map((k) => (
                    <p key={k.name}>
                      <span className="capitalize">{k.name.replace(/_/g, " ")}</span>: <span className="text-rose-400 font-mono">{k.pck}%</span> (sửa {k.correction_rate}%)
                    </p>
                  ));
                })()}
              </div>
              <div className="space-y-1">
                <div className="text-slate-300 font-medium">💡 Gợi ý cải thiện</div>
                {metrics.correction_rate_overall > 30 ? (
                  <p>Tỷ lệ sửa cao ({metrics.correction_rate_overall}%). Nên retrain model với dataset từ task này.</p>
                ) : metrics.correction_rate_overall > 15 ? (
                  <p>Tỷ lệ sửa trung bình. Có thể cải thiện bằng augmentation cho các khớp khó.</p>
                ) : (
                  <p className="text-emerald-400">Model hoạt động tốt! Tỷ lệ sửa thấp, tiết kiệm nhiều thời gian cho annotator.</p>
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
