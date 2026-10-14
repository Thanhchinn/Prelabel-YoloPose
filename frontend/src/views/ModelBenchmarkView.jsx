import React, { useState, useEffect } from "react";
import { Cpu, Zap, Trophy, ShieldCheck, Play, Loader2, CheckCircle2, ArrowRight, Gauge, Activity, Image as ImageIcon, Sparkles, Timer, BarChart2 } from "lucide-react";
import { api } from "../services/api";
import { toast } from "../components/ui";

export default function ModelBenchmarkView({ onNavigateToStudio, onSelectModelType, selectedModelType = "yolo" }) {
  const [images, setImages] = useState([]);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [confThreshold, setConfThreshold] = useState(0.5);
  const [kptConfThreshold, setKptConfThreshold] = useState(0.5);

  // Playground Benchmark State
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState(null);
  const [benchmarkStatus, setBenchmarkStatus] = useState("");

  useEffect(() => {
    loadImages();
  }, []);

  const loadImages = async () => {
    try {
      const res = await api.listImages();
      if (res && res.images && res.images.length > 0) {
        setImages(res.images);
        setSelectedImageName(res.images[0].name);
      }
    } catch (err) {
      console.error("Error loading images for benchmark:", err);
    }
  };

  const handleRunSideBySideBenchmark = async () => {
    if (!selectedImageName) {
      toast.warning("Chưa chọn ảnh test", {
        description: "Vui lòng chọn một ảnh mẫu trong danh sách để chạy thử nghiệm so sánh 3 model.",
      });
      return;
    }

    setIsRunningBenchmark(true);
    setBenchmarkStatus("Đang khởi động thử nghiệm đo lường cả 3 mô hình...");
    const modelsToTest = ["yolo", "rtmpose", "vitpose"];
    const results = {};

    try {
      for (const mId of modelsToTest) {
        setBenchmarkStatus(`Đang đo lường suy luận trên mô hình: ${mId.toUpperCase()}...`);
        const t0 = performance.now();
        const res = await api.predict({
          image_names: [selectedImageName],
          conf_threshold: confThreshold,
          kpt_conf_threshold: kptConfThreshold,
          model_type: mId,
        });
        const elapsed = Math.round(performance.now() - t0);

        const imgRes = res?.results?.[0];
        const persons = imgRes?.predictions || [];
        const personCount = persons.length;

        let avgConf = 0;
        let totalKpts = 0;
        persons.forEach((p) => {
          (p.keypoints || []).forEach((k) => {
            avgConf += k.conf;
            totalKpts += 1;
          });
        });
        avgConf = totalKpts > 0 ? (avgConf / totalKpts) * 100 : 0;

        results[mId] = {
          model_name: imgRes?.model_name || mId,
          model_type: mId,
          latency_ms: elapsed,
          person_count: personCount,
          avg_conf: Math.round(avgConf),
          predictions: persons,
        };
      }

      setBenchmarkResults(results);
      setBenchmarkStatus("Hoàn tất đo lường cả 3 mô hình!");
      toast.success("Benchmark 3 Model hoàn tất", {
        description: `Đã hoàn thành đo lường đối chiếu trên mẫu ảnh ${selectedImageName}.`,
        metadata: [
          { label: "Ảnh", value: selectedImageName },
          { label: "YOLO", value: `${results.yolo?.latency_ms}ms` },
          { label: "RTM", value: `${results.rtmpose?.latency_ms}ms` },
          { label: "ViT", value: `${results.vitpose?.latency_ms}ms` },
        ],
      });
    } catch (err) {
      toast.error("Lỗi khi chạy benchmark so sánh", {
        description: err.message,
      });
      setBenchmarkStatus("Đã xảy ra lỗi khi benchmark.");
    } finally {
      setIsRunningBenchmark(false);
      setTimeout(() => setBenchmarkStatus(""), 4000);
    }
  };

  // Tính toán thời gian nhanh nhất để so sánh delta độ trễ
  const fastestLatency = benchmarkResults
    ? Math.min(
        ...["yolo", "rtmpose", "vitpose"]
          .map((m) => benchmarkResults[m]?.latency_ms)
          .filter((v) => typeof v === "number" && !isNaN(v))
      )
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-1.5 text-xs text-zinc-500 uppercase tracking-wider mb-1 font-medium font-mono">
            <Cpu className="w-3.5 h-3.5 text-zinc-400" />
            <span>AI Architecture Benchmark</span>
          </div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Đánh giá 3 Kiến Trúc: YOLO 26 vs RTMPose vs ViTPose
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Phân tích tốc độ suy luận (Latency), độ chuẩn xác (COCO mAP), khả năng xử lý che khuất và tỷ lệ can thiệp sửa nhãn (Correction Rate).
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => {
              if (onNavigateToStudio) onNavigateToStudio();
            }}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <span>Vào Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Core Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Model 1: YOLO 26 Pose */}
        <div
          className={`rounded-xl p-5 space-y-4 transition-all relative flex flex-col justify-between ${
            selectedModelType === "yolo"
              ? "border border-zinc-500/80 bg-zinc-900/95 shadow-sm ring-1 ring-zinc-500/30"
              : "border border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700/80 hover:bg-zinc-900/40"
          }`}
        >
          <div className="space-y-3.5">
            {/* Header row with Title & Active/Score Badges */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                  <Zap className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100 flex items-center space-x-1.5">
                    <span>YOLO 26 Pose</span>
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Ultralytics Architecture</span>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1">
                {selectedModelType === "yolo" ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                ) : null}
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium tabular-nums bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  70.0 - 74.0 mAP
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed min-h-[38px]">
              Kiến trúc Single-stage một bước tối ưu thời gian thực. Rất phù hợp khi pre-label hàng loạt ảnh rõ ràng hoặc phát hiện người trên video.
            </p>

            {/* Micro-visualizations for Metrics */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-800/80">
              {/* Metric 1: Latency */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Tốc độ (Latency)</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-emerald-400">~15–30ms <span className="text-[10px] text-zinc-500 font-sans">(Siêu nhanh)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-full" />
                </div>
              </div>

              {/* Metric 2: Correction Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Tỷ lệ phải sửa</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-zinc-300">~15% – 22%</span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-400 rounded-full w-[55%]" />
                </div>
              </div>

              {/* Metric 3: Occlusion */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Xử lý che khuất</span>
                  <span className="text-zinc-300 text-xs font-sans">Khá <span className="text-[10px] text-zinc-500">(Dễ lệch khớp)</span></span>
                </div>
                <div className="flex space-x-1">
                  <span className="h-1 flex-1 bg-zinc-400 rounded-full" />
                  <span className="h-1 flex-1 bg-zinc-400 rounded-full" />
                  <span className="h-1 flex-1 bg-zinc-800 rounded-full" />
                  <span className="h-1 flex-1 bg-zinc-800 rounded-full" />
                </div>
              </div>

              {/* Metric 4: Model Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Khối lượng Params</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-emerald-400/90">~3.3M Params <span className="text-[10px] text-zinc-500 font-sans">(Nhẹ)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400/80 rounded-full w-1/4" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectModelType && onSelectModelType("yolo")}
            className={`w-full mt-4 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              selectedModelType === "yolo"
                ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {selectedModelType === "yolo" ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" /> : null}
            <span>{selectedModelType === "yolo" ? "Đang Chọn Trong Studio" : "Chọn Dùng Mô Hình Này"}</span>
          </button>
        </div>

        {/* Model 2: RTMPose-m (Recommended / SOTA Balance) */}
        <div
          className={`rounded-xl p-5 space-y-4 transition-all relative flex flex-col justify-between ${
            selectedModelType === "rtmpose"
              ? "border border-zinc-500/80 bg-zinc-900/95 shadow-sm ring-1 ring-zinc-500/30"
              : "border border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700/80 hover:bg-zinc-900/40"
          }`}
        >
          <div className="space-y-3.5">
            {/* Header row with Title & Badges */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                  <Trophy className="w-4 h-4 text-zinc-200" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100 flex items-center space-x-1.5">
                    <span>RTMPose-m</span>
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">MMPose (SimCC SOTA)</span>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1">
                {selectedModelType === "rtmpose" ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                    <Sparkles className="w-2.5 h-2.5" />
                    <span>Đề xuất SOTA</span>
                  </span>
                )}
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium tabular-nums bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  75.8 mAP (+3.5%)
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed min-h-[38px]">
              Mô hình SimCC phân loại tọa độ 1D. Cân bằng hoàn hảo giữa tốc độ nhanh và độ chính xác vượt trội (+3.5% mAP vs YOLO).
            </p>

            {/* Micro-visualizations for Metrics */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-800/80">
              {/* Metric 1: Latency */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Tốc độ (Latency)</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-zinc-200">~35–65ms <span className="text-[10px] text-zinc-500 font-sans">(Cân bằng)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-300 rounded-full w-[80%]" />
                </div>
              </div>

              {/* Metric 2: Correction Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Tỷ lệ phải sửa</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-emerald-400">~9% – 14% <span className="text-[10px] text-emerald-500/90 font-sans">(Giảm ~40%)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-[85%]" />
                </div>
              </div>

              {/* Metric 3: Occlusion */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Xử lý che khuất</span>
                  <span className="text-zinc-200 text-xs font-sans">Tốt <span className="text-[10px] text-zinc-500">(SimCC chống lệch)</span></span>
                </div>
                <div className="flex space-x-1">
                  <span className="h-1 flex-1 bg-emerald-400/90 rounded-full" />
                  <span className="h-1 flex-1 bg-emerald-400/90 rounded-full" />
                  <span className="h-1 flex-1 bg-emerald-400/90 rounded-full" />
                  <span className="h-1 flex-1 bg-zinc-800 rounded-full" />
                </div>
              </div>

              {/* Metric 4: Model Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Khối lượng Params</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-zinc-300">~13.6M Params <span className="text-[10px] text-zinc-500 font-sans">(Vừa phải)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-zinc-300 rounded-full w-[45%]" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectModelType && onSelectModelType("rtmpose")}
            className={`w-full mt-4 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              selectedModelType === "rtmpose"
                ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {selectedModelType === "rtmpose" ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" /> : null}
            <span>{selectedModelType === "rtmpose" ? "Đang Chọn Trong Studio" : "Chọn Dùng Mô Hình Này"}</span>
          </button>
        </div>

        {/* Model 3: ViTPose-Base (High Precision) */}
        <div
          className={`rounded-xl p-5 space-y-4 transition-all relative flex flex-col justify-between ${
            selectedModelType === "vitpose"
              ? "border border-zinc-500/80 bg-zinc-900/95 shadow-sm ring-1 ring-zinc-500/30"
              : "border border-zinc-800/80 bg-zinc-950/50 hover:border-zinc-700/80 hover:bg-zinc-900/40"
          }`}
        >
          <div className="space-y-3.5">
            {/* Header row with Title & Badges */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                  <ShieldCheck className="w-4 h-4 text-zinc-300" />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-zinc-100 flex items-center space-x-1.5">
                    <span>ViTPose-Base</span>
                  </h3>
                  <span className="text-[10px] text-zinc-500 font-mono">Vision Transformer (ViT)</span>
                </div>
              </div>

              <div className="flex flex-col items-end space-y-1">
                {selectedModelType === "vitpose" ? (
                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Active</span>
                  </span>
                ) : null}
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium tabular-nums bg-zinc-800 text-zinc-300 border border-zinc-700/60">
                  77.4+ mAP (Cao nhất)
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed min-h-[38px]">
              Kiến trúc Transformer thuần với Self-Attention toàn cục. Mang lại độ chính xác cao nhất, xử lý vượt trội các tư thế khó.
            </p>

            {/* Micro-visualizations for Metrics */}
            <div className="space-y-2.5 pt-3 border-t border-zinc-800/80">
              {/* Metric 1: Latency */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Tốc độ (Latency)</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-amber-400/90">~120–250ms <span className="text-[10px] text-zinc-500 font-sans">(Chậm hơn)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400/80 rounded-full w-[40%]" />
                </div>
              </div>

              {/* Metric 2: Correction Rate */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Tỷ lệ phải sửa</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-emerald-400">~5% – 9% <span className="text-[10px] text-emerald-500/90 font-sans">(Tối thiểu)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full w-full" />
                </div>
              </div>

              {/* Metric 3: Occlusion */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Xử lý che khuất</span>
                  <span className="text-emerald-400 text-xs font-sans">Xuất sắc <span className="text-[10px] text-zinc-500">(Attention)</span></span>
                </div>
                <div className="flex space-x-1">
                  <span className="h-1 flex-1 bg-emerald-400 rounded-full" />
                  <span className="h-1 flex-1 bg-emerald-400 rounded-full" />
                  <span className="h-1 flex-1 bg-emerald-400 rounded-full" />
                  <span className="h-1 flex-1 bg-emerald-400 rounded-full" />
                </div>
              </div>

              {/* Metric 4: Model Size */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 text-[11px]">Khối lượng Params</span>
                  <span className="font-mono tabular-nums text-xs font-medium text-amber-400/90">~89.8M Params <span className="text-[10px] text-zinc-500 font-sans">(Nặng)</span></span>
                </div>
                <div className="h-1 w-full bg-zinc-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-400/80 rounded-full w-[90%]" />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => onSelectModelType && onSelectModelType("vitpose")}
            className={`w-full mt-4 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer ${
              selectedModelType === "vitpose"
                ? "bg-zinc-100 text-zinc-950 font-semibold shadow-xs"
                : "bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-700"
            }`}
          >
            {selectedModelType === "vitpose" ? <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" /> : null}
            <span>{selectedModelType === "vitpose" ? "Đang Chọn Trong Studio" : "Chọn Dùng Mô Hình Này"}</span>
          </button>
        </div>
      </div>

      {/* Interactive Benchmark Console */}
      <div className="rounded-xl border border-zinc-800 bg-gradient-to-r from-zinc-900/90 via-zinc-900/50 to-zinc-900/90 p-5 shadow-sm space-y-4 relative overflow-hidden">
        {/* Console Header & Control Group */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-zinc-100 font-mono">
              <div className="w-6 h-6 rounded-md bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
                <Gauge className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm font-semibold tracking-tight text-zinc-100 font-sans">
                Interactive Benchmark Console
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-mono">
                Realtime Profiler
              </span>
            </div>
            <p className="text-xs text-zinc-400 pl-8 leading-relaxed max-w-2xl">
              Đo lường độ trễ suy luận (Latency), thông lượng FPS, số đối tượng phát hiện và độ tin cậy trên cùng 1 mẫu ảnh đầu vào.
            </p>
          </div>

          {/* Unified Seamless Control Group */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0 self-start lg:self-auto">
            <div className="flex items-center space-x-2 px-2.5 min-w-0">
              <ImageIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
              <span className="text-[11px] text-zinc-500 uppercase font-medium font-mono shrink-0">ẢNH TEST:</span>
              {images.length > 0 ? (
                <select
                  value={selectedImageName}
                  onChange={(e) => setSelectedImageName(e.target.value)}
                  disabled={isRunningBenchmark}
                  className="bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-200 outline-none cursor-pointer focus:border-zinc-700 max-w-[210px] truncate font-mono tabular-nums disabled:opacity-50"
                >
                  {images.map((img) => (
                    <option key={img.name} value={img.name}>
                      {img.name}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-zinc-500 italic">Chưa có ảnh trong thư mục</span>
              )}
            </div>

            <button
              onClick={handleRunSideBySideBenchmark}
              disabled={isRunningBenchmark || images.length === 0}
              className={`px-3.5 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all shadow-xs shrink-0 ${
                isRunningBenchmark
                  ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : "bg-zinc-100 hover:bg-white text-zinc-950 active:scale-95 cursor-pointer"
              } disabled:opacity-50`}
            >
              {isRunningBenchmark ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
                  <span className="font-mono">Đang đo lường...</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-zinc-950" />
                  <span>Chạy đối chiếu</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Execution Status Line */}
        {benchmarkStatus && (
          <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800 font-mono text-xs text-zinc-300 flex items-center space-x-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />
            <span className="text-zinc-400">&gt;</span>
            <span>{benchmarkStatus}</span>
          </div>
        )}

        {/* Realtime Results & Telemetry Comparison Area */}
        {benchmarkResults ? (
          <div className="space-y-4 pt-1">
            {/* Telemetry Snapshot Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {["yolo", "rtmpose", "vitpose"].map((mId) => {
                const res = benchmarkResults[mId];
                if (!res) return null;
                const isSelected = selectedModelType === mId;
                const fps = Math.round(1000 / Math.max(1, res.latency_ms));
                const isFastest = res.latency_ms === fastestLatency;
                const deltaMs = res.latency_ms - fastestLatency;

                return (
                  <div
                    key={mId}
                    className={`rounded-lg p-3.5 space-y-3 border transition-all ${
                      isSelected
                        ? "bg-zinc-900/90 border-zinc-600 shadow-xs"
                        : "bg-zinc-950/70 border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-semibold text-zinc-100">{res.model_name}</span>
                        {isSelected ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : null}
                      </div>

                      {isFastest ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          Nhanh nhất
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium tabular-nums bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                          +{deltaMs}ms
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
                      <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80 space-y-0.5">
                        <span className="text-zinc-500 block text-[10px] font-sans">Độ trễ & FPS:</span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className={`text-sm font-semibold ${isFastest ? "text-emerald-400" : "text-zinc-100"}`}>
                            {res.latency_ms}ms
                          </span>
                          <span className="text-[10px] text-zinc-400">({fps} FPS)</span>
                        </div>
                      </div>

                      <div className="bg-zinc-900/80 p-2 rounded border border-zinc-800/80 space-y-0.5">
                        <span className="text-zinc-500 block text-[10px] font-sans">Phát hiện / Tin cậy:</span>
                        <div className="flex items-baseline space-x-1.5">
                          <span className="text-sm font-semibold text-zinc-100">
                            {res.person_count} người
                          </span>
                          <span className="text-[10px] text-emerald-400">({res.avg_conf}%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Realtime Telemetry Table Comparison */}
            <div className="overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/60">
              <table className="w-full text-xs text-left text-zinc-300 border-collapse">
                <thead className="bg-zinc-900/80 text-[10px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-2.5 px-3.5 font-medium">Kiến trúc Model</th>
                    <th className="py-2.5 px-3.5 font-medium">Độ trễ (Latency)</th>
                    <th className="py-2.5 px-3.5 font-medium">Thông lượng (FPS)</th>
                    <th className="py-2.5 px-3.5 font-medium">Số người phát hiện</th>
                    <th className="py-2.5 px-3.5 font-medium">Độ tin cậy TB (17 khớp)</th>
                    <th className="py-2.5 px-3.5 font-medium text-right">So sánh tốc độ vs Baseline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px] tabular-nums">
                  {["yolo", "rtmpose", "vitpose"].map((mId) => {
                    const res = benchmarkResults[mId];
                    if (!res) return null;
                    const fps = Math.round(1000 / Math.max(1, res.latency_ms));
                    const isFastest = res.latency_ms === fastestLatency;
                    const deltaMs = res.latency_ms - fastestLatency;
                    const ratio = fastestLatency > 0 ? (res.latency_ms / fastestLatency).toFixed(1) : "1.0";

                    return (
                      <tr key={mId} className="hover:bg-zinc-900/40">
                        <td className="py-2.5 px-3.5 font-sans font-medium text-zinc-200 flex items-center space-x-1.5">
                          <span>{res.model_name}</span>
                          {selectedModelType === mId ? (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/60 font-mono">
                              Studio Active
                            </span>
                          ) : null}
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className={`font-semibold ${isFastest ? "text-emerald-400" : "text-zinc-200"}`}>
                            {res.latency_ms} ms
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-zinc-300">
                          ~{fps} FPS
                        </td>
                        <td className="py-2.5 px-3.5 text-zinc-100">
                          {res.person_count} đối tượng
                        </td>
                        <td className="py-2.5 px-3.5">
                          <span className="text-emerald-400 font-medium">{res.avg_conf}%</span>
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-sans">
                          {isFastest ? (
                            <span className="inline-flex items-center space-x-1 text-emerald-400 font-mono text-[11px] font-medium">
                              <span>Nhanh nhất (1.0x Baseline)</span>
                            </span>
                          ) : (
                            <span className="text-zinc-400 font-mono text-[11px]">
                              +{deltaMs}ms ({ratio}x thời gian)
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-8 px-4 rounded-lg border border-dashed border-zinc-800/80 bg-zinc-950/30 text-center space-y-1.5">
            <Gauge className="w-6 h-6 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400 font-medium">Chưa có kết quả đo lường cho phiên này</p>
            <p className="text-[11px] text-zinc-500">
              Chọn 1 ảnh mẫu phía trên và bấm "Chạy đối chiếu" để kích hoạt bộ đo lường suy luận đồng thời 3 kiến trúc AI.
            </p>
          </div>
        )}
      </div>

      {/* Decision Matrix Table */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-medium text-zinc-200 uppercase tracking-wider font-mono flex items-center space-x-2">
          <Activity className="w-3.5 h-3.5 text-zinc-400" />
          <span>Bảng Đối Chiếu Quyết Định Kỹ Thuật (Decision Matrix)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-zinc-300 border-collapse">
            <thead className="bg-zinc-900/60 text-[11px] font-mono uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-2.5 px-3.5 font-medium">Tiêu chí so sánh</th>
                <th className={`py-2.5 px-3.5 font-medium transition-colors ${
                  selectedModelType === "yolo" ? "bg-zinc-900/50 text-zinc-100 border-x border-zinc-800" : "text-zinc-300"
                }`}>
                  <div className="flex items-center space-x-1.5">
                    <span>YOLO 26 Pose</span>
                    {selectedModelType === "yolo" ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : null}
                  </div>
                </th>
                <th className={`py-2.5 px-3.5 font-medium transition-colors ${
                  selectedModelType === "rtmpose" ? "bg-zinc-900/50 text-zinc-100 border-x border-zinc-800" : "bg-zinc-900/30 text-emerald-300 border-x border-zinc-800/60"
                }`}>
                  <div className="flex items-center space-x-1.5">
                    <span>RTMPose-m (Đề xuất)</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">SOTA</span>
                    {selectedModelType === "rtmpose" ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : null}
                  </div>
                </th>
                <th className={`py-2.5 px-3.5 font-medium transition-colors ${
                  selectedModelType === "vitpose" ? "bg-zinc-900/50 text-zinc-100 border-x border-zinc-800" : "text-zinc-300"
                }`}>
                  <div className="flex items-center space-x-1.5">
                    <span>ViTPose-Base</span>
                    {selectedModelType === "vitpose" ? <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> : null}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-[11px] tabular-nums">
              <tr className="hover:bg-zinc-900/40">
                <td className="py-2.5 px-3.5 font-sans text-zinc-400 font-medium">Kiến trúc mạng</td>
                <td className={`py-2.5 px-3.5 ${selectedModelType === "yolo" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium text-zinc-200" : ""}`}>
                  Single-Stage (YOLO)
                </td>
                <td className={`py-2.5 px-3.5 text-zinc-100 font-medium ${selectedModelType === "rtmpose" ? "bg-zinc-900/50 border-x border-zinc-800" : "bg-zinc-900/20 border-x border-zinc-800/60"}`}>
                  Two-Stage (SimCC)
                </td>
                <td className={`py-2.5 px-3.5 ${selectedModelType === "vitpose" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium text-zinc-200" : ""}`}>
                  Vision Transformer (ViT)
                </td>
              </tr>
              <tr className="hover:bg-zinc-900/40">
                <td className="py-2.5 px-3.5 font-sans text-zinc-400 font-medium">Tốc độ (Latency)</td>
                <td className={`py-2.5 px-3.5 text-emerald-400 font-medium ${selectedModelType === "yolo" ? "bg-zinc-900/40 border-x border-zinc-800 font-semibold" : ""}`}>
                  15 – 30ms (Nhanh nhất)
                </td>
                <td className={`py-2.5 px-3.5 text-zinc-100 font-medium ${selectedModelType === "rtmpose" ? "bg-zinc-900/50 border-x border-zinc-800" : "bg-zinc-900/20 border-x border-zinc-800/60"}`}>
                  35 – 65ms (Cân bằng)
                </td>
                <td className={`py-2.5 px-3.5 text-amber-400/90 ${selectedModelType === "vitpose" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium" : ""}`}>
                  120 – 250ms (Đòi hỏi GPU)
                </td>
              </tr>
              <tr className="hover:bg-zinc-900/40">
                <td className="py-2.5 px-3.5 font-sans text-zinc-400 font-medium">Độ chính xác (COCO mAP)</td>
                <td className={`py-2.5 px-3.5 ${selectedModelType === "yolo" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium text-zinc-200" : ""}`}>
                  70.0 – 74.0
                </td>
                <td className={`py-2.5 px-3.5 text-zinc-100 font-medium ${selectedModelType === "rtmpose" ? "bg-zinc-900/50 border-x border-zinc-800" : "bg-zinc-900/20 border-x border-zinc-800/60"}`}>
                  75.8 (+3.5% vs YOLO)
                </td>
                <td className={`py-2.5 px-3.5 text-emerald-400 font-medium ${selectedModelType === "vitpose" ? "bg-zinc-900/40 border-x border-zinc-800 font-semibold" : ""}`}>
                  77.4+ (Cao nhất)
                </td>
              </tr>
              <tr className="hover:bg-zinc-900/40">
                <td className="py-2.5 px-3.5 font-sans text-zinc-400 font-medium">Tỷ lệ sửa tay (Correction)</td>
                <td className={`py-2.5 px-3.5 text-zinc-400 ${selectedModelType === "yolo" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium text-zinc-300" : ""}`}>
                  15% – 22%
                </td>
                <td className={`py-2.5 px-3.5 text-zinc-100 font-medium ${selectedModelType === "rtmpose" ? "bg-zinc-900/50 border-x border-zinc-800" : "bg-zinc-900/20 border-x border-zinc-800/60"}`}>
                  9% – 14% (Giảm ~40%)
                </td>
                <td className={`py-2.5 px-3.5 text-emerald-400 font-medium ${selectedModelType === "vitpose" ? "bg-zinc-900/40 border-x border-zinc-800 font-semibold" : ""}`}>
                  5% – 9% (Tối thiểu)
                </td>
              </tr>
              <tr className="hover:bg-zinc-900/40">
                <td className="py-2.5 px-3.5 font-sans text-zinc-400 font-medium">Độ phức tạp Retrain</td>
                <td className={`py-2.5 px-3.5 text-emerald-400 font-medium ${selectedModelType === "yolo" ? "bg-zinc-900/40 border-x border-zinc-800 font-semibold" : ""}`}>
                  Dễ nhất & siêu nhanh
                </td>
                <td className={`py-2.5 px-3.5 text-zinc-300 font-medium ${selectedModelType === "rtmpose" ? "bg-zinc-900/50 border-x border-zinc-800" : "bg-zinc-900/20 border-x border-zinc-800/60"}`}>
                  Cân bằng (MMPose)
                </td>
                <td className={`py-2.5 px-3.5 text-amber-400/90 ${selectedModelType === "vitpose" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium" : ""}`}>
                  Cần GPU VRAM lớn
                </td>
              </tr>
              <tr className="hover:bg-zinc-900/40">
                <td className="py-2.5 px-3.5 font-sans text-zinc-400 font-medium">Trường hợp ứng dụng tối ưu</td>
                <td className={`py-2.5 px-3.5 font-sans text-zinc-400 ${selectedModelType === "yolo" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium text-zinc-200" : ""}`}>
                  Camera / Edge thời gian thực
                </td>
                <td className={`py-2.5 px-3.5 font-sans text-zinc-100 font-medium ${selectedModelType === "rtmpose" ? "bg-zinc-900/50 border-x border-zinc-800" : "bg-zinc-900/20 border-x border-zinc-800/60"}`}>
                  Pre-label quy mô sản xuất
                </td>
                <td className={`py-2.5 px-3.5 font-sans text-zinc-400 ${selectedModelType === "vitpose" ? "bg-zinc-900/40 border-x border-zinc-800 font-medium text-zinc-200" : ""}`}>
                  Tạo dataset nhãn mẫu vàng
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
