import React, { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, PlusCircle, RefreshCw, Loader2 } from "lucide-react";
import SkeletonCanvas from "../components/canvas/SkeletonCanvas";
import ModelSelector from "../components/studio/ModelSelector";
import ConfidenceControls from "../components/studio/ConfidenceControls";
import UploadCard from "../components/studio/UploadCard";
import CVATSyncCard from "../components/studio/CVATSyncCard";
import ImageGallery from "../components/studio/ImageGallery";
import { api } from "../services/api";

export default function StudioView({
  onNavigateToCVAT,
  viewTaskId,
  onClearViewTask,
  selectedModelType = "yolo",
  onSelectModelType,
  availableModels = [],
}) {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [skeletonEdges, setSkeletonEdges] = useState([]);
  const [confThreshold, setConfThreshold] = useState(0.5);
  const [kptConfThreshold, setKptConfThreshold] = useState(0.5);
  const [isUploading, setIsUploading] = useState(false);
  const [isPredictingSingle, setIsPredictingSingle] = useState(false);
  const [isPredictingAll, setIsPredictingAll] = useState(false);
  const isPredicting = isPredictingSingle || isPredictingAll;
  const [statusMsg, setStatusMsg] = useState("");
  const [modelMetaMap, setModelMetaMap] = useState({});

  // CVAT 2-way Sync state
  const [cvatTasks, setCvatTasks] = useState([]);
  const [selectedCvatTaskId, setSelectedCvatTaskId] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [viewingTaskName, setViewingTaskName] = useState("");

  // New Batch / Reset Workspace state
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Khởi tạo cấu hình và danh sách ảnh
  useEffect(() => {
    loadConfig();
    fetchImages();
    fetchCvatTasks();
  }, []);

  // Auto-pull khi nhận viewTaskId từ CVAT Hub (nút "Xem Web")
  useEffect(() => {
    if (viewTaskId) {
      const task = cvatTasks.find((t) => t.id === viewTaskId);
      if (task) {
        setViewingTaskName(task.name);
      } else {
        setViewingTaskName(`Task #${viewTaskId}`);
      }
      setSelectedCvatTaskId(viewTaskId);
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
        if (res.images && res.images.length > 0) {
          setImages(res.images);
          setSelectedImage(res.images[0]);
        } else {
          await fetchImages();
        }
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
            if (data.model_name) {
              setModelMetaMap((prev) => ({
                ...prev,
                [selectedImage.name]: data.model_name,
              }));
            }
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

  // 1-Click Fast Run trên ảnh hiện tại (~35ms)
  const handleRunPredictSingle = async () => {
    if (!selectedImage) return;

    const curModel = availableModels.find((m) => m.id === selectedModelType) || availableModels[0] || { name: "AI Pose" };
    setIsPredictingSingle(true);
    setStatusMsg(`Mô hình ${curModel.name} đang suy luận ảnh ${selectedImage.name}...`);
    try {
      const res = await api.predict({
        image_names: [selectedImage.name],
        conf_threshold: confThreshold,
        kpt_conf_threshold: kptConfThreshold,
        model_type: selectedModelType,
      });

      if (res && res.results && res.results.length > 0) {
        const item = res.results[0];
        setPredictionsMap((prev) => ({
          ...prev,
          [selectedImage.name]: item.predictions,
        }));
        setModelMetaMap((prev) => ({
          ...prev,
          [selectedImage.name]: item.model_name || curModel.name,
        }));
        setSelectedImage((prev) => (prev ? { ...prev, has_prediction: true } : prev));
        setStatusMsg(`Đã cập nhật dự đoán ${curModel.name} cho ảnh hiện tại!`);
      }
    } catch (err) {
      setStatusMsg(`Lỗi khi chạy ${curModel.name}: ` + err.message);
    } finally {
      setIsPredictingSingle(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  // Chạy toàn bộ bộ ảnh hiện có
  const handleRunPredictAll = async () => {
    if (images.length === 0) {
      alert("Vui lòng tải lên ít nhất 1 ảnh trước khi chạy pre-label.");
      return;
    }

    const curModel = availableModels.find((m) => m.id === selectedModelType) || availableModels[0] || { name: "AI Pose" };
    setIsPredictingAll(true);
    setStatusMsg(`Mô hình ${curModel.name} đang xử lý suy luận toàn bộ ${images.length} ảnh...`);
    try {
      const res = await api.predict({
        conf_threshold: confThreshold,
        kpt_conf_threshold: kptConfThreshold,
        model_type: selectedModelType,
      });

      const newMap = { ...predictionsMap };
      const newMetaMap = { ...modelMetaMap };
      res.results.forEach((r) => {
        newMap[r.image_name] = r.predictions;
        newMetaMap[r.image_name] = r.model_name || curModel.name;
      });
      setPredictionsMap(newMap);
      setModelMetaMap(newMetaMap);
      setStatusMsg(`Đã dự đoán xong ${res.total_images} ảnh bằng ${curModel.name}!`);
      await fetchImages();
    } catch (err) {
      setStatusMsg(`Lỗi khi chạy dự đoán ${curModel.name}: ` + err.message);
    } finally {
      setIsPredictingAll(false);
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
        if (res.images && res.images.length > 0) {
          setImages(res.images);
          setSelectedImage(res.images[0]);
        } else {
          await fetchImages();
        }
      }
    } catch (err) {
      setStatusMsg("Lỗi khi kéo nhãn từ CVAT: " + err.message);
    } finally {
      setIsPulling(false);
      setTimeout(() => setStatusMsg(""), 5000);
    }
  };

  const handleResetWorkspace = async () => {
    setIsResetting(true);
    try {
      const currentTask = cvatTasks.find((t) => String(t.id) === String(selectedCvatTaskId));
      const effectiveTaskName = viewingTaskName || (currentTask ? currentTask.name : "");
      const res = await api.resetWorkspace({
        is_viewing_task: Boolean(viewingTaskName),
        task_name: effectiveTaskName,
        task_id: selectedCvatTaskId ? parseInt(selectedCvatTaskId, 10) : null,
      });
      setImages([]);
      setSelectedImage(null);
      setPredictionsMap({});
      setViewingTaskName("");
      setStatusMsg(res.message || "Đã làm sạch không gian làm việc. Sẵn sàng tải bộ ảnh mới!");
      setShowResetModal(false);
    } catch (err) {
      alert("Lỗi khi dọn dẹp không gian làm việc: " + err.message);
    } finally {
      setIsResetting(false);
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
  const currentActiveModelName =
    selectedImage && modelMetaMap[selectedImage.name]
      ? modelMetaMap[selectedImage.name]
      : availableModels.find((m) => m.id === selectedModelType)?.name || "YOLO 26 Pose";

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-7rem)]">
      {/* CỘT TRÁI: Settings & Controls (Modularized - 4 cols) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col space-y-3.5 h-full overflow-y-auto pr-1.5 custom-scrollbar">
        {/* Upload Card */}
        <UploadCard
          imagesCount={images.length}
          onUpload={handleFileUpload}
          isUploading={isUploading}
          onOpenResetModal={() => setShowResetModal(true)}
        />

        {/* Model Architecture Selector Card */}
        <ModelSelector
          availableModels={availableModels}
          selectedModelType={selectedModelType}
          onSelectModelType={onSelectModelType}
          disabled={isPredicting}
        />

        {/* Confidence Sliders & Dual Action Buttons */}
        <ConfidenceControls
          confThreshold={confThreshold}
          onChangeConfThreshold={setConfThreshold}
          kptConfThreshold={kptConfThreshold}
          onChangeKptConfThreshold={setKptConfThreshold}
          onRunPredictSingle={handleRunPredictSingle}
          onRunPredictAll={handleRunPredictAll}
          isPredictingSingle={isPredictingSingle}
          isPredictingAll={isPredictingAll}
          hasImages={images.length > 0}
          hasSelectedImage={Boolean(selectedImage)}
          imagesCount={images.length}
          activeModelName={availableModels.find((m) => m.id === selectedModelType)?.name || "AI Pose"}
        />

        {/* CVAT 2-Way Pull Card */}
        <CVATSyncCard
          cvatTasks={cvatTasks}
          selectedCvatTaskId={selectedCvatTaskId}
          onSelectTaskId={setSelectedCvatTaskId}
          onPullFromCVAT={handlePullFromCVAT}
          isPulling={isPulling}
        />

        {/* Status Message Banner */}
        {statusMsg && (
          <div className="p-2.5 rounded-xl text-xs bg-cyan-950/70 border border-cyan-500/40 text-cyan-200 flex items-center space-x-2 animate-fadeIn shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{statusMsg}</span>
          </div>
        )}

        {/* Viewing Task Banner */}
        {viewingTaskName && (
          <div className="p-3 rounded-xl text-xs bg-gradient-to-r from-violet-950/80 to-indigo-950/70 border border-violet-500/40 text-violet-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-sm shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <RefreshCw className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <div className="truncate">
                Đang xem nhãn: <span className="font-semibold text-violet-300 font-mono">{viewingTaskName}</span>
                {images.length > 0 && <span className="text-[11px] text-violet-400 ml-1.5">({images.length} ảnh)</span>}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer flex items-center space-x-1"
                title="Quay lại không gian làm việc sạch để tải ảnh mới"
              >
                <PlusCircle className="w-3 h-3 text-rose-400" />
                <span>Quay về đợt mới</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingTaskName("")}
                className="text-[11px] text-violet-400 hover:text-violet-200 cursor-pointer"
              >
                Ẩn
              </button>
            </div>
          </div>
        )}

        {/* Thumbnail Gallery */}
        <ImageGallery
          images={images}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          predictionsMap={predictionsMap}
          onOpenResetModal={() => setShowResetModal(true)}
          onNavigateToCVAT={onNavigateToCVAT}
        />
      </div>

      {/* CỘT PHẢI: Inspection Canvas (65% - 8 cols) */}
      <div className="col-span-12 lg:col-span-8 h-full">
        <SkeletonCanvas
          imageSrc={currentImageUrl}
          predictions={currentPredictions}
          skeletonEdges={skeletonEdges}
          currentModelName={currentActiveModelName}
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < images.length - 1}
          imageIndex={currentIndex >= 0 ? currentIndex : 0}
          totalImages={images.length}
        />

      </div>

      {/* Modal xác nhận Bắt đầu đợt gán nhãn mới */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3.5">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-slate-100">
                  Bắt đầu đợt gán nhãn mới (New Batch)?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Toàn bộ <span className="text-rose-300 font-semibold">{images.length} ảnh</span> và nhãn tạm thời trên Web Studio sẽ được <span className="text-slate-200 font-medium">sao lưu tự động</span> vào thư mục <code className="text-[11px] bg-slate-950 px-1 py-0.5 rounded text-cyan-400">data/archives</code> và dọn sạch không gian làm việc để sẵn sàng nạp bộ ảnh mới.
                </p>
                <p className="text-[11px] text-emerald-400 pt-1">
                  ✓ Các Task bạn đã tạo hoặc sửa trên CVAT Local hoàn toàn được lưu giữ an toàn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetWorkspace}
                disabled={isResetting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 shadow-md shadow-rose-900/30 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang dọn dẹp...</span>
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Xác nhận tạo đợt mới</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
