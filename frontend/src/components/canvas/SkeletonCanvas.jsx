import React, { useRef, useEffect, useState, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize2, Tag, Move, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

export default function SkeletonCanvas({
  imageSrc,
  predictions = [],
  skeletonEdges = [],
  onPrevImage,
  onNextImage,
  hasPrev = false,
  hasNext = false,
  imageIndex = 0,
  totalImages = 0
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  // Kích thước hiển thị tự căn chỉnh vừa vặn container
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [showBoxes, setShowBoxes] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Tính toán kích thước hiển thị vừa khít 100% khung nhìn, KHÔNG BAO GIỜ BỊ CẮT XÉN
  const updateDisplaySize = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;

    const padding = 32; // Khoảng đệm an toàn
    const availWidth = Math.max(100, container.clientWidth - padding);
    const availHeight = Math.max(100, container.clientHeight - padding);

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    // Tính tỉ lệ sao cho toàn bộ chiều rộng và chiều cao đều nằm trọn vẹn trong container
    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    const fitW = Math.round(imgWidth * scale);
    const fitH = Math.round(imgHeight * scale);

    setDisplaySize({ width: fitW, height: fitH });
  }, []);

  // Reset về chế độ xem toàn cảnh (Fit to Screen)
  const handleResetFit = useCallback(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    updateDisplaySize();
  }, [updateDisplaySize]);

  // Load ảnh
  useEffect(() => {
    if (!imageSrc) return;
    setImgLoaded(false);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      setImgLoaded(true);
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
      updateDisplaySize();
    };
  }, [imageSrc, updateDisplaySize]);

  // Lắng nghe thay đổi kích thước container bằng ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDisplaySize();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [updateDisplaySize]);

  // Lắng nghe phím mũi tên trái/phải để chuyển ảnh tiện lợi
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName)) return;
      if (e.key === "ArrowLeft" && hasPrev && onPrevImage) {
        onPrevImage();
      } else if (e.key === "ArrowRight" && hasNext && onNextImage) {
        onNextImage();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasPrev, hasNext, onPrevImage, onNextImage]);

  // Vẽ hình ảnh và các khớp lên Canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth || !img.naturalHeight) return;

    const ctx = canvas.getContext("2d");

    // Đặt buffer đúng độ phân giải gốc 100% của ảnh (ví dụ: 1280x720)
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Vẽ trọn vẹn toàn bộ bức ảnh gốc từ (0, 0) đến (width, height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Vẽ từng người được phát hiện bởi YOLO
    predictions.forEach((person, pIdx) => {
      const [x1, y1, x2, y2] = person.bbox || [0, 0, 0, 0];
      const w = x2 - x1;
      const h = y2 - y1;

      // 1. Vẽ Bounding Box
      if (showBoxes) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.95)"; // Cyan
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 400));
        ctx.strokeRect(x1, y1, w, h);

        // Header nhãn box
        ctx.fillStyle = "rgba(6, 182, 212, 0.9)";
        const labelText = `Person #${person.person_id || pIdx + 1} (${Math.round((person.score || 0.9) * 100)}%)`;
        const fontSize = Math.max(14, Math.round(canvas.width / 55));
        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(x1, Math.max(0, y1 - (fontSize + 10)), textWidth + 14, fontSize + 10);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, x1 + 7, Math.max(fontSize, y1 - 6));
      }

      const kpts = person.keypoints || [];
      const kptMap = {};
      kpts.forEach((k) => {
        kptMap[k.id] = k;
      });

      // 2. Vẽ đường nối xương (Bones)
      if (showSkeleton && skeletonEdges.length > 0) {
        ctx.lineWidth = Math.max(3.5, Math.round(canvas.width / 300));
        skeletonEdges.forEach(([u, v]) => {
          const ptU = kptMap[u];
          const ptV = kptMap[v];
          if (ptU && ptV && ptU.visible > 0 && ptV.visible > 0) {
            ctx.beginPath();
            ctx.moveTo(ptU.x, ptU.y);
            ctx.lineTo(ptV.x, ptV.y);

            // Chuẩn CVAT: nếu 1 trong 2 khớp bị che khuất (visible === 1), vẽ đường nét đứt (dashed line)
            const isOccluded = ptU.visible === 1 || ptV.visible === 1;
            if (isOccluded) {
              const dashLen = Math.max(6, Math.round(canvas.width / 160));
              const gapLen = Math.max(4, Math.round(canvas.width / 240));
              ctx.setLineDash([dashLen, gapLen]);
            } else {
              ctx.setLineDash([]);
            }

            const isLeft = ptU.name?.includes("left") || ptV.name?.includes("left");
            const isRight = ptU.name?.includes("right") || ptV.name?.includes("right");
            if (isLeft) {
              ctx.strokeStyle = isOccluded ? "rgba(16, 185, 129, 0.65)" : "rgba(16, 185, 129, 0.95)"; // Emerald
            } else if (isRight) {
              ctx.strokeStyle = isOccluded ? "rgba(239, 68, 68, 0.65)" : "rgba(239, 68, 68, 0.95)"; // Red
            } else {
              ctx.strokeStyle = isOccluded ? "rgba(245, 158, 11, 0.7)" : "rgba(245, 158, 11, 0.95)"; // Amber
            }
            ctx.stroke();
            ctx.setLineDash([]); // Reset nét vẽ
          }
        });
      }

      // 3. Vẽ 17 Keypoints
      if (showPoints) {
        const radius = Math.max(5, Math.round(canvas.width / 180));
        kpts.forEach((k) => {
          if (k.visible === 0) return; // Ẩn điểm outside/invisible

          const isLeft = k.name?.includes("left");
          const isRight = k.name?.includes("right");
          const baseColor = isLeft ? "#10B981" : isRight ? "#EF4444" : "#FBBF24";
          const isOccluded = k.visible === 1;

          if (isOccluded) {
            // Điểm BỊ CHE KHUẤT (OCCLUDED): Vẽ viền nét đứt và vòng hào quang cảnh báo
            ctx.save();
            // 1. Vòng halo ngoài nét đứt màu cam vàng
            ctx.beginPath();
            ctx.arc(k.x, k.y, radius + Math.max(3, Math.round(radius * 0.5)), 0, 2 * Math.PI);
            ctx.setLineDash([Math.max(3, Math.round(radius * 0.6)), Math.max(2, Math.round(radius * 0.4))]);
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = Math.max(2, Math.round(radius / 3));
            ctx.stroke();

            // 2. Điểm khớp trung tâm bán trong suốt + viền nét đứt trắng
            ctx.beginPath();
            ctx.arc(k.x, k.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isLeft ? "rgba(16, 185, 129, 0.45)" : isRight ? "rgba(239, 68, 68, 0.45)" : "rgba(251, 191, 36, 0.45)";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.setLineDash([Math.max(2, Math.round(radius * 0.5)), Math.max(2, Math.round(radius * 0.5))]);
            ctx.lineWidth = Math.max(2, Math.round(radius / 3));
            ctx.stroke();
            ctx.restore();
          } else {
            // Điểm RÕ RÀNG (VISIBLE): Nét liền sắc nét
            ctx.save();
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.arc(k.x, k.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = baseColor;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = Math.max(2, Math.round(radius / 3));
            ctx.stroke();
            ctx.restore();
          }

          // Nhãn tên khớp
          if (showLabels) {
            const labelSize = Math.max(11, Math.round(canvas.width / 80));
            ctx.font = `bold ${labelSize}px sans-serif`;
            const labelText = isOccluded ? `${k.name} [Occluded]` : k.name;
            ctx.fillStyle = isOccluded ? "#FDE68A" : "#ffffff";
            ctx.strokeStyle = "#000000";
            ctx.lineWidth = 3;
            ctx.strokeText(labelText, k.x + radius + 6, k.y + 4);
            ctx.fillText(labelText, k.x + radius + 6, k.y + 4);
          }
        });
      }
    });
  }, [predictions, showBoxes, showSkeleton, showPoints, showLabels, skeletonEdges]);

  useEffect(() => {
    if (imgLoaded) draw();
  }, [imgLoaded, draw]);

  // Xử lý kéo chuột để Pan khi zoom
  const handleMouseDown = (e) => {
    if (e.button !== 0 || zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-xl select-none">
      {/* Canvas Toolbar */}
      <div className="h-12 bg-slate-900/95 border-b border-slate-800 px-4 flex items-center justify-between shrink-0 z-10">
        {/* Toggles */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showBoxes ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Box</span>
          </button>
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showSkeleton ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>Bones</span>
          </button>
          <button
            onClick={() => setShowPoints(!showPoints)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showPoints ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <span>17 Pts</span>
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1 transition-colors ${
              showLabels ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" : "bg-slate-800 text-slate-400 hover:text-slate-200"
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>Labels</span>
          </button>
        </div>

        {/* Next / Pre Navigation Controls */}
        {totalImages > 0 && (
          <div className="flex items-center space-x-1.5 bg-slate-950/80 border border-slate-800 rounded-xl px-2 py-1 shadow-inner">
            <button
              onClick={onPrevImage}
              disabled={!hasPrev}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Xem ảnh trước (Pre / Phím ←)"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Pre</span>
            </button>

            <span className="text-xs font-mono text-cyan-300 font-bold px-2">
              {imageIndex + 1} / {totalImages}
            </span>

            <button
              onClick={onNextImage}
              disabled={!hasNext}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all bg-slate-800 hover:bg-cyan-600 hover:text-white text-slate-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              title="Xem ảnh sau (Next / Phím →)"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* View Controls */}
        <div className="flex items-center space-x-2">
          {/* Nút Hiển thị Full Toàn Bộ Ảnh */}
          <button
            onClick={handleResetFit}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors ${
              zoomLevel === 1
                ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
            title="Tự động thu nhỏ vừa khít toàn bộ bức ảnh (không bị cắt)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span>Xem Toàn Bộ Ảnh (Full)</span>
          </button>

          <div className="text-xs text-slate-400 font-mono w-14 text-center">
            {Math.round(zoomLevel * 100)}%
          </div>

          <button
            onClick={() => setZoomLevel((z) => Math.min(z * 1.25, 4.0))}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Phóng to (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={() => setZoomLevel((z) => Math.max(z * 0.8, 0.5))}
            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Thu nhỏ (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Viewport (Bảo đảm luôn hiển thị 100% diện tích ảnh, không bao giờ bị cắt xén) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 overflow-hidden flex items-center justify-center p-3 bg-slate-950 relative ${
          zoomLevel > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        }`}
      >
        {!imageSrc ? (
          <div className="text-center text-slate-500 text-sm">
            Chưa có ảnh nào được chọn để hiển thị.
          </div>
        ) : (
          <div
            style={{
              width: displaySize.width > 0 ? `${displaySize.width}px` : "auto",
              height: displaySize.height > 0 ? `${displaySize.height}px` : "auto",
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            className="shadow-2xl rounded-lg overflow-hidden border border-slate-800/80 bg-black flex items-center justify-center"
          >
            <canvas
              ref={canvasRef}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                objectFit: "contain",
              }}
            />
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="h-9 bg-slate-900 border-t border-slate-800 px-4 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
        <div className="flex items-center space-x-3.5 flex-wrap">
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Chi trái (Left)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <span>Chi phải (Right)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>Trục thân (Central)</span>
          </span>
          <span className="text-slate-700 font-bold">|</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3.5 h-0.5 bg-emerald-400 rounded-full inline-block" />
            <span className="text-slate-300">Rõ ràng (Visible)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-4 border-t-2 border-dashed border-amber-400 inline-block" />
            <span className="text-amber-300 font-medium">Bị che (Occluded)</span>
          </span>
        </div>
        <div className="flex items-center space-x-3 text-slate-400">
          {zoomLevel > 1 && (
            <span className="flex items-center space-x-1 text-cyan-400">
              <Move className="w-3 h-3" />
              <span>Kéo chuột để di chuyển ảnh</span>
              <span>•</span>
            </span>
          )}
          <span>Độ phân giải gốc: {imgRef.current ? `${imgRef.current.naturalWidth}x${imgRef.current.naturalHeight}` : "--"}</span>
          <span>•</span>
          <span>Số người: <strong className="text-cyan-400">{predictions.length}</strong></span>
        </div>
      </div>
    </div>
  );
}
