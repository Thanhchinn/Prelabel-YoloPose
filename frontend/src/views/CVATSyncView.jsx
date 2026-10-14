import React, { useState, useEffect } from "react";
import {
  Layers,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  Download,
  BarChart2,
  Eye,
  Clock,
  FolderPlus,
  Sparkles,
  Settings,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { api } from "../services/api";
import { Button, Input, Select, TableSkeletonRows, EmptyState, toast } from "../components/ui";

export default function CVATSyncView({
  onEvaluateTask,
  onViewTask,
  selectedModelType = "yolo",
  onSelectModelType,
  availableModels = [],
  health,
  onOpenCVATConfig,
}) {
  const [taskName, setTaskName] = useState("");
  const [includePrelabels, setIncludePrelabels] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const activeModelObj = availableModels.find((m) => m.id === selectedModelType) || {
    name: "YOLO 26 Pose",
    badge: "Fast",
  };

  // Task list state - tải từ CVAT thật
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [filterType, setFilterType] = useState("studio");

  // Tải danh sách tasks từ CVAT khi mount component hoặc khi đổi bộ lọc
  useEffect(() => {
    loadTasks();
  }, [filterType]);

  const generateNextTaskName = (existingTasks) => {
    let maxNum = 0;
    let padLength = 0;
    const today = new Date().toISOString().slice(5, 10).replace("-", "");
    const basePrefix = "Pose_Batch_";

    for (const t of existingTasks) {
      const name = (t.name || "").trim();
      if (name.startsWith(basePrefix)) {
        const numPart = name.slice(basePrefix.length).trim();
        const parsed = parseInt(numPart, 10);
        if (!isNaN(parsed) && parsed > maxNum) {
          maxNum = parsed;
          padLength = numPart.length;
        }
      }
    }

    if (maxNum > 0) {
      const nextNumStr = padLength > 0 ? String(maxNum + 1).padStart(padLength, "0") : String(maxNum + 1);
      return `${basePrefix}${nextNumStr}`;
    }
    return `${basePrefix}${today}`;
  };

  const loadTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await api.listCVATTasks(filterType);
      if (res && res.tasks) {
        setTasks(res.tasks);
        setTaskName(generateNextTaskName(res.tasks));
      } else {
        setTaskName(generateNextTaskName([]));
      }
    } catch (err) {
      console.error("Error loading CVAT tasks:", err);
      setTaskName(generateNextTaskName([]));
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncToCVAT({
        task_name: taskName,
        include_prelabels: includePrelabels,
        model_type: selectedModelType,
      });
      setSyncResult(res);
      toast.success("Đồng bộ CVAT thành công", {
        description: res.message,
        metadata: [
          { label: "Task", value: `#${res.task_id}` },
          { label: "Số ảnh", value: `${res.image_count}` },
          { label: "Model", value: activeModelObj.name.split("(")[0].trim() },
        ],
        action: res.cvat_url
          ? { label: "Mở CVAT ->", onClick: () => window.open(res.cvat_url, "_blank") }
          : null,
      });
      await loadTasks();
    } catch (err) {
      toast.error("Đồng bộ sang CVAT thất bại", {
        description: err.message,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportRetrain = async (taskId) => {
    setExportLoading(true);
    setExportMessage("Đang kéo Ground Truth từ CVAT và đóng gói dataset...");
    const toastId = toast.loading("Đang xuất dataset huấn luyện...", {
      description: `Đang kéo Ground Truth từ Task #${taskId} và đóng gói...`,
    });
    try {
      const res = await api.exportDataset(taskId, `yolo26_task_${taskId}`);
      const successMsg = `Dataset đã xuất ra: ${res.dataset_path} (${res.train_samples} train, ${res.val_samples} val). Sẵn sàng huấn luyện.`;
      setExportMessage(`Thành công! ${successMsg}`);
      toast.update(toastId, {
        type: "success",
        title: "Đóng gói Dataset thành công",
        description: "Dataset chuẩn YOLO Pose đã sẵn sàng huấn luyện lại mô hình.",
        metadata: [
          { label: "Task", value: `#${taskId}` },
          { label: "Train", value: `${res.train_samples}` },
          { label: "Val", value: `${res.val_samples}` },
        ],
      });
    } catch (err) {
      setExportMessage("Lỗi khi xuất dataset: " + err.message);
      toast.update(toastId, {
        type: "error",
        title: "Xuất Dataset thất bại",
        description: err.message,
      });
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      annotation: { text: "Đang gán nhãn", dot: "bg-amber-400", style: "bg-amber-500/10 text-amber-300 border-amber-500/20" },
      validation: { text: "Đang kiểm tra", dot: "bg-sky-400", style: "bg-sky-500/10 text-sky-300 border-sky-500/20" },
      completed: { text: "Hoàn thành", dot: "bg-emerald-400", style: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20" },
    };
    const s = map[status] || {
      text: status || "Pre-labeled",
      dot: "bg-zinc-400",
      style: "bg-zinc-800 text-zinc-300 border-zinc-700/60",
    };
    return (
      <span className={`inline-flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] font-medium border ${s.style}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        <span>{s.text}</span>
      </span>
    );
  };

  const formatModelOptionLabel = (m) => {
    if (m.id === "yolo") return `${m.name} — Siêu nhanh (~20ms)`;
    if (m.id === "rtmpose") return `${m.name} — Cân bằng (75.8 mAP)`;
    if (m.id === "vitpose") return `${m.name} — Chuẩn xác cao (77.4+ mAP)`;
    return `${m.name}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Title + Quick Settings Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight flex items-center space-x-2">
            <Layers className="w-5 h-5 text-zinc-400" />
            <span>Trung tâm đồng bộ CVAT & Active Learning</span>
          </h2>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Khởi tạo task trên CVAT với bộ xương 17 điểm COCO, nạp nhãn từ AI Engine và xuất dataset huấn luyện.
          </p>
        </div>

        {onOpenCVATConfig && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenCVATConfig}
            icon={Settings}
            className="shrink-0 self-start sm:self-auto"
            title="Cấu hình tài khoản & máy chủ CVAT"
          >
            Cài đặt CVAT
          </Button>
        )}
      </div>

      {/* Unauthenticated Alert */}
      {health?.cvat_local?.online && !health?.cvat_local?.authenticated && (
        <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start justify-between gap-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-medium text-amber-200">Chưa xác thực tài khoản CVAT Local</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Tài khoản CVAT hiện tại (<code className="text-amber-300 font-mono text-[11px]">{health?.cvat_local?.username || "chưa cấu hình"}</code>) chưa đăng nhập được vào máy chủ. Vui lòng bấm cài đặt để cấu hình lại.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOpenCVATConfig}
            className="bg-amber-500 hover:bg-amber-400 text-zinc-950 font-medium shrink-0"
          >
            Cấu hình
          </Button>
        </div>
      )}

      {/* Sync Creation Form Card */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 shadow-xs">
        <form onSubmit={handleCreateTask} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field 1: Task Name */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                <FolderPlus className="w-3.5 h-3.5 text-zinc-400" />
                <span>Tên Task trên CVAT</span>
              </label>
              <Input
                size="md"
                isMono
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Nhập tên task..."
                required
              />
              <p className="text-[11px] text-zinc-500">
                Tự động đánh số theo đợt gần nhất đã tạo trên hệ thống.
              </p>
            </div>

            {/* Field 2: AI Pre-label Model */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                  <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Mô hình AI Pre-label</span>
                </label>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60 font-medium">
                  Đang chọn
                </span>
              </div>
              {availableModels.length > 0 ? (
                <Select
                  size="md"
                  value={selectedModelType}
                  onChange={(e) => onSelectModelType && onSelectModelType(e.target.value)}
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatModelOptionLabel(m)}
                    </option>
                  ))}
                </Select>
              ) : (
                <Input
                  size="md"
                  type="text"
                  value={activeModelObj.name}
                  disabled
                />
              )}
              <p className="text-[11px] text-zinc-500">
                Khung xương 17 điểm của mô hình này sẽ được nạp sang CVAT.
              </p>
            </div>
          </div>

          {/* Action Bar: Toggle Prelabels & Submit Button */}
          <div className="pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center space-x-3 cursor-pointer select-none group">
              <div
                onClick={() => setIncludePrelabels(!includePrelabels)}
                className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors duration-150 ${
                  includePrelabels ? "bg-zinc-100" : "bg-zinc-800"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full shadow-xs transform transition-transform duration-150 ${
                    includePrelabels ? "translate-x-4 bg-zinc-950" : "translate-x-0 bg-zinc-400"
                  }`}
                />
              </div>
              <div>
                <div className="text-xs font-medium text-zinc-200 group-hover:text-zinc-100 transition-colors flex items-center space-x-1.5">
                  <span>Nạp sẵn khung xương AI</span>
                  <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                    {activeModelObj.name.split("(")[0].trim()}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  {includePrelabels
                    ? "Ảnh tải lên CVAT sẽ có sẵn 17 keypoints để annotator kiểm tra và sửa nhanh."
                    : "Chỉ tải ảnh thô lên CVAT, không nạp nhãn sẵn."}
                </p>
              </div>
            </label>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSyncing}
              loadingText="Đang đồng bộ CVAT..."
              icon={Layers}
              className="shrink-0"
            >
              Đồng bộ sang CVAT ({activeModelObj.name.split("(")[0].trim()})
            </Button>
          </div>
        </form>

        {/* Sync Success Banner */}
        {syncResult && (
          <div className="mt-4 p-3.5 rounded-lg bg-emerald-500/5 border border-emerald-500/20 flex items-start justify-between gap-4">
            <div className="flex items-start space-x-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-medium text-emerald-300">
                  {syncResult.message}
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Task ID: <span className="font-mono text-zinc-200">#{syncResult.task_id}</span> • Số lượng: {syncResult.image_count} ảnh
                </div>
              </div>
            </div>
            <a
              href={syncResult.cvat_url}
              target="_blank"
              rel="noreferrer"
              className="py-1 px-2.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 font-medium text-xs flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <span>Mở CVAT</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          </div>
        )}

        {/* Export Status Banner */}
        {exportMessage && (
          <div className="mt-3 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-center space-x-2">
            <Download className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span>{exportMessage}</span>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h3 className="text-xs font-medium text-zinc-200 uppercase tracking-wider">
              Danh sách Task CVAT
            </h3>
            {/* Filter Toggle Buttons */}
            <div className="flex items-center bg-zinc-950 p-0.5 rounded-lg border border-zinc-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType("studio")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterType === "studio"
                    ? "bg-zinc-850 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Từ Web Studio
              </button>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterType === "all"
                    ? "bg-zinc-850 text-zinc-100 shadow-xs"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Tất cả Task
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-zinc-500 font-mono">{tasks.length} tasks</span>
            <Button
              variant="secondary"
              size="sm"
              onClick={loadTasks}
              disabled={isLoadingTasks}
              className="h-7 w-7 p-0"
              title="Tải lại danh sách tasks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? "animate-spin text-zinc-200" : ""}`} />
            </Button>
          </div>
        </div>

        {/* Loading State with TableSkeletonRows */}
        {isLoadingTasks && tasks.length === 0 ? (
          <div className="py-2">
            <TableSkeletonRows rows={4} />
          </div>
        ) : tasks.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Chưa có task nào được tạo từ Web Studio"
            description="Khởi tạo task mới ở biểu mẫu phía trên để tải ảnh và nhãn AI sang CVAT cho đội ngũ kiểm duyệt."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/40">
                <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] tracking-wider font-mono">
                  <th className="py-2.5 px-3 font-medium">ID</th>
                  <th className="py-2.5 px-2 font-medium">Tên Task</th>
                  <th className="py-2.5 px-2 font-medium">Số ảnh</th>
                  <th className="py-2.5 px-2 font-medium">Trạng thái</th>
                  <th className="py-2.5 px-2 font-medium">Ngày tạo</th>
                  <th className="py-2.5 px-3 font-medium text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {tasks.map((t) => (
                  <tr key={t.id} className="group hover:bg-zinc-900/50 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-zinc-400 tabular-nums">
                      <span className="text-zinc-600 text-[10px]">#</span>
                      <span className="font-semibold text-zinc-200">{t.id}</span>
                    </td>
                    <td className="py-2.5 px-2 font-medium text-zinc-200">
                      <span className="truncate group-hover:text-white transition-colors">{t.name}</span>
                    </td>
                    <td className="py-2.5 px-2 font-mono tabular-nums">
                      {t.size !== undefined && t.size !== null ? (
                        <span className="inline-flex items-center space-x-1.5 text-zinc-300 text-xs">
                          <ImageIcon className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <span className="font-medium text-zinc-200">{t.size}</span>
                          <span className="text-[11px] text-zinc-500 font-sans">ảnh</span>
                        </span>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2">{getStatusBadge(t.status)}</td>
                    <td className="py-2.5 px-2 text-zinc-500 text-[11px] font-mono">
                      {t.created_date ? (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3 text-zinc-600 shrink-0" />
                          <span>{new Date(t.created_date).toLocaleDateString("vi-VN")}</span>
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Cụm 3 nút phụ tinh tế: Xem, Metrics, CVAT */}
                        <div className="inline-flex items-center rounded-lg bg-zinc-950/60 p-0.5 border border-transparent group-hover:border-zinc-800/80 transition-all">
                          {/* Xem trên Web */}
                          <button
                            type="button"
                            onClick={() => onViewTask && onViewTask(t.id)}
                            className="h-6.5 px-2 rounded-md text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Xem nhãn pre-label trên Web Studio"
                          >
                            <Eye className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>Xem</span>
                          </button>

                          {/* Evaluate metrics button */}
                          <button
                            type="button"
                            onClick={() => onEvaluateTask(t.id)}
                            className="h-6.5 px-2 rounded-md text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 flex items-center space-x-1 transition-colors cursor-pointer"
                            title="Đo lường sai số và tỷ lệ sửa (QA & Metrics)"
                          >
                            <BarChart2 className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>Metrics</span>
                          </button>

                          {/* Mở trên CVAT */}
                          <a
                            href={t.cvat_url}
                            target="_blank"
                            rel="noreferrer"
                            className="h-6.5 px-2 rounded-md text-[11px] font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-850 inline-flex items-center space-x-1 transition-colors"
                            title="Mở Task trên CVAT để xem hoặc sửa nhãn"
                          >
                            <ExternalLink className="w-3 h-3 text-zinc-400 shrink-0" />
                            <span>CVAT</span>
                          </a>
                        </div>

                        {/* Nút Xuất: Nút hành động chính có điểm nhấn nhẹ dứt khoát */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleExportRetrain(t.id)}
                          disabled={exportLoading}
                          icon={Download}
                          className="h-7 px-2.5 text-[11px] font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-750/90 shadow-xs group-hover:border-zinc-600 transition-all"
                          title="Xuất dataset chuẩn YOLO Pose để train lại"
                        >
                          Xuất
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
