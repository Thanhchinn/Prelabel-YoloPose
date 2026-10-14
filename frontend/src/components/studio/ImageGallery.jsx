import React from "react";
import { Image as ImageIcon, CheckCircle, ArrowRight, PlusCircle } from "lucide-react";

export default function ImageGallery({
  images = [],
  selectedImage,
  onSelectImage,
  predictionsMap = {},
  onOpenResetModal,
  onNavigateToCVAT,
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3 shadow-xs flex flex-col space-y-2">
      <div className="flex items-center justify-between text-xs font-medium text-zinc-300">
        <span>Hàng đợi ảnh (Queue)</span>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-zinc-500 font-mono">{images.length} ảnh</span>
          {images.length > 0 && (
            <button
              type="button"
              onClick={onOpenResetModal}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Dọn dẹp ảnh cũ để bắt đầu đợt gán nhãn mới"
            >
              <PlusCircle className="w-3 h-3 text-zinc-400" />
              <span>Đợt mới</span>
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[140px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
        {images.length === 0 ? (
          <div className="text-center py-4 text-xs text-zinc-500">Chưa có ảnh nào được tải lên.</div>
        ) : (
          images.map((img) => {
            const isSelected = selectedImage?.name === img.name;
            const hasPred = img.has_prediction || predictionsMap[img.name];
            return (
              <div
                key={img.name}
                onClick={() => onSelectImage(img)}
                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-colors ${
                  isSelected
                    ? "bg-zinc-850 border-zinc-600 text-zinc-100 shadow-xs"
                    : "bg-zinc-950/40 border-zinc-850 hover:bg-zinc-900/40 text-zinc-400"
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  <ImageIcon className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                  <span className="text-xs truncate font-mono">{img.name}</span>
                </div>
                {hasPred && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center space-x-1 shrink-0 font-mono font-medium">
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Labeled</span>
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
        className="mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 hover:border-zinc-750 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
      >
        <span>Đồng bộ sang CVAT Hub</span>
        <ArrowRight className="w-3.5 h-3.5 text-zinc-400" />
      </button>
    </div>
  );
}
