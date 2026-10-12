import React, { useState, useEffect } from "react";
import { Upload, Play, Sliders, Image as ImageIcon, CheckCircle, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import SkeletonCanvas from "../components/canvas/SkeletonCanvas";
import { api } from "../services/api";

export default function StudioView({ onNavigateToCVAT, viewTaskId, onClearViewTask }) {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [skeletonEdges, setSkeletonEdges] = useState([]);
  const [confThreshold, setConfThreshold] = useState(0.5);
  const [kptConfThreshold, setKptConfThreshold] = useState(0.5);
  const [isUploading, setIsUploading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // CVAT 2-way Sync state
  const [cvatTasks, setCvatTasks] = useState([]);
  const [selectedCvatTaskId, setSelectedCvatTaskId] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [viewingTaskName, setViewingTaskName] = useState("");

  // Tải cấu hình và danh sách ảnh khi khởi tạo
  useEffect(() => {
    loadConfig();
    fetchImages();
    fetchCvatTasks();
  }, []);

  // Auto-pull khi nhận viewTaskId từ CVAT Hub (nút "Xem Web")
  useEffect(() => {
    if (viewTaskId) {
      // Tìm tên task trong danh sách
      const task = cvatTasks.find(t => t.id === viewTaskId);
      if (task) {
        setViewingTaskName(task.name);
      } else {
        setViewingTaskName(`Task #${viewTaskId}`);
      }
      setSelectedCvatTaskId(viewTaskId);
      // Auto-pull annotations
      autoPullTask(viewTaskId);
    }
  }, [viewTaskId]);

  const autoPullTask = async (taskId) => {
    setIsPulling(true);
    setStatusMsg(`Đang tải nhãn từ CVAT Task #${taskId} để xem trên Web...`);
    try {
      const res = await api.pullFromCVAT(taskId);
      if (res && res.updated_images) {
        const newMap = { ...predictionsMap };
        res.updated_images.forEach((item) => {
          newMap[item.image_name] = item.predictions;
        });
        setPredictionsMap(newMap);
        setStatusMsg(res.message || `Đã tải nhãn từ CVAT Task #${taskId}!`);
        await fetchImages();
      }
    } catch (err) {
      setStatusMsg("Lỗi khi tải nhãn từ CVAT: " + err.message);
    } finally {
      setIsPulling(false);
      if (onClearViewTask) onClearViewTask();
      setTimeout(() => setStatusMsg(""), 5000);
    }
  };

  const fetchCvatTasks = async () => {
    try {
      const res = await api.listCVATTasks();
      if (res && res.tasks && res.tasks.length > 0) {
        setCvatTasks(res.tasks);
        setSelectedCvatTaskId(res.tasks[0].id);
      }
    } catch (err) {
      console.error("Error fetching CVAT tasks:", err);
    }
  };

  const loadConfig = async () => {
    try {
      const cfg = await api.getConfig();
      if (cfg.skeleton_edges) setSkeletonEdges(cfg.skeleton_edges);
      if (cfg.default_conf) setConfThreshold(cfg.default_conf);
      if (cfg.default_kpt_conf) setKptConfThreshold(cfg.default_kpt_conf);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchImages = async () => {
    try {
      const res = await api.listImages();
      setImages(res.images || []);
      if (res.images && res.images.length > 0 && !selectedImage) {
        setSelectedImage(res.images[0]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tự động tải prediction của ảnh được chọn nếu chưa có trong map
  useEffect(() => {
    if (selectedImage && !predictionsMap[selectedImage.name] && selectedImage.has_prediction) {
      api.getImagePrediction(selectedImage.name)
        .then((data) => {
          if (data && data.predictions) {
            setPredictionsMap((prev) => ({
              ...prev,
              [selectedImage.name]: data.predictions,
            }));
          }
        })
        .catch((err) => console.error("Error loading cached prediction:", err));
    }
  }, [selectedImage]);

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    setStatusMsg("Đang tải ảnh lên server...");
    try {
      await api.uploadImages(files);
      setStatusMsg("Tải ảnh hoàn tất!");
      await fetchImages();
    } catch (err) {
      setStatusMsg("Lỗi khi upload ảnh.");
    } finally {
      setIsUploading(false);
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  const handleRunPredict = async () => {
    if (images.length === 0) {
      alert("Vui lòng tải lên ít nhất 1 ảnh trước khi chạy pre-label.");
      return;
    }

    setIsPredicting(true);
    setStatusMsg("Mô hình YOLO 26 đang xử lý suy luận 17 keypoints...");
    try {
      const res = await api.predict({
        conf_threshold: confThreshold,
        kpt_conf_threshold: kptConfThreshold,
      });

      const newMap = {};
      res.results.forEach((r) => {
        newMap[r.image_name] = r.predictions;
      });
      setPredictionsMap(newMap);
      setStatusMsg(`Đã dự đoán xong ${res.total_images} ảnh!`);
      await fetchImages();
    } catch (err) {
      setStatusMsg("Lỗi khi chạy dự đoán YOLO 26.");
    } finally {
      setIsPredicting(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handlePullFromCVAT = async () => {
    if (!selectedCvatTaskId) {
      alert("Vui lòng chọn hoặc nhập Task ID của CVAT để kéo nhãn.");
      return;
    }
    setIsPulling(true);
    setStatusMsg(`Đang kéo nhãn đã sửa từ CVAT Task #${selectedCvatTaskId}...`);
    try {
      const res = await api.pullFromCVAT(selectedCvatTaskId);
      if (res && res.updated_images) {
        const newMap = { ...predictionsMap };
        res.updated_images.forEach((item) => {
          newMap[item.image_name] = item.predictions;
        });
        setPredictionsMap(newMap);
        setStatusMsg(res.message || "Cập nhật nhãn từ CVAT thành công!");
        await fetchImages();
      }
    } catch (err) {
      setStatusMsg("Lỗi khi kéo nhãn từ CVAT: " + err.message);
    } finally {
      setIsPulling(false);
      setTimeout(() => setStatusMsg(""), 5000);
    }
  };

  const currentIndex = images.findIndex((img) => img.name === selectedImage?.name);
  const handlePrevImage = () => {
    if (currentIndex > 0) {
      setSelectedImage(images[currentIndex - 1]);
    }
  };
  const handleNextImage = () => {
    if (currentIndex < images.length - 1) {
      setSelectedImage(images[currentIndex + 1]);
    }
  };

  const currentPredictions = selectedImage ? predictionsMap[selectedImage.name] || [] : [];
  const currentImageUrl = selectedImage ? `http://localhost:8000${selectedImage.url}` : "";

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-7rem)]">
      {/* CỘT TRÁI: Settings & Upload Gallery (35% - 4 cols) - Hỗ trợ scroll mượt mà không bị cắt */}
      <div className="col-span-12 lg:col-span-4 flex flex-col space-y-3.5 h-full overflow-y-auto pr-1.5 custom-scrollbar">
        {/* Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Tải ảnh lên (Upload)</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">{images.length} ảnh</span>
          </div>

          <label className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-xl py-3 px-4 flex items-center justify-center space-x-3 cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-800/30">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <Upload className="w-5 h-5 text-slate-400" />
            )}
            <div className="flex flex-col">
              <span className="text-xs font-medium text-slate-300">Click hoặc kéo thả ảnh vào đây</span>
              <span className="text-[10px] text-slate-500">JPG, PNG, WEBP</span>
            </div>
          </label>
        </div>

        {/* Sliders Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm space-y-2.5">
          <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ngưỡng tin cậy (Confidence)</span>
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
              onChange={(e) => setConfThreshold(parseFloat(e.target.value))}
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
              onChange={(e) => setKptConfThreshold(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
          </div>

          {/* Action Button: Run Pre-label */}
          <button
            onClick={handleRunPredict}
            disabled={isPredicting || images.length === 0}
            className="w-full mt-1 py-2 px-3 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isPredicting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang suy luận YOLO 26...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Chạy Pre-label với YOLO 26</span>
              </>
            )}
          </button>
        </div>

        {/* CVAT 2-Way Pull Card */}
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
                onChange={(e) => setSelectedCvatTaskId(e.target.value)}
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
              onClick={handlePullFromCVAT}
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

        {/* Status Message Banner */}
        {statusMsg && (
          <div className="p-2.5 rounded-xl text-xs bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 flex items-center space-x-2 animate-fadeIn">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{statusMsg}</span>
          </div>
        )}

        {/* Viewing Task Banner */}
        {viewingTaskName && (
          <div className="p-2.5 rounded-xl text-xs bg-violet-950/60 border border-violet-500/40 text-violet-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span>Đang xem nhãn của: <span className="font-semibold text-violet-300">{viewingTaskName}</span></span>
            </div>
            <button
              onClick={() => setViewingTaskName("")}
              className="text-[10px] text-violet-400 hover:text-violet-200 underline cursor-pointer"
            >
              Ẩn
            </button>
          </div>
        )}

        {/* Thumbnail Gallery */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-col min-h-[220px]">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
            <span>Danh sách ảnh đã tải:</span>
            <span className="text-[11px] text-slate-400 font-mono">{images.length} ảnh</span>
          </div>
          <div className="max-h-[240px] overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {images.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">Chưa có ảnh nào được tải lên.</div>
            ) : (
              images.map((img) => {
                const isSelected = selectedImage?.name === img.name;
                const hasPred = img.has_prediction || predictionsMap[img.name];
                return (
                  <div
                    key={img.name}
                    onClick={() => setSelectedImage(img)}
                    className={`flex items-center justify-between p-2 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-sm"
                        : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                      <span className="text-xs truncate">{img.name}</span>
                    </div>
                    {hasPred && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 shrink-0 font-medium">
                        <CheckCircle className="w-2.5 h-2.5" />
                        <span>Pre-labeled</span>
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick jump to CVAT */}
          <button
            onClick={onNavigateToCVAT}
            className="mt-3 w-full py-2 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition-colors cursor-pointer"
          >
            <span>Đồng bộ sang CVAT Local</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* CỘT PHẢI: Inspection Canvas (65% - 8 cols) */}
      <div className="col-span-12 lg:col-span-8 h-full">
        <SkeletonCanvas
          imageSrc={currentImageUrl}
          predictions={currentPredictions}
          skeletonEdges={skeletonEdges}
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < images.length - 1}
          imageIndex={currentIndex >= 0 ? currentIndex : 0}
          totalImages={images.length}
        />
      </div>
    </div>
  );
}

