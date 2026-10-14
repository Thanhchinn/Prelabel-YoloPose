import React, { useState, useEffect } from "react";
import { CheckCircle, AlertTriangle, PlusCircle, RefreshCw, Loader2 } from "lucide-react";
import SkeletonCanvas from "../components/canvas/SkeletonCanvas";
import ModelSelector from "../components/studio/ModelSelector";
import ConfidenceControls from "../components/studio/ConfidenceControls";
import UploadCard from "../components/studio/UploadCard";
import CVATSyncCard from "../components/studio/CVATSyncCard";
import ImageGallery from "../components/studio/ImageGallery";
import { api } from "../services/api";
import { toast } from "../components/ui";

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

  useEffect(() => {
    loadConfig();
    fetchImages();
    fetchCvatTasks();
  }, []);

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
      toast.success("Tải ảnh lên thành công", {
        description: `Đã nạp ${files.length} ảnh vào không gian làm việc.`,
        metadata: [{ label: "Số lượng", value: `${files.length} ảnh` }],
      });
      await fetchImages();
    } catch (err) {
      setStatusMsg("Lỗi khi upload ảnh.");
      toast.error("Tải ảnh thất bại", {
        description: err.message || "Không thể tải ảnh lên máy chủ.",
      });
    } finally {
      setIsUploading(false);
      setTimeout(() => setStatusMsg(""), 3000);
    }
  };

  const handleRunPredictSingle = async () => {
    if (!selectedImage) return;

    const curModel = availableModels.find((m) => m.id === selectedModelType) || availableModels[0] || { name: "AI Pose" };
    const modelDisplayName = curModel.active_version && curModel.active_version !== "v0_base"
      ? `${curModel.name} (${curModel.active_version})`
      : curModel.name;

    setIsPredictingSingle(true);
    setStatusMsg(`Mô hình ${modelDisplayName} đang suy luận ảnh ${selectedImage.name}...`);
    try {
      const res = await api.predict({
        image_names: [selectedImage.name],
        conf_threshold: confThreshold,
        kpt_conf_threshold: kptConfThreshold,
        model_type: selectedModelType,
      });

      if (res && res.results && res.results.length > 0) {
        const item = res.results[0];
        const resModelName = item.model_name || modelDisplayName;
        setPredictionsMap((prev) => ({
          ...prev,
          [selectedImage.name]: item.predictions,
        }));
        setModelMetaMap((prev) => ({
          ...prev,
          [selectedImage.name]: resModelName,
        }));
        setSelectedImage((prev) => (prev ? { ...prev, has_prediction: true } : prev));
        setStatusMsg(`Đã cập nhật dự đoán ${resModelName} cho ảnh hiện tại!`);
        toast.success("Suy luận hoàn tất", {
          description: `Đã nhận diện ${item.predictions?.length || 0} đối tượng bằng ${resModelName}.`,
          metadata: [
            { label: "Model", value: resModelName },
            { label: "Ảnh", value: selectedImage.name },
            { label: "Đối tượng", value: `${item.predictions?.length || 0}` },
          ],
        });
      }
    } catch (err) {
      setStatusMsg(`Lỗi khi chạy ${modelDisplayName}: ` + err.message);
      toast.error(`Lỗi suy luận ${modelDisplayName}`, {
        description: err.message,
      });
    } finally {
      setIsPredictingSingle(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handleRunPredictAll = async () => {
    if (images.length === 0) {
      toast.warning("Chưa có ảnh trong album", {
        description: "Vui lòng tải lên ít nhất 1 ảnh trước khi chạy pre-label hàng loạt.",
      });
      return;
    }

    const curModel = availableModels.find((m) => m.id === selectedModelType) || availableModels[0] || { name: "AI Pose" };
    const modelDisplayName = curModel.active_version && curModel.active_version !== "v0_base"
      ? `${curModel.name} (${curModel.active_version})`
      : curModel.name;

    setIsPredictingAll(true);
    setStatusMsg(`Mô hình ${modelDisplayName} đang xử lý suy luận toàn bộ ${images.length} ảnh...`);
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
        newMetaMap[r.image_name] = r.model_name || modelDisplayName;
      });
      setPredictionsMap(newMap);
      setModelMetaMap(newMetaMap);
      setStatusMsg(`Đã dự đoán xong ${res.total_images} ảnh bằng ${modelDisplayName}!`);
      toast.success("Pre-label hàng loạt hoàn tất", {
        description: `Đã suy luận xong toàn bộ ${res.total_images} ảnh bằng mô hình ${modelDisplayName}.`,
        metadata: [
          { label: "Model", value: modelDisplayName },
          { label: "Tổng số", value: `${res.total_images} ảnh` },
        ],
      });
      await fetchImages();
    } catch (err) {
      setStatusMsg(`Lỗi khi chạy dự đoán ${curModel.name}: ` + err.message);
      toast.error(`Lỗi suy luận hàng loạt ${curModel.name}`, {
        description: err.message,
      });
    } finally {
      setIsPredictingAll(false);
      setTimeout(() => setStatusMsg(""), 4000);
    }
  };

  const handlePullFromCVAT = async () => {
    if (!selectedCvatTaskId) {
      toast.warning("Chưa chọn Task CVAT", {
        description: "Vui lòng chọn hoặc nhập Task ID của CVAT để kéo nhãn.",
      });
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
        toast.success("Đồng bộ nhãn từ CVAT thành công", {
          description: res.message || "Đã kéo tọa độ và cờ nhãn đã sửa trên CVAT về Web Studio.",
          metadata: [
            { label: "Task", value: `#${selectedCvatTaskId}` },
            { label: "Số ảnh", value: `${res.updated_images.length}` },
          ],
        });
        if (res.images && res.images.length > 0) {
          setImages(res.images);
          setSelectedImage(res.images[0]);
        } else {
          await fetchImages();
        }
      }
    } catch (err) {
      setStatusMsg("Lỗi khi kéo nhãn từ CVAT: " + err.message);
      toast.error("Kéo nhãn CVAT thất bại", {
        description: err.message,
      });
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
      toast.info("Đã làm sạch không gian làm việc", {
        description: "Sẵn sàng tải bộ ảnh mới cho phiên làm việc tiếp theo.",
      });
      setShowResetModal(false);
    } catch (err) {
      toast.error("Lỗi khi dọn dẹp không gian làm việc", {
        description: err.message,
      });
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
  const curActiveModel = availableModels.find((m) => m.id === selectedModelType);
  const curModelLabel = curActiveModel?.active_version && curActiveModel.active_version !== "v0_base"
    ? `${curActiveModel.name} (${curActiveModel.active_version})`
    : (curActiveModel?.name || "YOLO 26 Pose");

  const currentActiveModelName =
    selectedImage && modelMetaMap[selectedImage.name]
      ? modelMetaMap[selectedImage.name]
      : curModelLabel;

  // Thống kê thời gian thực theo ngưỡng tin cậy để phản hồi tức thì 60fps
  const detectedPersons = currentPredictions.filter(
    (p) => (p.score ?? 0.9) >= confThreshold
  );
  const primaryPerson = detectedPersons[0] || currentPredictions[0];
  const totalKpts = primaryPerson?.keypoints?.length || 17;
  const visibleKpts = primaryPerson?.keypoints
    ? primaryPerson.keypoints.filter((k) => {
        const conf = k.conf !== undefined ? k.conf : (k.score !== undefined ? k.score : 1.0);
        return conf >= kptConfThreshold && k.visible > 0;
      }).length
    : 0;

  const kptStats = { visible: visibleKpts, total: totalKpts };
  const bboxStats = { visible: detectedPersons.length, total: currentPredictions.length };

  return (
    <div className="grid grid-cols-12 gap-5 h-[calc(100vh-6.5rem)]">
      {/* CỘT TRÁI: Settings & Controls (4 cols) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col space-y-3 h-full overflow-y-auto pr-1">
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
          kptStats={kptStats}
          bboxStats={bboxStats}
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
          <div className="p-2.5 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center space-x-2 shrink-0">
            <CheckCircle className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{statusMsg}</span>
          </div>
        )}

        {/* Viewing Task Banner */}
        {viewingTaskName && (
          <div className="p-2.5 rounded-lg text-xs bg-zinc-900 border border-zinc-800 text-zinc-300 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <div className="flex items-center space-x-2 min-w-0">
              <RefreshCw className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <div className="truncate">
                Đang xem nhãn: <span className="font-medium text-zinc-100 font-mono">{viewingTaskName}</span>
                {images.length > 0 && <span className="text-[11px] text-zinc-500 ml-1.5">({images.length} ảnh)</span>}
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-800 hover:bg-zinc-750 text-zinc-300 border border-zinc-700/60 transition-colors cursor-pointer flex items-center space-x-1"
                title="Quay lại không gian làm việc sạch để tải ảnh mới"
              >
                <PlusCircle className="w-3 h-3 text-zinc-400" />
                <span>Đợt mới</span>
              </button>
              <button
                type="button"
                onClick={() => setViewingTaskName("")}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
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

      {/* CỘT PHẢI: Inspection Canvas (8 cols) */}
      <div className="col-span-12 lg:col-span-8 h-full">
        <SkeletonCanvas
          imageSrc={currentImageUrl}
          predictions={currentPredictions}
          skeletonEdges={skeletonEdges}
          currentModelName={currentActiveModelName}
          confThreshold={confThreshold}
          kptConfThreshold={kptConfThreshold}
          onPrevImage={handlePrevImage}
          onNextImage={handleNextImage}
          hasPrev={currentIndex > 0}
          hasNext={currentIndex < images.length - 1}
          imageIndex={currentIndex >= 0 ? currentIndex : 0}
          totalImages={images.length}
          images={images}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          predictionsMap={predictionsMap}
        />
      </div>

      {/* Modal xác nhận Bắt đầu đợt gán nhãn mới */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-md w-full p-5 shadow-xl space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-300 shrink-0">
                <AlertTriangle className="w-5 h-5 text-zinc-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">
                  Bắt đầu đợt gán nhãn mới (New Batch)?
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Toàn bộ <span className="text-zinc-200 font-medium">{images.length} ảnh</span> trên Web Studio sẽ được sao lưu tự động vào thư mục <code className="text-[11px] bg-zinc-950 px-1 py-0.5 rounded text-zinc-300 font-mono">data/archives</code> và dọn sạch bộ nhớ đệm.
                </p>
                <p className="text-[11px] text-zinc-500 pt-1">
                  ✓ Các Task bạn đã tạo hoặc sửa trên CVAT Local hoàn toàn được lưu giữ an toàn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleResetWorkspace}
                disabled={isResetting}
                className="px-4 py-1.5 rounded-lg text-xs font-medium text-zinc-950 bg-zinc-100 hover:bg-white shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer disabled:opacity-50"
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
