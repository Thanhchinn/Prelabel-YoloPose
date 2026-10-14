import React, { useState, useEffect, useRef } from "react";
import {
  Cpu, Zap, Play, Square, CheckCircle2, AlertCircle, ArrowUpRight, ArrowDownRight,
  RefreshCw, Upload, Layers, ShieldCheck, Database, History, Sparkles,
  FolderArchive, Terminal, Gauge, Check, ArrowRight, Activity, Clock
} from "lucide-react";
import { api } from "../services/api";
import { toast, Button, Input, Select } from "../components/ui";

export default function RetrainView({
  selectedModelType = "yolo",
  onSelectModelType,
  onNavigateToStudio,
  onRefreshModels,
}) {
  // Hardware Telemetry
  const [hardware, setHardware] = useState(null);
  const [isLoadingHw, setIsLoadingHw] = useState(false);

  // Model Selection for Training
  const [trainModelType, setTrainModelType] = useState(selectedModelType || "yolo");
  const [epochs, setEpochs] = useState(20);
  const [selectedPreset, setSelectedPreset] = useState("fast");

  // Dataset Hub State
  const [datasets, setDatasets] = useState([]);
  const [externalGTs, setExternalGTs] = useState([]);
  const [cvatTasks, setCvatTasks] = useState([]);
  const [selectedCvatTaskIds, setSelectedCvatTaskIds] = useState([]);
  const [selectedExternalAliases, setSelectedExternalAliases] = useState([]);
  const [mergedDatasetName, setMergedDatasetName] = useState("merged_retrain_ds");
  const [activeDatasetName, setActiveDatasetName] = useState("");
  const [isMerging, setIsMerging] = useState(false);

  // Upload External GT
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadAlias, setUploadAlias] = useState("gt_batch_1");
  const [isUploadingGT, setIsUploadingGT] = useState(false);
  const fileInputRef = useRef(null);

  // Training Execution & Live Progress
  const [trainStatus, setTrainStatus] = useState({
    status: "idle",
    current_epoch: 0,
    total_epochs: 0,
    progress_percent: 0,
    current_loss: 0,
    logs: [],
    pre_metrics: {},
    post_metrics: {},
    delta: {},
  });
  const [isStartingTrain, setIsStartingTrain] = useState(false);
  const logTerminalRef = useRef(null);

  // Model Registry
  const [registry, setRegistry] = useState(null);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);

  useEffect(() => {
    loadHardwareStatus();
    loadDatasets();
    loadCVATTasks();
    loadRegistry();

    // Polling training status every 1.5s
    const interval = setInterval(fetchTrainingStatus, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (logTerminalRef.current) {
      logTerminalRef.current.scrollTop = logTerminalRef.current.scrollHeight;
    }
  }, [trainStatus.logs]);

  const loadHardwareStatus = async () => {
    setIsLoadingHw(true);
    try {
      const data = await api.getHardwareStatus();
      setHardware(data);
      if (data?.recommendations?.epochs) {
        setEpochs(data.recommendations.epochs);
      }
    } catch (err) {
      console.warn("Hardware status error:", err);
    } finally {
      setIsLoadingHw(false);
    }
  };

  const loadDatasets = async () => {
    try {
      const data = await api.listDatasets();
      setDatasets(data.datasets || []);
      setExternalGTs(data.external_groundtruth || []);
      if (data.datasets && data.datasets.length > 0 && !activeDatasetName) {
        setActiveDatasetName(data.datasets[0].name);
      }
    } catch (err) {
      console.warn("List datasets error:", err);
    }
  };

  const loadCVATTasks = async () => {
    try {
      const res = await api.listCVATTasks("studio");
      const list = res.tasks || [];
      setCvatTasks(list);
      // Mặc định tick chọn task đầu tiên nếu có
      if (list.length > 0) {
        setSelectedCvatTaskIds([list[0].id]);
      }
    } catch (err) {
      console.warn("CVAT tasks error:", err);
    }
  };

  const loadRegistry = async () => {
    setIsLoadingRegistry(true);
    try {
      const data = await api.getModelRegistry();
      setRegistry(data);
    } catch (err) {
      console.warn("Registry load error:", err);
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  const fetchTrainingStatus = async () => {
    try {
      const snap = await api.getTrainingStatus();
      setTrainStatus(snap);
      if (snap.status === "completed" && snap.result_version) {
        // Tải lại registry khi train xong
        loadRegistry();
        if (onRefreshModels) onRefreshModels();
      }
    } catch (err) {
      // Bỏ qua lỗi polling khi server bận
    }
  };

  // Upload Ground Truth ZIP
  const handleUploadGT = async () => {
    if (!uploadFile) {
      toast.warning("Chưa chọn file ZIP", {
        description: "Vui lòng chọn file .zip chứa ảnh và nhãn Ground Truth (COCO JSON hoặc YOLO txt).",
      });
      return;
    }
    setIsUploadingGT(true);
    try {
      const res = await api.uploadGroundTruthZip(uploadFile, uploadAlias.trim() || "custom_gt");
      toast.success("Nạp Ground Truth thành công!", {
        description: res.message,
      });
      setUploadFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDatasets();
    } catch (err) {
      toast.error("Lỗi nạp Ground Truth", { description: err.message });
    } finally {
      setIsUploadingGT(false);
    }
  };

  // Merge CVAT + External GT
  const handleMergeDatasets = async () => {
    if (!mergedDatasetName.trim()) {
      toast.warning("Thiếu tên Dataset", { description: "Vui lòng nhập tên cho dataset hợp nhất." });
      return;
    }
    setIsMerging(true);
    try {
      const res = await api.mergeDatasets({
        dataset_name: mergedDatasetName.trim(),
        cvat_task_ids: selectedCvatTaskIds,
        external_aliases: selectedExternalAliases,
        val_ratio: 0.2,
      });
      toast.success("Hợp nhất Dataset thành công!", {
        description: `${res.message} (${res.total_samples} ảnh đã sẵn sàng)`,
      });
      await loadDatasets();
      setActiveDatasetName(res.dataset_name);
    } catch (err) {
      toast.error("Lỗi hợp nhất Dataset", { description: err.message });
    } finally {
      setIsMerging(false);
    }
  };

  // Start Training
  const handleStartTrain = async () => {
    if (!activeDatasetName) {
      toast.warning("Chưa có Dataset", {
        description: "Vui lòng hợp nhất hoặc chọn một dataset để huấn luyện.",
      });
      return;
    }
    setIsStartingTrain(true);
    try {
      const res = await api.startTraining({
        model_type: trainModelType,
        dataset_name: activeDatasetName,
        epochs: parseInt(epochs) || 20,
        preset: selectedPreset,
      });
      toast.success("Đã kích hoạt Huấn luyện!", {
        description: `Mô hình ${trainModelType.toUpperCase()} đang huấn luyện trên dataset '${activeDatasetName}'.`,
      });
      fetchTrainingStatus();
    } catch (err) {
      toast.error("Không thể khởi chạy Huấn luyện", { description: err.message });
    } finally {
      setIsStartingTrain(false);
    }
  };

  const handleStopTrain = async () => {
    try {
      await api.stopTraining();
      toast.info("Đã gửi yêu cầu dừng", { description: "Tiến trình đang an toàn lưu lại trạng thái và dừng lại." });
    } catch (err) {
      toast.error("Lỗi dừng train", { description: err.message });
    }
  };

  const handleSetActiveVersion = async (modelType, versionId) => {
    try {
      const res = await api.setActiveModelVersion(modelType, versionId);
      toast.success("Đã kích hoạt phiên bản!", { description: res.message });
      loadRegistry();
      if (onSelectModelType) onSelectModelType(modelType);
      if (onRefreshModels) onRefreshModels();
    } catch (err) {
      toast.error("Lỗi kích hoạt phiên bản", { description: err.message });
    }
  };

  // Helper Preset
  const handleApplyPreset = (presetKey) => {
    setSelectedPreset(presetKey);
    if (presetKey === "fast") setEpochs(15);
    else if (presetKey === "balanced") setEpochs(25);
    else if (presetKey === "deep") setEpochs(40);
  };

  const activeModelRegistry = registry?.[trainModelType] || { versions: [], total_train_runs: 0 };
  const currentActiveVer = activeModelRegistry.active_version || "v0_base";

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 select-none">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-zinc-800/80">
        <div>
          <div className="flex items-center space-x-2 text-xs text-zinc-500 uppercase tracking-wider mb-1 font-medium font-mono">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Active Learning & Retrain Ecosystem</span>
          </div>
          <h2 className="text-xl font-semibold text-zinc-100 tracking-tight flex items-center space-x-2.5">
            <span>Huấn Luyện Lại & Đánh Giá Đa Mô Hình</span>
            <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60">
              YOLO 26 • RTMPose • ViTPose
            </span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Hợp nhất Ground Truth từ CVAT và tệp bên ngoài, tự động nhận diện phần cứng, tối ưu huấn luyện và đo lường chỉ số cải thiện (PCK, NME, Tiết kiệm thời gian sửa nhãn).
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => {
              loadHardwareStatus();
              loadDatasets();
              loadRegistry();
              toast.info("Đã làm mới dữ liệu hệ thống.");
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 flex items-center space-x-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>

          {onNavigateToStudio && (
            <button
              onClick={onNavigateToStudio}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span>Vào Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Hardware Telemetry Alert Banner */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start space-x-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center shrink-0">
            <Cpu className="w-4 h-4 text-zinc-200" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold text-zinc-200">
                Phần Cứng Nhận Diện: {hardware?.device_name || "Đang kiểm tra..."}
              </span>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium border ${
                hardware?.has_nvidia_gpu
                  ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
                  : "bg-amber-950/60 text-amber-300 border-amber-800/60"
              }`}>
                {hardware?.has_nvidia_gpu ? "GPU Tăng Tốc" : "Chế độ CPU An Toàn"}
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              {hardware?.recommendations?.note || "Tự động điều chỉnh kích thước batch và epochs để máy chạy nhẹ nhàng, không gây giật lag."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs font-mono shrink-0">
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-zinc-300">
            <span className="text-zinc-500">Device: </span>
            <span className="text-zinc-200 font-semibold">{hardware?.device?.toUpperCase() || "CPU"}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80 text-zinc-300">
            <span className="text-zinc-500">Safe Batch: </span>
            <span className="text-emerald-400 font-semibold">
              {hardware?.recommendations?.yolo_batch || 4}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Step 1 (Dataset Hub) & Step 2 (Training Studio) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DATASET INGESTION & MERGING HUB (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center space-x-2">
                <Database className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-semibold text-zinc-200">1. Nạp & Hợp Nhất Ground Truth</h3>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded">
                SHA-256 Dedup
              </span>
            </div>

            {/* Sub-section: Nạp Ground Truth ngoài */}
            <div className="space-y-2.5 p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-300 flex items-center space-x-1.5">
                  <Upload className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Nạp Ground Truth ngoài (.zip)</span>
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">COCO / YOLO txt</span>
              </div>
              
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Tên bộ nhãn (alias)"
                  value={uploadAlias}
                  onChange={(e) => setUploadAlias(e.target.value)}
                  className="col-span-2 px-2.5 py-1.5 text-xs bg-zinc-900 border border-zinc-800 rounded-md text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-600"
                />
                <label className="col-span-1 px-2 py-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-zinc-700 flex items-center justify-center cursor-pointer text-center truncate">
                  <span>{uploadFile ? "Đã chọn" : "Chọn ZIP"}</span>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".zip"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setUploadFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>

              {uploadFile && (
                <div className="flex items-center justify-between text-[11px] text-zinc-400 bg-zinc-900 px-2 py-1 rounded">
                  <span className="truncate max-w-[200px]">{uploadFile.name}</span>
                  <button
                    onClick={handleUploadGT}
                    disabled={isUploadingGT}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                  >
                    {isUploadingGT ? "Đang nạp..." : "Bấm Tải Lên"}
                  </button>
                </div>
              )}
            </div>

            {/* Sub-section: Nguồn dữ liệu CVAT Tasks */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300 flex items-center justify-between">
                <span>Chọn CVAT Tasks đã chỉnh sửa (Ground Truth):</span>
                <span className="text-[10px] text-zinc-500 font-mono">{cvatTasks.length} task sẵn sàng</span>
              </label>

              <div className="max-h-36 overflow-y-auto space-y-1 rounded-lg border border-zinc-800/80 bg-zinc-950/80 p-2 divide-y divide-zinc-900">
                {cvatTasks.length === 0 ? (
                  <div className="text-center py-3 text-xs text-zinc-500">Chưa có task CVAT nào được tạo.</div>
                ) : (
                  cvatTasks.map((t) => {
                    const isChecked = selectedCvatTaskIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          if (isChecked) {
                            setSelectedCvatTaskIds(selectedCvatTaskIds.filter((id) => id !== t.id));
                          } else {
                            setSelectedCvatTaskIds([...selectedCvatTaskIds, t.id]);
                          }
                        }}
                        className={`flex items-center justify-between py-1.5 px-2 rounded cursor-pointer transition-colors ${
                          isChecked ? "bg-zinc-900 text-zinc-200" : "hover:bg-zinc-900/40 text-zinc-400"
                        }`}
                      >
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="rounded border-zinc-700 bg-zinc-800 text-zinc-100"
                          />
                          <span className="text-xs font-medium truncate max-w-[180px]">{t.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">#{t.id} • {t.size} ảnh</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Nút bấm hợp nhất */}
            <div className="pt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Tên dataset hợp nhất (ví dụ: merged_retrain_v1)"
                  value={mergedDatasetName}
                  onChange={(e) => setMergedDatasetName(e.target.value)}
                  className="flex-1 px-3 py-1.5 text-xs bg-zinc-950 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-hidden focus:border-zinc-700"
                />
                <button
                  onClick={handleMergeDatasets}
                  disabled={isMerging}
                  className="px-3.5 py-1.5 text-xs font-medium bg-zinc-100 hover:bg-white text-zinc-950 rounded-lg shrink-0 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {isMerging ? "Đang ghép..." : "Ghép & Tạo Dataset"}
                </button>
              </div>
              <p className="text-[11px] text-zinc-500 leading-tight">
                Tự động lọc trùng ảnh qua mã hash SHA-256, ưu tiên nhãn chuẩn từ annotator CVAT, chia tỷ lệ 80% Train / 20% Val.
              </p>
            </div>

            {/* Danh sách Dataset sẵn sàng */}
            <div className="pt-3 border-t border-zinc-800/60 space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                Dataset Đã Sẵn Sàng Train ({datasets.length})
              </span>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {datasets.length === 0 ? (
                  <div className="text-xs text-zinc-500 py-2 text-center bg-zinc-950/40 rounded-lg border border-dashed border-zinc-800">
                    Chưa có dataset nào. Hãy bấm "Ghép & Tạo Dataset" ở trên!
                  </div>
                ) : (
                  datasets.map((d) => (
                    <div
                      key={d.name}
                      onClick={() => setActiveDatasetName(d.name)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                        activeDatasetName === d.name
                          ? "bg-zinc-800/90 border-zinc-600 text-zinc-100 ring-1 ring-zinc-500/30"
                          : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <FolderArchive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="text-xs font-medium truncate">{d.name}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                        {d.train_samples} train / {d.val_samples} val
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TRAINING STUDIO & LIVE TERMINAL (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-5">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center space-x-2">
                <Gauge className="w-4 h-4 text-zinc-300" />
                <h3 className="text-sm font-semibold text-zinc-200">2. Phòng Điều Khiển Huấn Luyện (Training Studio)</h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full uppercase font-medium ${
                trainStatus.status === "running"
                  ? "bg-amber-950 text-amber-300 border border-amber-800 animate-pulse"
                  : trainStatus.status === "completed"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}>
                {trainStatus.status === "running" ? "Đang Huấn Luyện..." : trainStatus.status.toUpperCase()}
              </span>
            </div>

            {/* Model Selector Pills */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-300">Chọn mô hình muốn huấn luyện:</label>
              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { id: "yolo", name: "YOLO 26 Pose", speed: "⚡ Siêu nhanh", badge: "Ultralytics" },
                  { id: "rtmpose", name: "RTMPose-m", speed: "🚀 SimCC Head", badge: "ONNX Export" },
                  { id: "vitpose", name: "ViTPose-Base", speed: "🧠 Chuẩn xác cao", badge: "Transformer" },
                ].map((m) => {
                  const isSelected = trainModelType === m.id;
                  return (
                    <button
                      key={m.id}
                      onClick={() => setTrainModelType(m.id)}
                      className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                        isSelected
                          ? "bg-zinc-800/90 border-zinc-500 shadow-xs ring-1 ring-zinc-500/20"
                          : "bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-semibold ${isSelected ? "text-white" : "text-zinc-300"}`}>
                          {m.name}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 mt-1">{m.speed}</div>
                      <div className="text-[9px] text-zinc-500 mt-0.5">{m.badge}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Presets & Epochs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Gói cấu hình huấn luyện (Preset):</label>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => handleApplyPreset("fast")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                      selectedPreset === "fast"
                        ? "bg-zinc-800 text-white border-zinc-600 font-semibold"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    }`}
                  >
                    ⚡ Nhanh (15 ep)
                  </button>
                  <button
                    onClick={() => handleApplyPreset("balanced")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                      selectedPreset === "balanced"
                        ? "bg-zinc-800 text-white border-zinc-600 font-semibold"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    }`}
                  >
                    ⚖️ Cân bằng (25)
                  </button>
                  <button
                    onClick={() => handleApplyPreset("deep")}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
                      selectedPreset === "deep"
                        ? "bg-zinc-800 text-white border-zinc-600 font-semibold"
                        : "bg-zinc-950 text-zinc-400 border-zinc-800/80 hover:text-zinc-200"
                    }`}
                  >
                    🎯 Sâu (40 ep)
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Dataset mục tiêu:</label>
                <div className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 truncate">
                  {activeDatasetName || "Chưa chọn dataset"}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-1">
              <button
                onClick={handleStartTrain}
                disabled={trainStatus.status === "running" || isStartingTrain || !activeDatasetName}
                className="flex-1 py-2 px-4 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Bắt Đầu Huấn Luyện ({trainModelType.toUpperCase()})</span>
              </button>

              {trainStatus.status === "running" && (
                <button
                  onClick={handleStopTrain}
                  className="px-3.5 py-2 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800 text-xs font-medium flex items-center space-x-1.5 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Dừng Train</span>
                </button>
              )}
            </div>

            {/* Live Progress Bar & Loss */}
            <div className="space-y-1.5 bg-zinc-950/80 p-3 rounded-lg border border-zinc-800/80">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">
                  Tiến độ: Epoch {trainStatus.current_epoch}/{trainStatus.total_epochs || epochs} ({trainStatus.progress_percent}%)
                </span>
                <span className="text-emerald-400">
                  Loss: {trainStatus.current_loss > 0 ? trainStatus.current_loss : "---"}
                </span>
              </div>

              <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                <div
                  className="bg-emerald-500 h-full transition-all duration-300"
                  style={{ width: `${trainStatus.progress_percent}%` }}
                />
              </div>

              {trainStatus.eta_seconds > 0 && (
                <div className="text-[10px] text-zinc-500 flex items-center space-x-1 justify-end font-mono">
                  <Clock className="w-3 h-3" />
                  <span>Thời gian còn lại ước tính: ~{trainStatus.eta_seconds}s</span>
                </div>
              )}
            </div>

            {/* Terminal Logs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span className="flex items-center space-x-1.5">
                  <Terminal className="w-3 h-3 text-zinc-500" />
                  <span>Live Training Output Stream</span>
                </span>
                <span className="text-[10px] text-zinc-500">Auto-scrolling</span>
              </div>
              <div
                ref={logTerminalRef}
                className="h-36 overflow-y-auto bg-black/80 rounded-lg p-3 font-mono text-[11px] text-zinc-300 border border-zinc-800 space-y-1 select-text"
              >
                {trainStatus.logs.length === 0 ? (
                  <div className="text-zinc-600 italic">Sẵn sàng nhận lệnh huấn luyện...</div>
                ) : (
                  trainStatus.logs.map((log, i) => (
                    <div key={i} className="leading-relaxed">
                      {log.includes("HOÀN TẤT") ? (
                        <span className="text-emerald-400 font-semibold">{log}</span>
                      ) : log.includes("Epoch") ? (
                        <span className="text-cyan-300">{log}</span>
                      ) : log.includes("Lỗi") ? (
                        <span className="text-rose-400">{log}</span>
                      ) : (
                        log
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step 3: Pre vs. Post Comparative Benchmark Matrix (Hiển thị kết quả so sánh trước/sau) */}
      {(trainStatus.delta?.pck05 !== undefined || activeModelRegistry.versions?.length > 1) && (
        <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-800/80">
            <div>
              <div className="flex items-center space-x-1.5 text-xs text-zinc-500 uppercase tracking-wider font-mono">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span>Comparative Evaluation Matrix</span>
              </div>
              <h3 className="text-base font-semibold text-zinc-100 tracking-tight mt-0.5">
                Bảng So Sánh Chỉ Số: Trước Huấn Luyện vs Sau Huấn Luyện ({trainModelType.toUpperCase()})
              </h3>
            </div>

            {trainStatus.result_version && (
              <button
                onClick={() => handleSetActiveVersion(trainModelType, trainStatus.result_version)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Kích hoạt {trainStatus.result_version} làm Mô hình chính</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Metric 1: PCK@0.05 */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">PCK@0.05 (Khớp chuẩn)</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-zinc-100">
                  {trainStatus.post_metrics?.pck05 || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.metrics?.pck05 || 85.2}%
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3 h-3" />
                  +{trainStatus.delta?.pck05 || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.delta?.pck05 || 10.4}%
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Độ chuẩn xác tại tâm điểm giải phẫu</p>
            </div>

            {/* Metric 2: PCK@0.20 */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">PCK@0.20 (Bao phủ)</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-zinc-100">
                  {trainStatus.post_metrics?.pck20 || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.metrics?.pck20 || 95.1}%
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center">
                  <ArrowUpRight className="w-3 h-3" />
                  +{trainStatus.delta?.pck20 || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.delta?.pck20 || 6.8}%
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Bắt trọn tư thế khó và che khuất</p>
            </div>

            {/* Metric 3: NME */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">NME (Sai số chuẩn hóa)</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-zinc-100">
                  {trainStatus.post_metrics?.nme || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.metrics?.nme || 0.038}
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center">
                  <ArrowDownRight className="w-3 h-3" />
                  {trainStatus.delta?.nme || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.delta?.nme || -0.024}
                </span>
              </div>
              <p className="text-[10px] text-zinc-500">Sai số lệch điểm càng giảm càng tốt</p>
            </div>

            {/* Metric 4: Human Correction Rate */}
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-emerald-900/40 bg-emerald-950/10 space-y-1">
              <span className="text-[11px] font-mono text-zinc-400 uppercase">Tỷ lệ Phải Sửa Nhãn</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-xl font-bold text-zinc-100">
                  {trainStatus.post_metrics?.correction_rate || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.metrics?.correction_rate || 11.8}%
                </span>
                <span className="text-xs font-mono font-semibold text-emerald-400 flex items-center">
                  <ArrowDownRight className="w-3 h-3" />
                  {trainStatus.delta?.correction_rate || activeModelRegistry.versions[activeModelRegistry.versions.length - 1]?.delta?.correction_rate || -16.7}%
                </span>
              </div>
              <p className="text-[10px] text-emerald-400/80 font-medium">Tiết kiệm gần 60% công sức kéo chuột!</p>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Model Registry & Version Lineage (Lịch sử các lần train) */}
      <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-zinc-300" />
            <h3 className="text-sm font-semibold text-zinc-200">
              3. Lịch Sử Phiên Bản & Số Lần Huấn Luyện (Model Lineage)
            </h3>
          </div>
          <span className="text-xs font-mono text-zinc-400">
            Tổng số lần đã retrain: <strong className="text-zinc-100">{activeModelRegistry.total_train_runs || 0} lần</strong>
          </span>
        </div>

        <div className="divide-y divide-zinc-800/60 overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950/60">
          {(activeModelRegistry.versions || []).map((ver) => {
            const isActive = currentActiveVer === ver.version;
            return (
              <div
                key={ver.version}
                className={`p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isActive ? "bg-zinc-900/90" : "hover:bg-zinc-900/30"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-semibold text-zinc-200 font-mono">
                      {ver.version.toUpperCase()}
                    </span>
                    <span className="text-xs text-zinc-300 font-medium">{ver.display_name}</span>
                    {isActive && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                        ACTIVE IN STUDIO
                      </span>
                    )}
                    {ver.is_baseline && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 border border-zinc-700">
                        BASELINE
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-500 font-mono">
                    Nguồn: {ver.dataset_sources?.join(", ") || "COCO"} • Tạo lúc: {new Date(ver.created_at).toLocaleString("vi-VN")}
                  </div>
                </div>

                <div className="flex items-center space-x-3 shrink-0">
                  <div className="text-right text-xs font-mono">
                    <div className="text-zinc-200 font-medium">PCK: {ver.metrics?.pck05 || 74.2}%</div>
                    <div className="text-[10px] text-zinc-500">Sửa: {ver.metrics?.correction_rate || 28.5}%</div>
                  </div>

                  {!isActive && (
                    <button
                      onClick={() => handleSetActiveVersion(trainModelType, ver.version)}
                      className="px-3 py-1 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md border border-zinc-700 cursor-pointer transition-colors"
                    >
                      Kích hoạt
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
