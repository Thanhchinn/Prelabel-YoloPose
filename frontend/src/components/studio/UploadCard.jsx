import React from "react";
import { Upload, PlusCircle, Loader2 } from "lucide-react";

export default function UploadCard({
  imagesCount = 0,
  onUpload,
  isUploading,
  onOpenResetModal,
}) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-3.5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-medium text-zinc-200 flex items-center space-x-1.5">
          <Upload className="w-3.5 h-3.5 text-zinc-400" />
          <span>Tải ảnh lên (Upload)</span>
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-[11px] text-zinc-500 font-mono">{imagesCount} ảnh</span>
          {imagesCount > 0 && (
            <button
              type="button"
              onClick={onOpenResetModal}
              className="px-2 py-0.5 rounded text-[10px] font-medium bg-zinc-850 hover:bg-zinc-800 text-zinc-300 border border-zinc-750 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Dọn dẹp và bắt đầu đợt gán nhãn mới"
            >
              <PlusCircle className="w-3 h-3 text-zinc-400" />
              <span>Đợt mới</span>
            </button>
          )}
        </div>
      </div>

      <label className="border border-dashed border-zinc-800 hover:border-zinc-600 rounded-lg py-3 px-4 flex items-center justify-center space-x-3 cursor-pointer transition-colors bg-zinc-950/40 hover:bg-zinc-900/40">
        <input
          type="file"
          multiple
          accept="image/*"
          onChange={onUpload}
          className="hidden"
          disabled={isUploading}
        />
        {isUploading ? (
          <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
        ) : (
          <Upload className="w-4 h-4 text-zinc-500" />
        )}
        <div className="flex flex-col">
          <span className="text-xs font-medium text-zinc-300">Click hoặc kéo thả ảnh vào đây</span>
          <span className="text-[10px] text-zinc-500">JPG, PNG, WEBP</span>
        </div>
      </label>
    </div>
  );
}
