import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Activity,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
  Download,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
} from "lucide-react";
import { api } from "../services/api";
import { Button, Select, Skeleton, EmptyState, toast } from "../components/ui";

export default function AnalyticsView({
  initialTaskId = null,
  onClearTargetTask,
  selectedModelType = "yolo",
  availableModels = [],
  onNavigateToCVAT,
}) {
  const [taskId, setTaskId] = useState(initialTaskId ? parseInt(initialTaskId, 10) : "");
  const [modelType, setModelType] = useState(selectedModelType);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const [cvatTasks, setCvatTasks] = useState([]);

  useEffect(() => {
    loadCVATTasks();
  }, []);

  // Nếu người dùng bấm từ nút "Metrics" trên CVAT Task Hub thì mới tự động load cho task đó
  useEffect(() => {
    if (initialTaskId) {
      const parsed = parseInt(initialTaskId, 10);
      setTaskId(parsed);
      loadMetrics(parsed, modelType);
      if (onClearTargetTask) onClearTargetTask();
    }
  }, [initialTaskId]);

  useEffect(() => {
    if (selectedModelType) {
      setModelType(selectedModelType);
    }
  }, [selectedModelType]);

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

  const handleRunEvaluation = () => {
    if (!taskId) {
      toast.warning("Chưa chọn Task CVAT", {
        description: "Vui lòng chọn một Task CVAT ở menu phía trên để bắt đầu đối chiếu.",
      });
      return;
    }
    loadMetrics(taskId, modelType);
  };

  const loadMetrics = async (id, mType = modelType) => {
    if (loading || !id) return;
    setLoading(true);
    setError("");
    try {
      const evaluateFn = (api.evaluateTask || api.evaluateMetrics).bind(api);
      const data = await evaluateFn(id, mType);
      setMetrics(data);
      toast.success("Đối chiếu QA & Metrics thành công", {
        description: `Task #${id} đối chiếu với mô hình ${data.model_name || mType.toUpperCase()}.`,
        metadata: [
          { label: "Task", value: `#${id}` },
          { label: "PCK", value: `${data.pck_overall}%` },
          { label: "Sửa", value: `${data.correction_rate_overall}%` },
          { label: "NME", value: `${data.nme_overall}` },
        ],
      });
    } catch (err) {
      const errMsg =
        err.message ||
        "Không thể tính toán đối chiếu. Có thể Task chưa được nạp Ground Truth hoặc chưa có ảnh hoàn thành gán nhãn.";
      setError(errMsg);
      toast.error("Không thể đối chiếu Ground Truth", {
        description: errMsg,
      });
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  const handleExportRetrain = async () => {
    if (!taskId) return;
    setIsExporting(true);
    const toastId = toast.loading("Đang xuất dataset huấn luyện...", {
      description: `Đang kéo Ground Truth từ Task #${taskId} để đóng gói chuẩn YOLO Pose...`,
    });
    try {
      const res = await api.exportDataset(taskId, `yolo26_task_${taskId}`);
      toast.update(toastId, {
        type: "success",
        title: "Đóng gói Dataset thành công",
        description: `Đã xuất ${res.train_samples} mẫu train, ${res.val_samples} mẫu val. Sẵn sàng huấn luyện lại!`,
        metadata: [
          { label: "Task", value: `#${taskId}` },
          { label: "Train", value: `${res.train_samples}` },
          { label: "Val", value: `${res.val_samples}` },
        ],
        action: onNavigateToCVAT ? { label: "Mở CVAT Hub ->", onClick: onNavigateToCVAT } : null,
      });
    } catch (err) {
      toast.update(toastId, {
        type: "error",
        title: "Xuất Dataset thất bại",
        description: err.message,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Logic màu ngữ nghĩa cho PCK Accuracy:
  // >= 85%: Xuất sắc (emerald)
  // 60% - 84%: Khá (amber)
  // < 60%: Kém / Sai lệch nhiều (rose)
  const getPCKLevel = (score) => {
    if (score >= 85) return { color: "text-emerald-400", bg: "bg-emerald-500", text: "Xuất sắc (≥85%)" };
    if (score >= 60) return { color: "text-amber-400", bg: "bg-amber-500", text: "Khá (60-84%)" };
    return { color: "text-rose-400", bg: "bg-rose-500", text: "Sai lệch cao (<60%)" };
  };

  // Logic màu ngữ nghĩa cho Tỷ lệ sửa (Correction Rate):
  // Càng THẤP càng tốt (AI đoán chuẩn)
  // Càng CAO càng xấu (Annotator phải sửa nhiều, AI đoán sai)
  const getCorrectionLevel = (rate) => {
    if (rate <= 20) {
      return {
        color: "text-emerald-400",
        badge: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
        text: `Tối ưu: Tiết kiệm ~${Math.round(100 - rate)}% thời gian gán nhãn`,
        icon: TrendingDown,
        level: "Tốt",
      };
    }
    if (rate <= 50) {
      return {
        color: "text-amber-400",
        badge: "bg-amber-500/10 text-amber-300 border-amber-500/20",
        text: `Mức độ sửa trung bình: annotator can thiệp ${rate}% khớp`,
        icon: TrendingUp,
        level: "Trung bình",
      };
    }
    return {
      color: "text-rose-400",
      badge: "bg-rose-500/10 text-rose-300 border-rose-500/20",
      text: `Cảnh báo: AI sai lệch cao (phải sửa ${rate}% khớp)`,
      icon: TrendingUp,
      level: "Cảnh báo",
    };
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* 1. Header Title & Description (Full width, no wrapping) */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center space-x-2">
          <BarChart3 className="w-5 h-5 text-zinc-400 shrink-0" />
          <span>Chất lượng Gán Nhãn & Độ Chính Xác (QA & Metrics)</span>
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed">
          So sánh dự đoán của{" "}
          <span className="text-zinc-200 font-medium">
            {metrics?.model_name ||
              (modelType === "vitpose"
                ? "ViTPose-Base"
                : modelType === "rtmpose"
                ? "RTMPose-m"
                : "YOLO 26 Pose")}
          </span>{" "}
          với Ground Truth trên CVAT để tính PCK, NME, Correction Rate.
        </p>
      </div>

      {/* 2. Control Toolbar Console Bar (Dedicated Row Below Title) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-2.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80 shadow-xs">
        {/* Left: Task & Model Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          {/* Task Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase font-medium shrink-0">
              Task:
            </span>
            {cvatTasks.length > 0 ? (
              <Select
                size="sm"
                value={taskId || ""}
                onChange={(e) => setTaskId(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="w-56 font-mono text-xs"
              >
                <option value="">-- Chọn Task CVAT --</option>
                {cvatTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    #{t.id} — {t.name}
                  </option>
                ))}
              </Select>
            ) : (
              <input
                type="number"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value ? parseInt(e.target.value, 10) : "")}
                className="w-20 bg-zinc-950 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-200 outline-none font-mono"
                placeholder="ID"
              />
            )}
          </div>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Model Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-mono text-zinc-500 uppercase font-medium shrink-0">
              Model:
            </span>
            <Select
              size="sm"
              value={modelType}
              onChange={(e) => setModelType(e.target.value)}
              className="w-48 text-xs font-mono"
            >
              <option value="yolo">YOLO 26 Pose</option>
              <option value="rtmpose">RTMPose-m (SOTA)</option>
              <option value="vitpose">ViTPose-Base (ViT)</option>
            </Select>
          </div>
        </div>

        {/* Right: Actions (Xem chỉ số + Refresh) */}
        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={handleRunEvaluation}
            disabled={loading || !taskId}
            isLoading={loading}
            loadingText="Đang tính..."
            icon={BarChart3}
            className="h-8 text-xs font-medium px-3.5 shadow-xs"
            title={!taskId ? "Vui lòng chọn Task trước khi xem chỉ số" : "Bắt đầu tính toán chỉ số PCK, NME và Tỷ lệ sửa"}
          >
            <span>Xem chỉ số</span>
          </Button>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRunEvaluation}
            disabled={loading || !taskId}
            className="h-8 w-8 p-0"
            title="Tính toán lại đối chiếu"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-zinc-200" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading State with Skeletons */}
      {loading && !metrics ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </div>
            ))}
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 space-y-3">
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/60">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : !metrics && !error ? (
        <EmptyState
          icon={Layers}
          title="Chưa kích hoạt tính toán đối chiếu Ground Truth"
          description="Vui lòng chọn Task CVAT và kiến trúc AI ở thanh công cụ phía trên, sau đó bấm 'Xem chỉ số' để bắt đầu phân tích chi tiết độ chuẩn xác PCK, sai số NME và tỷ lệ annotator phải sửa."
          action={
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunEvaluation}
              disabled={!taskId || loading}
              icon={BarChart3}
            >
              {taskId ? `Xem chỉ số Task #${taskId}` : "Chọn Task để xem chỉ số"}
            </Button>
          }
        />
      ) : metrics ? (
        <>
          {/* Top 4 KPI Cards với Semantic Color Logic */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. PCK Score */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Độ chính xác PCK@0.2</span>
                <CheckCircle className={`w-4 h-4 ${getPCKLevel(metrics.pck_overall).color}`} />
              </div>
              <div className={`text-2xl font-semibold font-mono tracking-tight ${getPCKLevel(metrics.pck_overall).color}`}>
                {metrics.pck_overall}%
              </div>
              <div className={`text-[11px] pt-0.5 flex items-center space-x-1 font-medium ${getPCKLevel(metrics.pck_overall).color}`}>
                {metrics.pck_overall >= 70 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{getPCKLevel(metrics.pck_overall).text}</span>
              </div>
            </div>

            {/* 2. Human Correction Rate (Tỷ lệ sửa - Semantic Color đảo ngược) */}
            {(() => {
              const corInfo = getCorrectionLevel(metrics.correction_rate_overall);
              const CorIcon = corInfo.icon;
              return (
                <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 shadow-xs space-y-1">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Tỷ lệ annotator sửa</span>
                    <Activity className={`w-4 h-4 ${corInfo.color}`} />
                  </div>
                  <div className={`text-2xl font-semibold font-mono tracking-tight ${corInfo.color}`}>
                    {metrics.correction_rate_overall}%
                  </div>
                  <div className={`text-[11px] pt-0.5 flex items-center space-x-1 font-medium ${corInfo.color}`}>
                    <CorIcon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{corInfo.text}</span>
                  </div>
                </div>
              );
            })()}

            {/* 3. Normalized Mean Error (NME) */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Sai số chuẩn hóa (NME)</span>
                <Sparkles className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
                {metrics.nme_overall}
              </div>
              <div className="text-[11px] text-zinc-500 pt-0.5">
                Khoảng cách lệch / kích thước thân
              </div>
            </div>

            {/* 4. Evaluated Skeletons */}
            <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span>Tổng số khung xương</span>
                <BarChart3 className="w-4 h-4 text-zinc-400" />
              </div>
              <div className="text-2xl font-semibold text-zinc-100 font-mono tracking-tight">
                {metrics.total_skeletons}
              </div>
              <div className="text-[11px] text-zinc-500 pt-0.5 font-mono">
                {metrics.total_images || 0} ảnh • Task #{taskId}
              </div>
            </div>
          </div>

          {/* Keypoint Level Details (Bố cục Grid 2 cột khoa học, tách bạch PCK & Sửa) */}
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-200 uppercase tracking-wider flex items-center space-x-2">
                  <span>Độ chính xác chi tiết 17 Khớp xương (COCO)</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-normal">
                    Grid 2 Cột
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Thanh màu thể hiện <strong className="text-zinc-400">độ chính xác PCK</strong>. Badge bên cạnh thể hiện <strong className="text-zinc-400">tỷ lệ annotator phải sửa</strong> (&gt;50% cảnh báo vàng/đỏ).
                </p>
              </div>
              <div className="flex items-center space-x-3 text-[10px] font-mono text-zinc-400 shrink-0">
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>≥85%</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>60-84%</span>
                </span>
                <span className="flex items-center space-x-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>&lt;60%</span>
                </span>
              </div>
            </div>

            {/* Grid 2 Cột: Bao quát toàn bộ 17 khớp trong 1 khung nhìn không cần cuộn */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-6 gap-y-2.5">
              {metrics.details &&
                metrics.details.map((k) => {
                  const pckInfo = getPCKLevel(k.pck);
                  const isHighCorrection = k.correction_rate > 50;
                  const isExtremeCorrection = k.correction_rate > 75;

                  return (
                    <div
                      key={k.name}
                      className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/70 hover:border-zinc-700/80 transition-colors space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        {/* Tên khớp */}
                        <div className="flex items-center space-x-2 min-w-0">
                          <span
                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${pckInfo.bg}`}
                          />
                          <span className="text-zinc-200 font-medium capitalize truncate">
                            {k.name.replace(/_/g, " ")}
                          </span>
                        </div>

                        {/* Nhóm chỉ số: Tách biệt Badge Sửa và Điểm PCK */}
                        <div className="flex items-center space-x-2 shrink-0">
                          {/* Badge Tỷ lệ sửa: nếu >50% tô màu cảnh báo */}
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[10px] font-medium border ${
                              isExtremeCorrection
                                ? "bg-rose-500/10 text-rose-300 border-rose-500/25"
                                : isHighCorrection
                                ? "bg-amber-500/10 text-amber-400/95 border-amber-500/25"
                                : "bg-zinc-900 text-zinc-400 border-zinc-800"
                            }`}
                            title={`Tỷ lệ annotator phải sửa khớp ${k.name}: ${k.correction_rate}%`}
                          >
                            <span>Sửa: {k.correction_rate}%</span>
                          </span>

                          {/* Điểm PCK chính xác */}
                          <span
                            className={`font-mono text-xs font-semibold tabular-nums w-12 text-right ${pckInfo.color}`}
                          >
                            {k.pck}%
                          </span>
                        </div>
                      </div>

                      {/* Thanh Progress Bar thể hiện PCK Accuracy */}
                      <div className="w-full bg-zinc-900/90 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${pckInfo.bg}`}
                          style={{ width: `${Math.max(k.pck, 2)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Actionable Summary Insight & Quick Action CTA */}
          <div className="bg-zinc-900/40 border border-zinc-800/90 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
              <div className="font-semibold text-zinc-200 uppercase tracking-wider text-xs flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                <span>Đánh giá từ Active Learning Engine</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">
                Task #{taskId} • {metrics.total_images || 0} ảnh
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cột 1: Tổng quan kết quả */}
              <div className="p-3.5 rounded-lg bg-zinc-950/40 border border-zinc-800/70 space-y-2 text-xs">
                <div className="text-zinc-200 font-semibold flex items-center space-x-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Tổng quan kết quả</span>
                </div>
                <div className="space-y-1.5 text-zinc-400">
                  <div className="flex justify-between items-center">
                    <span>PCK tổng thể:</span>
                    <span className={`font-mono font-semibold ${getPCKLevel(metrics.pck_overall).color}`}>
                      {metrics.pck_overall}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sai số NME:</span>
                    <span className="font-mono text-zinc-200 font-medium">{metrics.nme_overall}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Số khung xương:</span>
                    <span className="font-mono text-zinc-200 font-medium">{metrics.total_skeletons}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Tỷ lệ can thiệp:</span>
                    <span className={`font-mono font-semibold ${getCorrectionLevel(metrics.correction_rate_overall).color}`}>
                      {metrics.correction_rate_overall}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Cột 2: Khớp khó nhất (Top 3 Cần Lưu Ý) */}
              <div className="p-3.5 rounded-lg bg-zinc-950/40 border border-zinc-800/70 space-y-2 text-xs">
                <div className="text-zinc-200 font-semibold flex items-center space-x-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Khớp khó nhất (Top 3)</span>
                </div>
                <div className="space-y-2">
                  {metrics.details &&
                    (() => {
                      const sorted = [...metrics.details].sort((a, b) => a.pck - b.pck);
                      return sorted.slice(0, 3).map((k) => (
                        <div key={k.name} className="flex items-center justify-between text-[11px] font-mono">
                          <span className="capitalize text-zinc-300 font-sans">
                            {k.name.replace(/_/g, " ")}
                          </span>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-rose-400 font-semibold">{k.pck}%</span>
                            <span className="text-zinc-500">
                              (sửa {k.correction_rate}%)
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                </div>
              </div>

              {/* Cột 3: Khuyến nghị & Quick Action CTA */}
              <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-700/80 space-y-2.5 text-xs flex flex-col justify-between">
                <div>
                  <div className="text-zinc-100 font-semibold flex items-center space-x-1.5">
                    <Activity className="w-3.5 h-3.5 text-zinc-300" />
                    <span>Khuyến nghị Active Learning</span>
                  </div>

                  <div className="mt-2 text-[11px] text-zinc-300 leading-relaxed">
                    {metrics.correction_rate_overall > 30 ? (
                      <p>
                        Tỷ lệ sửa cao (<span className="text-rose-400 font-mono font-medium">{metrics.correction_rate_overall}%</span>). Khuyến nghị xuất dataset từ task này để huấn luyện lại (fine-tune) mô hình nhằm giảm áp lực annotator.
                      </p>
                    ) : metrics.correction_rate_overall > 15 ? (
                      <p>
                        Tỷ lệ sửa trung bình (<span className="text-amber-400 font-mono font-medium">{metrics.correction_rate_overall}%</span>). Khuyến nghị tăng cường dữ liệu góc quay cho các khớp khó ở cột bên.
                      </p>
                    ) : (
                      <p className="text-emerald-400">
                        Mô hình hoạt động rất tốt! Tỷ lệ sửa thấp ({metrics.correction_rate_overall}%), tiết kiệm tối đa thời gian annotator.
                      </p>
                    )}
                  </div>
                </div>

                {/* Quick Action CTA Buttons */}
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleExportRetrain}
                    disabled={isExporting}
                    isLoading={isExporting}
                    loadingText="Đang xuất..."
                    icon={Download}
                    className="flex-1 text-xs font-medium shadow-xs"
                    title="Xuất ngay bộ Ground Truth của Task này thành dataset YOLO Pose để train"
                  >
                    Xuất Dataset Retrain ngay
                  </Button>

                  {onNavigateToCVAT && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onNavigateToCVAT}
                      icon={ArrowRight}
                      className="text-xs"
                      title="Chuyển đến CVAT Task Hub"
                    >
                      CVAT Hub
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
