import React from "react";
import { Upload, PlusCircle, Loader2 } from "lucide-react";

export default function UploadCard({
  imagesCount = 0,
  onUpload,
  isUploading,
  onOpenResetModal,
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-200 flex items-center space-x-1.5">
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>Tải ảnh lên (Upload)</span>
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-slate-400 font-mono">{imagesCount} ảnh</span>
          {imagesCount > 0 && (
            <button
              type="button"
              onClick={onOpenResetModal}
              className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center space-x-1 transition-all cursor-pointer shadow-sm active:scale-95"
              title="Dọn dẹp và bắt đầu đợt gán nhãn mới"
            >
              <PlusCircle className="w-3 h-3 text-rose-400" />
              <span>Đợt mới</span>
            </button>
          )}
        </div>
      </div>

      <label className="border-2 border-dashed border-slate-700/80 hover:border-cyan-500/60 rounded-xl py-3 px-4 flex items-center justify-center space-x-3 cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-800/30">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onUpload}
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
  );
}
