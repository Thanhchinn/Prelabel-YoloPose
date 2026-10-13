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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm flex flex-col min-h-[220px]">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-2">
        <span>Danh sách ảnh đã tải:</span>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400 font-mono">{images.length} ảnh</span>
          {images.length > 0 && (
            <button
              type="button"
              onClick={onOpenResetModal}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-gradient-to-r from-rose-500/20 to-orange-500/15 hover:from-rose-500/30 hover:to-orange-500/25 text-rose-300 border border-rose-500/30 flex items-center space-x-1 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Dọn dẹp ảnh cũ để bắt đầu đợt gán nhãn mới"
            >
              <PlusCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Bắt đầu đợt mới</span>
            </button>
          )}
        </div>
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
                onClick={() => onSelectImage(img)}
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
  );
}
