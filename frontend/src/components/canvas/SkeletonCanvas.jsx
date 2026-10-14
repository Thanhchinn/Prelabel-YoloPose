import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Tag,
  ChevronLeft,
  ChevronRight,
  Eye,
  Image as ImageIcon,
} from "lucide-react";

const KEYPOINT_NAMES_VI = {
  nose: "Mũi (Nose)",
  left_eye: "Mắt trái (L. Eye)",
  right_eye: "Mắt phải (R. Eye)",
  left_ear: "Tai trái (L. Ear)",
  right_ear: "Tai phải (R. Ear)",
  left_shoulder: "Vai trái (L. Shoulder)",
  right_shoulder: "Vai phải (R. Shoulder)",
  left_elbow: "Khuỷu tay T (L. Elbow)",
  right_elbow: "Khuỷu tay P (R. Elbow)",
  left_wrist: "Cổ tay trái (Left Wrist)",
  right_wrist: "Cổ tay phải (Right Wrist)",
  left_hip: "Hông trái (L. Hip)",
  right_hip: "Hông phải (R. Hip)",
  left_knee: "Đầu gối trái (L. Knee)",
  right_knee: "Đầu gối phải (R. Knee)",
  left_ankle: "Cổ chân trái (L. Ankle)",
  right_ankle: "Cổ chân phải (R. Ankle)",
};

const formatKeypointName = (rawName) => {
  if (!rawName) return "Khớp xương";
  return (
    KEYPOINT_NAMES_VI[rawName] ||
    rawName.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
};

const formatModelName = (name) => {
  if (!name) return "Chưa có nhãn";
  const str = typeof name === "string" ? name : String(name?.name || name || "");
  return str.trim();
};

export default function SkeletonCanvas({
  imageSrc,
  predictions = [],
  skeletonEdges = [],
  currentModelName = "",
  confThreshold = 0.5,
  kptConfThreshold = 0.5,
  onPrevImage,
  onNextImage,
  hasPrev = false,
  hasNext = false,
  imageIndex = 0,
  totalImages = 0,
  images = [],
  selectedImage = null,
  onSelectImage,
  predictionsMap = {},
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const imgRef = useRef(null);

  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [naturalResolution, setNaturalResolution] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Layer toggles
  const [showBoxes, setShowBoxes] = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showPoints, setShowPoints] = useState(true);
  const [showLabels, setShowLabels] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // 1. Hold to Peek Original feature
  const [isPeeking, setIsPeeking] = useState(false);

  // 2. HUD / Tooltip hover state
  const [hoveredTarget, setHoveredTarget] = useState(null);

  const updateDisplaySize = useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img || !img.naturalWidth || !img.naturalHeight) return;

    const padding = 32;
    const availWidth = Math.max(100, container.clientWidth - padding);
    const availHeight = Math.max(100, container.clientHeight - padding);

    const imgWidth = img.naturalWidth;
    const imgHeight = img.naturalHeight;

    const scale = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    const fitW = Math.round(imgWidth * scale);
    const fitH = Math.round(imgHeight * scale);

    setDisplaySize({ width: fitW, height: fitH });
  }, []);

  const handleResetFit = useCallback(() => {
    setZoomLevel(1);
    setPan({ x: 0, y: 0 });
    updateDisplaySize();
  }, [updateDisplaySize]);

  useEffect(() => {
    if (!imageSrc) return;
    setImgLoaded(false);
    setHoveredTarget(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    img.onload = () => {
      imgRef.current = img;
      setNaturalResolution(`${img.naturalWidth}x${img.naturalHeight}`);
      setImgLoaded(true);
      setZoomLevel(1);
      setPan({ x: 0, y: 0 });
      updateDisplaySize();
    };
  }, [imageSrc, updateDisplaySize]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      updateDisplaySize();
    });
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, [updateDisplaySize]);

  // Phím tắt bàn phím thực thụ:
  // - Space: Nhấn giữ để xem ảnh gốc (Hold to Peek)
  // - ← / A và → / D: Chuyển ảnh Trước / Tiếp theo
  // - B: Bật/tắt Box
  // - S: Bật/tắt Bones (Khung xương)
  // - K: Bật/tắt 17 Points
  // - L: Bật/tắt Labels
  // - F: Vừa khung
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Bỏ qua khi người dùng đang nhập liệu trong ô input, select, textarea
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(e.target?.tagName) ||
        e.target?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsPeeking(true);
        return;
      }

      const key = e.key.toLowerCase();

      if ((e.key === "ArrowLeft" || key === "a") && hasPrev && onPrevImage) {
        e.preventDefault();
        onPrevImage();
      } else if ((e.key === "ArrowRight" || key === "d") && hasNext && onNextImage) {
        e.preventDefault();
        onNextImage();
      } else if (key === "b") {
        e.preventDefault();
        setShowBoxes((prev) => !prev);
      } else if (key === "s") {
        e.preventDefault();
        setShowSkeleton((prev) => !prev);
      } else if (key === "k") {
        e.preventDefault();
        setShowPoints((prev) => !prev);
      } else if (key === "l") {
        e.preventDefault();
        setShowLabels((prev) => !prev);
      } else if (key === "f") {
        e.preventDefault();
        handleResetFit();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        setIsPeeking(false);
      }
    };

    const handleWindowBlur = () => {
      setIsPeeking(false);
      setHoveredTarget(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [hasPrev, hasNext, onPrevImage, onNextImage, handleResetFit]);

  // Vẽ Canvas với tốc độ phản hồi 60fps & tính năng Hold to Peek
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !img.naturalWidth || !img.naturalHeight) return;

    const ctx = canvas.getContext("2d");

    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Luôn vẽ ảnh gốc với độ rõ nét 100%
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Lọc các đối tượng đạt ngưỡng Bbox Confidence
    const activePersons = predictions.filter(
      (person) => (person.score ?? 0.9) >= confThreshold
    );

    // Áp dụng lớp mờ 10% (opacity-10) khi kích hoạt "Hold to Peek Original"
    ctx.save();
    if (isPeeking) {
      ctx.globalAlpha = 0.1; // Làm mờ các chi tiết nhãn để soi rõ ảnh gốc bên dưới
    }

    activePersons.forEach((person, pIdx) => {
      const [x1, y1, x2, y2] = person.bbox || [0, 0, 0, 0];
      const w = x2 - x1;
      const h = y2 - y1;

      // 1. Vẽ Bounding Box
      if (showBoxes) {
        ctx.strokeStyle = "rgba(56, 189, 248, 0.9)";
        ctx.lineWidth = Math.max(3, Math.round(canvas.width / 400));
        ctx.strokeRect(x1, y1, w, h);

        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        const labelText = `Person #${person.person_id || pIdx + 1} (${Math.round((person.score || 0.9) * 100)}%)`;
        const fontSize = Math.max(13, Math.round(canvas.width / 60));
        ctx.font = `500 ${fontSize}px sans-serif`;
        const textWidth = ctx.measureText(labelText).width;
        ctx.fillRect(x1, Math.max(0, y1 - (fontSize + 8)), textWidth + 12, fontSize + 8);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(labelText, x1 + 6, Math.max(fontSize, y1 - 5));
      }

      // 2. Chuẩn bị Keypoints Map & tính toán độ tin cậy thời gian thực
      const kpts = person.keypoints || [];
      const kptMap = {};
      kpts.forEach((k) => {
        const conf = k.conf !== undefined ? k.conf : (k.score !== undefined ? k.score : 1.0);
        let dynamicVis = k.visible;
        if (conf < 0.15) {
          dynamicVis = 0; // Quá mờ -> ẩn
        } else if (conf < kptConfThreshold) {
          dynamicVis = 1; // Dưới ngưỡng -> coi như bị che khuất (nét đứt)
        } else {
          dynamicVis = 2; // Đạt ngưỡng -> rõ ràng (nét liền)
        }

        kptMap[k.id] = {
          ...k,
          dynamicVis,
          effectiveConf: conf,
        };
      });

      // 3. Vẽ Khung xương (Skeleton Bones)
      if (showSkeleton && skeletonEdges.length > 0) {
        ctx.lineWidth = Math.max(3.5, Math.round(canvas.width / 300));
        skeletonEdges.forEach(([u, v]) => {
          const ptU = kptMap[u];
          const ptV = kptMap[v];
          if (ptU && ptV && ptU.dynamicVis > 0 && ptV.dynamicVis > 0) {
            ctx.beginPath();
            ctx.moveTo(ptU.x, ptU.y);
            ctx.lineTo(ptV.x, ptV.y);

            const isOccluded = ptU.dynamicVis === 1 || ptV.dynamicVis === 1;
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
              ctx.strokeStyle = isOccluded ? "rgba(16, 185, 129, 0.65)" : "rgba(16, 185, 129, 0.95)";
            } else if (isRight) {
              ctx.strokeStyle = isOccluded ? "rgba(239, 68, 68, 0.65)" : "rgba(239, 68, 68, 0.95)";
            } else {
              ctx.strokeStyle = isOccluded ? "rgba(245, 158, 11, 0.7)" : "rgba(245, 158, 11, 0.95)";
            }
            ctx.stroke();
            ctx.setLineDash([]);
          }
        });
      }

      // 4. Vẽ 17 Điểm Khớp (Keypoints)
      if (showPoints) {
        const radius = Math.max(5, Math.round(canvas.width / 180));
        Object.values(kptMap).forEach((k) => {
          if (k.dynamicVis === 0) return;

          const isLeft = k.name?.includes("left");
          const isRight = k.name?.includes("right");
          const baseColor = isLeft ? "#10B981" : isRight ? "#EF4444" : "#FBBF24";
          const isOccluded = k.dynamicVis === 1;

          if (isOccluded) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(k.x, k.y, radius + Math.max(3, Math.round(radius * 0.5)), 0, 2 * Math.PI);
            ctx.setLineDash([Math.max(3, Math.round(radius * 0.6)), Math.max(2, Math.round(radius * 0.4))]);
            ctx.strokeStyle = "#F59E0B";
            ctx.lineWidth = Math.max(2, Math.round(radius / 3));
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(k.x, k.y, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isLeft
              ? "rgba(16, 185, 129, 0.45)"
              : isRight
              ? "rgba(239, 68, 68, 0.45)"
              : "rgba(251, 191, 36, 0.45)";
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.setLineDash([Math.max(2, Math.round(radius * 0.5)), Math.max(2, Math.round(radius * 0.5))]);
            ctx.lineWidth = Math.max(2, Math.round(radius / 3));
            ctx.stroke();
            ctx.restore();
          } else {
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

          if (showLabels) {
            const labelSize = Math.max(11, Math.round(canvas.width / 80));
            ctx.font = `500 ${labelSize}px sans-serif`;
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

    ctx.restore();
  }, [
    predictions,
    showBoxes,
    showSkeleton,
    showPoints,
    showLabels,
    skeletonEdges,
    isPeeking,
    confThreshold,
    kptConfThreshold,
  ]);

  useEffect(() => {
    if (imgLoaded) {
      const animId = requestAnimationFrame(draw);
      return () => cancelAnimationFrame(animId);
    }
  }, [imgLoaded, draw]);

  // Xử lý kéo di chuyển (Pan) và di chuột phát hiện Keypoint/Bbox HUD
  const handleMouseDown = (e) => {
    if (e.button !== 0 || zoomLevel <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    setHoveredTarget(null);
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      setHoveredTarget(null);
      return;
    }

    // Tính toán vị trí chuột so với ảnh tự nhiên để phát hiện khớp xương gần nhất
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imgLoaded || predictions.length === 0) {
      if (hoveredTarget) setHoveredTarget(null);
      return;
    }

    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (
      e.clientX < canvasRect.left ||
      e.clientX > canvasRect.right ||
      e.clientY < canvasRect.top ||
      e.clientY > canvasRect.bottom
    ) {
      if (hoveredTarget) setHoveredTarget(null);
      return;
    }

    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    const mouseImgX = (e.clientX - canvasRect.left) * scaleX;
    const mouseImgY = (e.clientY - canvasRect.top) * scaleY;

    // Bán kính nhạy quét chuột (~18px trên màn hình quy đổi sang tọa độ ảnh)
    const hitRadiusNatural = 18 * scaleX;
    let closestKpt = null;
    let closestPerson = null;
    let minDistance = hitRadiusNatural;

    const filteredPersons = predictions.filter(
      (p) => (p.score ?? 0.9) >= confThreshold
    );

    for (const person of filteredPersons) {
      const kpts = person.keypoints || [];
      for (const k of kpts) {
        if (k.visible === 0) continue;
        const dx = k.x - mouseImgX;
        const dy = k.y - mouseImgY;
        const dist = Math.hypot(dx, dy);
        if (dist < minDistance) {
          minDistance = dist;
          closestKpt = k;
          closestPerson = person;
        }
      }
    }

    const mouseContainerX = e.clientX - containerRect.left;
    const mouseContainerY = e.clientY - containerRect.top;

    if (closestKpt) {
      setHoveredTarget({
        type: "keypoint",
        keypoint: closestKpt,
        person: closestPerson,
        x: mouseContainerX,
        y: mouseContainerY,
      });
      return;
    }

    // Nếu không chạm keypoint, kiểm tra xem có nằm trong Person Bbox nào không
    let hoveredBoxPerson = null;
    for (const person of filteredPersons) {
      const [x1, y1, x2, y2] = person.bbox || [0, 0, 0, 0];
      if (mouseImgX >= x1 && mouseImgX <= x2 && mouseImgY >= y1 && mouseImgY <= y2) {
        hoveredBoxPerson = person;
        break;
      }
    }

    if (hoveredBoxPerson && showBoxes) {
      setHoveredTarget({
        type: "bbox",
        person: hoveredBoxPerson,
        x: mouseContainerX,
        y: mouseContainerY,
      });
    } else {
      if (hoveredTarget) setHoveredTarget(null);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoveredTarget(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900/50 rounded-xl border border-zinc-800/80 overflow-hidden shadow-xs select-none relative">
      {/* Canvas Toolbar with Keyboard Shortcut Badges */}
      <div className="h-11 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 px-3 sm:px-4 flex items-center justify-between shrink-0 z-10 gap-2 overflow-x-auto">
        {/* Layer Visualization Toggles with kbd hints */}
        <div className="flex items-center space-x-0.5 bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 shrink-0">
          <button
            onClick={() => setShowBoxes(!showBoxes)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5 ${
              showBoxes ? "bg-zinc-800 text-zinc-100 shadow-xs" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Bật/Tắt hiển thị Bounding Box (B)"
          >
            <span>Box</span>
            <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
              B
            </kbd>
          </button>
          <button
            onClick={() => setShowSkeleton(!showSkeleton)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5 ${
              showSkeleton ? "bg-zinc-800 text-zinc-100 shadow-xs" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Bật/Tắt hiển thị Khung xương (S)"
          >
            <span>Bones</span>
            <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
              S
            </kbd>
          </button>
          <button
            onClick={() => setShowPoints(!showPoints)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5 ${
              showPoints ? "bg-zinc-800 text-zinc-100 shadow-xs" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Bật/Tắt hiển thị 17 Điểm khớp (K)"
          >
            <span>17 Pts</span>
            <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
              K
            </kbd>
          </button>
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`px-2 py-1 rounded-md text-[11px] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
              showLabels ? "bg-zinc-800 text-zinc-100 shadow-xs" : "text-zinc-400 hover:text-zinc-200"
            }`}
            title="Bật/Tắt tên gọi khớp (L)"
          >
            <Tag className="w-3 h-3 shrink-0" />
            <span>Labels</span>
            <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
              L
            </kbd>
          </button>
        </div>

        {/* Nút Hold to Peek Original (Giữ để xem ảnh gốc) */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            type="button"
            onPointerDown={() => setIsPeeking(true)}
            onPointerUp={() => setIsPeeking(false)}
            onPointerLeave={() => setIsPeeking(false)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer shrink-0 flex items-center space-x-1.5 border select-none ${
              isPeeking
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs ring-1 ring-amber-500/30"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
            }`}
            title="Nhấn giữ phím Space hoặc nút này để làm mờ nhãn xuống 10% soi rõ ảnh gốc"
          >
            <Eye className={`w-3.5 h-3.5 shrink-0 ${isPeeking ? "text-amber-300 animate-pulse" : "text-zinc-400"}`} />
            <span>Giữ xem ảnh gốc</span>
            <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
              Space
            </kbd>
          </button>

          {/* Active Model Attribution */}
          <div className="hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 text-xs shrink-0">
            <span className="text-[10px] text-zinc-500 uppercase font-medium">Nhãn:</span>
            <span className="font-mono text-[11px] text-zinc-200 flex items-center space-x-1.5">
              <span>{formatModelName(currentModelName)}</span>
              {(currentModelName?.includes("v1") || currentModelName?.includes("v2") || currentModelName?.includes("v3")) && (
                <span className="px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[9px] font-semibold">
                  Retrained
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Navigation + Viewport Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Image Navigation with Arrow Keys & A/D kbd hints */}
          {totalImages > 0 && (
            <div className="flex items-center space-x-0.5 bg-zinc-900 border border-zinc-800 rounded-md p-0.5 shrink-0">
              <button
                onClick={onPrevImage}
                disabled={!hasPrev}
                className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1.5 transition-colors bg-zinc-800 hover:bg-zinc-750 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                title="Xem ảnh trước (Phím tắt: ← hoặc A)"
              >
                <ChevronLeft className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">Pre</span>
                <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
                  ←/A
                </kbd>
              </button>

              <span className="text-xs font-mono text-zinc-200 font-medium px-2 whitespace-nowrap">
                {imageIndex + 1} <span className="text-zinc-600">/</span> {totalImages}
              </span>

              <button
                onClick={onNextImage}
                disabled={!hasNext}
                className="px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1.5 transition-colors bg-zinc-800 hover:bg-zinc-750 text-zinc-200 disabled:opacity-30 disabled:pointer-events-none cursor-pointer shrink-0"
                title="Xem ảnh sau (Phím tắt: → hoặc D)"
              >
                <span className="hidden sm:inline">Next</span>
                <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
                  →/D
                </kbd>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          )}

          {/* Zoom & Fit Controls */}
          <div className="flex items-center space-x-0.5 bg-zinc-900 border border-zinc-800 rounded-md p-0.5 shrink-0">
            <button
              onClick={handleResetFit}
              className={`px-2 py-0.5 rounded text-[11px] font-medium flex items-center space-x-1.5 transition-colors cursor-pointer shrink-0 ${
                zoomLevel === 1
                  ? "bg-zinc-800 text-zinc-100 shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Vừa khung ảnh (Phím tắt: F)"
            >
              <Maximize2 className="w-3 h-3 shrink-0" />
              <span>Vừa khung</span>
              <kbd className="font-mono text-[9px] px-1 py-0.2 bg-zinc-950/80 border border-zinc-750/80 rounded text-zinc-400">
                F
              </kbd>
            </button>

            <div className="text-[11px] text-zinc-400 font-mono w-9 text-center shrink-0">
              {Math.round(zoomLevel * 100)}%
            </div>

            <button
              onClick={() => setZoomLevel((z) => Math.max(z * 0.8, 0.5))}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer shrink-0"
              title="Thu nhỏ (-)"
            >
              <ZoomOut className="w-3.5 h-3.5 shrink-0" />
            </button>

            <button
              onClick={() => setZoomLevel((z) => Math.min(z * 1.25, 4.0))}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 cursor-pointer shrink-0"
              title="Phóng to (+)"
            >
              <ZoomIn className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className={`flex-1 overflow-hidden flex items-center justify-center p-3 bg-zinc-950 relative ${
          zoomLevel > 1 ? (isDragging ? "cursor-grabbing" : "cursor-grab") : "cursor-default"
        }`}
      >
        {/* Banner chỉ báo đang soi ảnh gốc khi giữ Space */}
        {isPeeking && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-3.5 py-1 rounded-full bg-zinc-950/90 border border-amber-500/50 text-amber-300 font-mono text-[10px] flex items-center space-x-2 shadow-2xl backdrop-blur-md pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span className="font-semibold uppercase tracking-wider">ĐANG SOI ẢNH GỐC [SPACE]</span>
            <span className="text-zinc-400 text-[9px]">(Nhãn mờ 10%)</span>
          </div>
        )}

        {/* HUD / Tooltip Kỹ thuật siêu gọn khi Hover Keypoint hoặc Bbox */}
        {hoveredTarget && !isDragging && (
          <div
            style={{
              left: `${Math.min(
                hoveredTarget.x + 14,
                (containerRef.current?.clientWidth || 600) - 220
              )}px`,
              top: `${Math.min(
                hoveredTarget.y + 14,
                (containerRef.current?.clientHeight || 400) - 95
              )}px`,
            }}
            className="absolute pointer-events-none z-40 transition-[transform,opacity] duration-75 select-none"
          >
            {hoveredTarget.type === "keypoint" ? (
              <div className="font-mono text-[11px] bg-zinc-950/95 border border-zinc-800 px-2.5 py-1.5 rounded-lg shadow-2xl backdrop-blur-md flex flex-col space-y-1 text-zinc-200 min-w-[185px]">
                {/* Header: Dot + Tên Khớp + Person # */}
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
                  <div className="flex items-center space-x-1.5 font-semibold text-zinc-100 min-w-0">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        hoveredTarget.keypoint.name?.includes("left")
                          ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                          : hoveredTarget.keypoint.name?.includes("right")
                          ? "bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.7)]"
                          : "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.7)]"
                      }`}
                    />
                    <span className="truncate">
                      {formatKeypointName(hoveredTarget.keypoint.name)}
                    </span>
                  </div>
                  <span className="text-[9px] text-zinc-500 uppercase font-mono ml-2 shrink-0">
                    P#{hoveredTarget.person?.person_id || 1}
                  </span>
                </div>

                {/* Độ tin cậy & Trạng thái */}
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400">Độ tin cậy:</span>
                  <span className="font-semibold text-zinc-200 tabular-nums">
                    Conf:{" "}
                    {(
                      hoveredTarget.keypoint.conf !== undefined
                        ? hoveredTarget.keypoint.conf
                        : hoveredTarget.keypoint.score !== undefined
                        ? hoveredTarget.keypoint.score
                        : 0.88
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400">Trạng thái:</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${
                      hoveredTarget.keypoint.visible === 1 ||
                      (hoveredTarget.keypoint.conf !== undefined &&
                        hoveredTarget.keypoint.conf < kptConfThreshold)
                        ? "bg-amber-500/10 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {hoveredTarget.keypoint.visible === 1 ||
                    (hoveredTarget.keypoint.conf !== undefined &&
                      hoveredTarget.keypoint.conf < kptConfThreshold)
                      ? "Bị che khuất"
                      : "Rõ ràng"}
                  </span>
                </div>

                {/* Tọa độ Pixel ảnh gốc */}
                <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-0.5 border-t border-zinc-850">
                  <span>Tọa độ:</span>
                  <span className="tabular-nums">
                    X:{Math.round(hoveredTarget.keypoint.x)}, Y:{Math.round(hoveredTarget.keypoint.y)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="font-mono text-[11px] bg-zinc-950/95 border border-zinc-800 px-2.5 py-1.5 rounded-lg shadow-2xl backdrop-blur-md flex flex-col space-y-1 text-zinc-200 min-w-[160px]">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1">
                  <span className="font-semibold text-sky-400">
                    Person #{hoveredTarget.person?.person_id || 1}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-semibold tabular-nums">
                    Conf: {(hoveredTarget.person?.score ?? 0.9).toFixed(2)}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-400 flex items-center justify-between">
                  <span>Khớp hiển thị:</span>
                  <span className="text-zinc-200 tabular-nums">
                    {hoveredTarget.person?.keypoints?.filter((k) => k.visible > 0).length || 0}/17
                  </span>
                </div>
                <div className="text-[9px] text-zinc-500 flex items-center justify-between pt-0.5 border-t border-zinc-850">
                  <span>Khung Box:</span>
                  <span className="tabular-nums">
                    {Math.round(
                      (hoveredTarget.person.bbox?.[2] || 0) - (hoveredTarget.person.bbox?.[0] || 0)
                    )}
                    x
                    {Math.round(
                      (hoveredTarget.person.bbox?.[3] || 0) - (hoveredTarget.person.bbox?.[1] || 0)
                    )}
                    px
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {!imageSrc ? (
          <div className="flex flex-col items-center justify-center text-center p-8 max-w-sm space-y-2 select-none">
            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <ImageIcon className="w-6 h-6 text-zinc-600" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-zinc-300">Không gian làm việc đang trống</h4>
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Hãy kéo thả hoặc tải bộ ảnh mới ở cột bên trái để bắt đầu gán nhãn AI Pose.
              </p>
            </div>
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
            className="rounded-lg overflow-hidden border border-zinc-800/80 bg-black flex items-center justify-center shadow-sm"
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

      {/* Image Filmstrip / Queue Bar (Dải điều hướng nhanh ngay dưới Canvas) */}
      {totalImages > 0 && images.length > 0 && (
        <div className="h-14 bg-zinc-950 border-t border-zinc-800/80 px-3 flex items-center space-x-2 overflow-x-auto shrink-0 select-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 shrink-0 mr-1 flex items-center space-x-1">
            <span>ẢNH:</span>
          </div>
          <div className="flex items-center space-x-1.5 min-w-0 py-1">
            {images.map((img, idx) => {
              const isCurrent = img.name === selectedImage?.name || idx === imageIndex;
              const hasPred = Boolean(predictionsMap[img.name] || img.has_prediction);

              return (
                <button
                  key={img.name}
                  type="button"
                  onClick={() => onSelectImage && onSelectImage(img)}
                  className={`group relative flex items-center space-x-2 px-2 py-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                    isCurrent
                      ? "bg-zinc-850 border-zinc-500 text-zinc-100 shadow-xs ring-1 ring-zinc-500/50"
                      : "bg-zinc-900/60 border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 text-zinc-400"
                  }`}
                  title={`Ảnh #${idx + 1}: ${img.name} (${hasPred ? "Đã gán nhãn AI" : "Chưa chạy"})`}
                >
                  {/* Thumbnail mini preview */}
                  <div className="w-6 h-6 rounded overflow-hidden bg-black border border-zinc-800 shrink-0 relative flex items-center justify-center">
                    <img
                      src={`http://localhost:8000${img.url}`}
                      alt={img.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Info: Index & Name & Status dot */}
                  <div className="flex flex-col text-left min-w-0 max-w-[95px]">
                    <div className="flex items-center space-x-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          hasPred
                            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"
                            : "bg-zinc-600"
                        }`}
                      />
                      <span
                        className={`text-[11px] font-mono truncate leading-tight ${
                          isCurrent ? "text-zinc-100 font-semibold" : "text-zinc-300"
                        }`}
                      >
                        #{idx + 1} {img.name}
                      </span>
                    </div>
                    <span className="text-[9px] text-zinc-500 font-mono truncate leading-none mt-0.5">
                      {hasPred ? "Đã gán AI" : "Chưa chạy"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Legend with Hotkey Guidance - Single Line Optimized */}
      <div className="h-8 bg-zinc-950 border-t border-zinc-800/80 px-3 sm:px-4 flex items-center justify-between text-[11px] text-zinc-400 shrink-0 overflow-hidden select-none">
        {/* Left: Compact Semantic Colors */}
        <div className="flex items-center space-x-2.5 sm:space-x-3.5 shrink-0 whitespace-nowrap">
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-zinc-300 text-[11px]">Chi trái</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
            <span className="text-zinc-300 text-[11px]">Chi phải</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="text-zinc-300 text-[11px]">Trục thân</span>
          </span>
          <span className="flex items-center space-x-1.5 shrink-0">
            <span className="w-2.5 border-b-2 border-dashed border-amber-400 shrink-0" />
            <span className="text-zinc-400 text-[11px]">Bị che khuất</span>
          </span>
        </div>

        {/* Center: Subtle Hotkeys on Wide Screens */}
        <div className="hidden xl:flex items-center space-x-2 text-[10px] font-mono text-zinc-500 whitespace-nowrap">
          <span className="text-zinc-600">Phím tắt:</span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1 py-0.2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">Space</kbd>
            <span>Soi gốc</span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1 py-0.2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">A/D</kbd>
            <span>Đổi ảnh</span>
          </span>
          <span className="text-zinc-700">•</span>
          <span className="flex items-center space-x-1">
            <kbd className="px-1 py-0.2 bg-zinc-900 border border-zinc-800 rounded text-zinc-400">?</kbd>
            <span>Cheat sheet</span>
          </span>
        </div>

        {/* Right: Resolution Pill */}
        <div className="flex items-center space-x-2 shrink-0 whitespace-nowrap font-mono text-[10px] text-zinc-400">
          {naturalResolution && (
            <span className="px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800/80 text-zinc-300 tabular-nums">
              {naturalResolution} px
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
