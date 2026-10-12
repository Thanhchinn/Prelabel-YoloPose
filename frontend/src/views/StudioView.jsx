import React, { useState, useEffect } from "react";
import { Upload, Play, Sliders, Image as ImageIcon, CheckCircle, ArrowRight, Loader2 } from "lucide-react";
import SkeletonCanvas from "../components/canvas/SkeletonCanvas";
import { api } from "../services/api";

export default function StudioView({ onNavigateToCVAT }) {
  const [images, setImages] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [predictionsMap, setPredictionsMap] = useState({});
  const [skeletonEdges, setSkeletonEdges] = useState([]);
  const [confThreshold, setConfThreshold] = useState(0.5);
  const [kptConfThreshold, setKptConfThreshold] = useState(0.5);
  const [isUploading, setIsUploading] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Tải cấu hình và danh sách ảnh khi khởi tạo
  useEffect(() => {
    loadConfig();
    fetchImages();
  }, []);

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

  const currentPredictions = selectedImage ? predictionsMap[selectedImage.name] || [] : [];
  const currentImageUrl = selectedImage ? `http://localhost:8000${selectedImage.url}` : "";

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-7rem)]">
      {/* CỘT TRÁI: Settings & Upload Gallery (35% - 4 cols) */}
      <div className="col-span-12 lg:col-span-4 flex flex-col space-y-4 h-full overflow-hidden">
        {/* Upload Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              <span>Tải ảnh lên (Upload)</span>
            </h3>
            <span className="text-xs text-slate-400">{images.length} ảnh trong hàng đợi</span>
          </div>

          <label className="border-2 border-dashed border-slate-700 hover:border-cyan-500/60 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-800/30">
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              disabled={isUploading}
            />
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            ) : (
              <Upload className="w-6 h-6 text-slate-400 mb-2" />
            )}
            <span className="text-xs font-medium text-slate-300">Kéo thả hoặc click để chọn ảnh</span>
            <span className="text-[11px] text-slate-400 mt-1">Hỗ trợ JPG, PNG, WEBP</span>
          </label>
        </div>

        {/* Sliders Configuration */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 text-sm font-semibold text-slate-200">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Ngưỡng tin cậy (Confidence)</span>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-1">
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
            <div className="flex justify-between text-xs text-slate-400 mb-1">
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
            className="w-full mt-2 py-2.5 px-4 rounded-xl font-medium text-xs flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isPredicting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang suy luận YOLO 26...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Chạy Pre-label với YOLO 26</span>
              </>
            )}
          </button>
        </div>

        {/* Thumbnail Gallery */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex-1 flex flex-col min-h-0">
          <div className="text-xs font-semibold text-slate-300 mb-2">Danh sách ảnh đã tải:</div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {images.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-500">Chưa có ảnh nào.</div>
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
                        ? "bg-cyan-950/40 border-cyan-500/50 text-cyan-200"
                        : "bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <ImageIcon className="w-4 h-4 shrink-0 text-slate-400" />
                      <span className="text-xs truncate">{img.name}</span>
                    </div>
                    {hasPred && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center space-x-1 shrink-0">
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
            className="mt-3 w-full py-2 px-3 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center space-x-2 transition-colors"
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
        />
      </div>
    </div>
  );
}
