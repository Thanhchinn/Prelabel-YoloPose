import React from "react";
import { FolderX } from "lucide-react";

export function EmptyState({
  icon: Icon = FolderX,
  title = "Không có dữ liệu",
  description = "Hiện tại chưa có mục nào để hiển thị.",
  action,
  className = "",
}) {
  return (
    <div
      className={`text-center py-12 px-4 border border-dashed border-zinc-800/80 rounded-xl bg-zinc-950/20 ${className}`}
    >
      <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 mx-auto mb-3">
        <Icon className="w-5 h-5 text-zinc-400" />
      </div>
      <h4 className="text-xs font-medium text-zinc-200">{title}</h4>
      {description && (
        <p className="text-[11px] text-zinc-500 mt-1 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
