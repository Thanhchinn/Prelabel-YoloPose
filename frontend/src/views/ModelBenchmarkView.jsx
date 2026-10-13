import React, { useState, useEffect } from "react";
import { Cpu, Zap, Trophy, ShieldCheck, Play, Loader2, CheckCircle2, ArrowRight, Gauge, Layers, Sparkles, Activity } from "lucide-react";
import { api } from "../services/api";

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
      alert("Vui lòng chọn 1 ảnh mẫu để chạy thử nghiệm so sánh 3 model.");
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

        // Tính điểm tin cậy trung bình của các keypoints
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
    } catch (err) {
      alert("Lỗi khi chạy benchmark so sánh: " + err.message);
      setBenchmarkStatus("Đã xảy ra lỗi khi benchmark.");
    } finally {
      setIsRunningBenchmark(false);
      setTimeout(() => setBenchmarkStatus(""), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs text-cyan-400 font-mono uppercase tracking-wider mb-1">
            <Cpu className="w-4 h-4" />
            <span>AI Architecture Comparison & Benchmark</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            So Sánh & Đánh Giá 3 Kiến Trúc Model: YOLO 26 vs RTMPose vs ViTPose
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Phân tích chuyên sâu về tốc độ suy luận (Latency), độ chuẩn xác (COCO mAP), khả năng xử lý che khuất (Occlusion) và tỷ lệ can thiệp sửa nhãn (Human Correction Rate) phục vụ quy trình Pre-label tối ưu.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => {
              if (onNavigateToStudio) onNavigateToStudio();
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 flex items-center space-x-1.5 transition-all cursor-pointer"
          >
            <span>Vào Pre-label Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3 Core Architecture Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Model 1: YOLO 26 Pose */}
        <div className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden ${
          selectedModelType === "yolo" ? "border-emerald-500/60 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30" : "border-slate-800"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">YOLO 26 Pose</h3>
                <span className="text-[10px] text-slate-400 font-mono">Ultralytics YOLO Architecture</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              70-74 mAP
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed min-h-[38px]">
            Kiến trúc Single-stage một bước tối ưu thời gian thực. Rất phù hợp khi pre-label hàng loạt ảnh rõ ràng hoặc phát hiện người trên luồng video camera.
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tốc độ (Latency):</span>
              <span className="text-emerald-400 font-mono font-bold">⚡ ~15-30ms (Siêu nhanh)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tỷ lệ sửa (Correction):</span>
              <span className="text-slate-300 font-mono">~15% - 22%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Xử lý che khuất:</span>
              <span className="text-amber-400">Khá (Dễ lệch khớp khuất)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Khối lượng mô hình:</span>
              <span className="text-slate-300 font-mono">Nhẹ (~3.3M - 9.9M Params)</span>
            </div>
          </div>

          <button
            onClick={() => onSelectModelType && onSelectModelType("yolo")}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              selectedModelType === "yolo"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {selectedModelType === "yolo" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            <span>{selectedModelType === "yolo" ? "Đang Chọn Trong Studio" : "Chọn Dùng Mô Hình Này"}</span>
          </button>
        </div>

        {/* Model 2: RTMPose-m */}
        <div className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden ${
          selectedModelType === "rtmpose" ? "border-cyan-500/60 shadow-lg shadow-cyan-950/20 ring-1 ring-cyan-500/30" : "border-slate-800"
        }`}>
          <div className="absolute top-0 right-0 px-2.5 py-0.5 bg-gradient-to-l from-cyan-500/30 to-transparent text-[9px] text-cyan-300 font-semibold uppercase tracking-wider">
            Khuyên Dùng Cho Dự Án
          </div>

          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">RTMPose-m</h3>
                <span className="text-[10px] text-slate-400 font-mono">OpenMMLab MMPose (SimCC)</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              75.8 mAP
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed min-h-[38px]">
            Mô hình SOTA 2023-2024 sử dụng thuật toán SimCC (phân loại tọa độ 1D). Cân bằng hoàn hảo giữa tốc độ nhanh và độ chính xác vượt trội (+3.5% mAP vs YOLO).
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tốc độ (Latency):</span>
              <span className="text-cyan-400 font-mono font-bold">🚀 ~35-65ms (Rất nhanh)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tỷ lệ sửa (Correction):</span>
              <span className="text-cyan-300 font-mono font-bold">~9% - 14% (Giảm ~40%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Xử lý che khuất:</span>
              <span className="text-cyan-300">Tốt (SimCC chống sai lệch)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Khối lượng mô hình:</span>
              <span className="text-slate-300 font-mono">Vừa phải (~13.6M Params)</span>
            </div>
          </div>

          <button
            onClick={() => onSelectModelType && onSelectModelType("rtmpose")}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              selectedModelType === "rtmpose"
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {selectedModelType === "rtmpose" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            <span>{selectedModelType === "rtmpose" ? "Đang Chọn Trong Studio" : "Chọn Dùng Mô Hình Này"}</span>
          </button>
        </div>

        {/* Model 3: ViTPose-Base */}
        <div className={`bg-slate-900 border rounded-2xl p-5 space-y-4 transition-all relative overflow-hidden ${
          selectedModelType === "vitpose" ? "border-purple-500/60 shadow-lg shadow-purple-950/20 ring-1 ring-purple-500/30" : "border-slate-800"
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">ViTPose-Base</h3>
                <span className="text-[10px] text-slate-400 font-mono">Vision Transformer (HuggingFace)</span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              77.4+ mAP
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed min-h-[38px]">
            Kiến trúc Transformer thuần (ViT backbone) với cơ chế Self-Attention toàn cục. Mang lại độ chính xác cao nhất, xử lý vượt trội các tư thế khó, tay chân che khuất.
          </p>

          <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tốc độ (Latency):</span>
              <span className="text-purple-400 font-mono font-bold">🧠 ~120-250ms (Đòi hỏi GPU/CPU)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Tỷ lệ sửa (Correction):</span>
              <span className="text-purple-300 font-mono font-bold">~5% - 9% (Tối thiểu)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Xử lý che khuất:</span>
              <span className="text-purple-300">Xuất sắc (Toàn cục Attention)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Khối lượng mô hình:</span>
              <span className="text-slate-300 font-mono">Lớn (~89.8M Params)</span>
            </div>
          </div>

          <button
            onClick={() => onSelectModelType && onSelectModelType("vitpose")}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
              selectedModelType === "vitpose"
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/40"
                : "bg-slate-800 hover:bg-slate-700 text-slate-300"
            }`}
          >
            {selectedModelType === "vitpose" ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
            <span>{selectedModelType === "vitpose" ? "Đang Chọn Trong Studio" : "Chọn Dùng Mô Hình Này"}</span>
          </button>
        </div>
      </div>

      {/* Live Benchmark Playground (Thử nghiệm 1-Click) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Playground: Chạy Đo Lường Đối Chiếu 3 Model Trên Cùng 1 Ảnh</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Hệ thống sẽ chạy đồng thời cả 3 mô hình trên cùng bức ảnh để đo lường độ trễ thực tế, số người phát hiện và độ tin cậy.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {images.length > 0 ? (
              <select
                value={selectedImageName}
                onChange={(e) => setSelectedImageName(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 outline-none cursor-pointer focus:border-cyan-500"
              >
                {images.map((img) => (
                  <option key={img.name} value={img.name}>
                    {img.name}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs text-slate-500">Chưa có ảnh trong uploads</span>
            )}

            <button
              onClick={handleRunSideBySideBenchmark}
              disabled={isRunningBenchmark || images.length === 0}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 flex items-center space-x-1.5 transition-all disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
            >
              {isRunningBenchmark ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang Đo Lường...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Chạy Benchmark 1-Click</span>
                </>
              )}
            </button>
          </div>
        </div>

        {benchmarkStatus && (
          <div className="p-3 rounded-xl bg-cyan-950/50 border border-cyan-500/30 text-xs text-cyan-300 flex items-center space-x-2 animate-fadeIn">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400 shrink-0" />
            <span>{benchmarkStatus}</span>
          </div>
        )}

        {/* Kết quả Playground Benchmark */}
        {benchmarkResults && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {["yolo", "rtmpose", "vitpose"].map((mId) => {
              const res = benchmarkResults[mId];
              if (!res) return null;
              return (
                <div
                  key={mId}
                  className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-100">{res.model_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {res.latency_ms} ms
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Số người phát hiện:</span>
                      <span className="text-slate-100 font-mono font-bold text-sm">
                        {res.person_count}
                      </span>
                    </div>
                    <div className="bg-slate-900 p-2 rounded-lg border border-slate-800/80">
                      <span className="text-slate-400 block text-[10px]">Độ tin cậy TB (17 khớp):</span>
                      <span className="text-emerald-400 font-mono font-bold text-sm">
                        {res.avg_conf}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Decision Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-2">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span>Bảng Đối Chiếu Quyết Định Kỹ Thuật (Decision Matrix)</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950/70 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Tiêu chí so sánh</th>
                <th className="py-2.5 px-3 text-emerald-400">YOLO 26 Pose</th>
                <th className="py-2.5 px-3 text-cyan-400 font-bold">RTMPose-m (Đề xuất)</th>
                <th className="py-2.5 px-3 text-purple-400">ViTPose-Base</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              <tr className="hover:bg-slate-800/20">
                <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">Kiến trúc mạng</td>
                <td className="py-2.5 px-3">Single-Stage (YOLO)</td>
                <td className="py-2.5 px-3 text-cyan-300 font-semibold">Two-Stage (SimCC)</td>
                <td className="py-2.5 px-3">Vision Transformer (ViT)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">Tốc độ (Latency)</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">15 - 30ms (Nhanh nhất)</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">35 - 65ms (Nhanh)</td>
                <td className="py-2.5 px-3 text-purple-300">120 - 250ms</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">Độ chính xác (COCO mAP)</td>
                <td className="py-2.5 px-3">70.0 - 74.0</td>
                <td className="py-2.5 px-3 text-cyan-300 font-semibold">75.8 (+3.5%)</td>
                <td className="py-2.5 px-3 text-purple-300 font-bold">77.4+ (Cao nhất)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">Tỷ lệ sửa tay (Correction)</td>
                <td className="py-2.5 px-3 text-rose-300">15% - 22%</td>
                <td className="py-2.5 px-3 text-cyan-300 font-bold">9% - 14% (Giảm ~40%)</td>
                <td className="py-2.5 px-3 text-purple-300 font-bold">5% - 9% (Tối thiểu)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">Độ phức tạp Retrain</td>
                <td className="py-2.5 px-3 text-emerald-400 font-medium">Dễ nhất & nhanh nhất</td>
                <td className="py-2.5 px-3 text-slate-200">Cân bằng (MMPose)</td>
                <td className="py-2.5 px-3 text-amber-400">Cần GPU mạnh (VRAM cao)</td>
              </tr>
              <tr className="hover:bg-slate-800/20">
                <td className="py-2.5 px-3 font-sans text-slate-300 font-medium">Trường hợp ứng dụng tối ưu</td>
                <td className="py-2.5 px-3 font-sans text-slate-400">Edge/Camera thời gian thực</td>
                <td className="py-2.5 px-3 font-sans text-cyan-200 font-semibold">Pre-label quy mô sản xuất</td>
                <td className="py-2.5 px-3 font-sans text-purple-300">Tạo nhãn mẫu vàng (Gold)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
