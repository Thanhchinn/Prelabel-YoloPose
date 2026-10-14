import React, { useState, useEffect } from "react";
import { Layers, ExternalLink, RefreshCw, CheckCircle2, Download, BarChart2, Loader2, Eye, Clock, ImageIcon, FolderPlus, Sparkles, Zap, Check, Settings, AlertCircle } from "lucide-react";
import { api } from "../services/api";

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

  // Task list state - giờ tải từ CVAT thật
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [filterType, setFilterType] = useState("studio");

  // Tải danh sách tasks từ CVAT khi mount component hoặc khi đổi bộ lọc
  useEffect(() => {
    loadTasks();
  }, [filterType]);

  const generateNextTaskName = (existingTasks) => {
    // Tìm số lớn nhất trong các task có dạng Pose_Batch_XXXX
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
    // Nếu chưa có task nào → dùng ngày hôm nay
    return `${basePrefix}${today}`;
  };

  const loadTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const res = await api.listCVATTasks(filterType);
      if (res && res.tasks) {
        setTasks(res.tasks);
        // Auto-generate next task name
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

      // Tải lại danh sách tasks từ CVAT để có dữ liệu thật
      await loadTasks();
    } catch (err) {
      alert("Lỗi khi kết nối tới CVAT: " + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportRetrain = async (taskId) => {
    setExportLoading(true);
    setExportMessage("Đang kéo Ground Truth từ CVAT và đóng gói dataset...");
    try {
      const res = await api.exportDataset(taskId, `yolo26_task_${taskId}`);
      setExportMessage(`Thành công! Dataset đã xuất ra: ${res.dataset_path} (${res.train_samples} train, ${res.val_samples} val). Sẵn sàng bấm lệnh train.`);
    } catch (err) {
      setExportMessage("Lỗi khi xuất dataset: " + err.message);
    } finally {
      setExportLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      "annotation": { text: "Đang gán nhãn", color: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
      "validation": { text: "Đang kiểm tra", color: "bg-blue-500/15 text-blue-400 border-blue-500/30" },
      "completed": { text: "Hoàn thành", color: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    };
    const s = map[status] || { text: status || "Pre-labeled", color: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30" };
    return (
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.color}`}>
        {s.text}
      </span>
    );
  };

  const formatModelOptionLabel = (m) => {
    if (m.id === "yolo") return `⚡ ${m.name} — Siêu nhanh (~20ms)`;
    if (m.id === "rtmpose") return `🚀 ${m.name} — Cân bằng (75.8 mAP)`;
    if (m.id === "vitpose") return `🧠 ${m.name} — Chuẩn xác cao (77.4+ mAP)`;
    return `${m.name}`;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title + Quick Settings Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-cyan-400" />
            <span>Trung tâm đồng bộ CVAT Local & Active Learning</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tạo task trên CVAT với skeleton 17 điểm COCO, nạp nhãn pre-label từ AI Engine đa mô hình và xuất dataset để huấn luyện lại.
            <span className="text-cyan-400 ml-1 font-medium">Chỉ hiển thị task được tạo từ Web Studio.</span>
          </p>
        </div>

        {onOpenCVATConfig && (
          <button
            type="button"
            onClick={onOpenCVATConfig}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 text-xs font-semibold transition-all cursor-pointer shadow-sm shrink-0 self-start sm:self-auto hover:border-cyan-500/50"
            title="Cấu hình tài khoản & máy chủ CVAT"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span>Cài đặt tài khoản CVAT</span>
          </button>
        )}
      </div>

      {/* Unauthenticated Alert for Teammates */}
      {health?.cvat_local?.online && !health?.cvat_local?.authenticated && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-4 shadow-lg shadow-amber-950/20">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-amber-200">Chưa xác thực tài khoản CVAT Local</h4>
              <p className="text-[11px] text-slate-300">
                Tài khoản CVAT hiện tại (<code className="text-amber-300 font-mono font-semibold">{health?.cvat_local?.username || "chưa cấu hình"}</code>) chưa đăng nhập được vào máy chủ.
                Vui lòng bấm nút bên cạnh để nhập đúng tài khoản / mật khẩu CVAT của bạn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenCVATConfig}
            className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-sm"
          >
            Cấu hình tài khoản
          </button>
        </div>
      )}

      {/* Sync Creation Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        {/* Subtle top ambient gradient line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        <form onSubmit={handleCreateTask} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Field 1: Task Name */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tên Task trên CVAT:</span>
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Nhập tên task..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-all shadow-inner font-mono"
                required
              />
              <p className="text-[10px] text-slate-500">
                Tự động đánh số theo đợt gần nhất đã tạo trên hệ thống.
              </p>
            </div>

            {/* Field 2: AI Pre-label Model */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-200">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Mô hình AI Pre-label:</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-medium">
                  Đang chọn
                </span>
              </div>
              {availableModels.length > 0 ? (
                <select
                  value={selectedModelType}
                  onChange={(e) => onSelectModelType && onSelectModelType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-all cursor-pointer shadow-inner"
                >
                  {availableModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatModelOptionLabel(m)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={activeModelObj.name}
                  disabled
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-400"
                />
              )}
              <p className="text-[10px] text-slate-500">
                Khung xương 17 điểm của mô hình này sẽ được đẩy sang CVAT.
              </p>
            </div>
          </div>

          {/* Action Bar: Toggle Prelabels & Submit Button */}
          <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <label className="flex items-center space-x-3 cursor-pointer select-none group">
              <div
                onClick={() => setIncludePrelabels(!includePrelabels)}
                className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  includePrelabels ? "bg-cyan-500" : "bg-slate-800"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    includePrelabels ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors flex items-center space-x-1.5">
                  <span>Nạp sẵn khung xương AI</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {activeModelObj.name.split("(")[0].trim()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">
                  {includePrelabels
                    ? "Ảnh tải lên CVAT sẽ có sẵn 17 keypoints để annotator kiểm tra và sửa nhanh."
                    : "Chỉ tải ảnh thô lên CVAT, không nạp nhãn sẵn."}
                </p>
              </div>
            </label>

            <button
              type="submit"
              disabled={isSyncing}
              className="py-2.5 px-6 rounded-xl font-semibold text-xs flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 cursor-pointer active:scale-95 shrink-0"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối CVAT & nạp nhãn...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Đồng bộ sang CVAT ({activeModelObj.name.split("(")[0].trim()})</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Sync Success Banner */}
        {syncResult && (
          <div className="mt-5 p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/40 flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-xs font-semibold text-cyan-200">
                  {syncResult.message}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Task ID: <span className="font-mono text-cyan-400">{syncResult.task_id}</span> | Số lượng: {syncResult.image_count} ảnh
                </div>
              </div>
            </div>
            <a
              href={syncResult.cvat_url}
              target="_blank"
              rel="noreferrer"
              className="py-1.5 px-3.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-colors shrink-0"
            >
              <span>Mở Task trên CVAT</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {/* Export Status Banner */}
        {exportMessage && (
          <div className="mt-4 p-3 rounded-xl bg-slate-950 border border-emerald-500/40 text-xs text-emerald-300 flex items-center space-x-2">
            <Download className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportMessage}</span>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <h3 className="text-sm font-semibold text-slate-200">
              Danh sách Task CVAT:
            </h3>
            {/* Filter Toggle Buttons */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[11px]">
              <button
                type="button"
                onClick={() => setFilterType("studio")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterType === "studio"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Task từ Web Studio
              </button>
              <button
                type="button"
                onClick={() => setFilterType("all")}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                  filterType === "all"
                    ? "bg-slate-700/60 text-slate-200 border border-slate-600 shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Tất cả Task
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400">{tasks.length} tasks</span>
            <button
              onClick={loadTasks}
              disabled={isLoadingTasks}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              title="Tải lại danh sách tasks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTasks ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {isLoadingTasks && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-8 space-x-2 text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs">Đang tải danh sách tasks từ CVAT...</span>
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-8">
            <Layers className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Chưa có task nào được tạo từ Web Studio.</p>
            <p className="text-[11px] text-slate-600 mt-1">Tạo task mới ở phần trên để bắt đầu.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-semibold">Task ID</th>
                  <th className="pb-3 font-semibold">Tên Task</th>
                  <th className="pb-3 font-semibold">Số ảnh</th>
                  <th className="pb-3 font-semibold">Trạng thái</th>
                  <th className="pb-3 font-semibold">Ngày tạo</th>
                  <th className="pb-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-3 font-mono text-cyan-400">#{t.id}</td>
                    <td className="py-3 font-medium text-slate-200">{t.name}</td>
                    <td className="py-3 text-slate-300">{t.size || "—"} ảnh</td>
                    <td className="py-3">{getStatusBadge(t.status)}</td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {t.created_date ? (
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(t.created_date).toLocaleDateString("vi-VN")}</span>
                        </span>
                      ) : "—"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Xem trên Web */}
                        <button
                          onClick={() => onViewTask && onViewTask(t.id)}
                          className="py-1 px-2 rounded-lg bg-violet-600/25 hover:bg-violet-600/40 text-violet-300 border border-violet-500/30 font-medium text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Xem nhãn pre-label trên Web Studio"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Xem Web</span>
                        </button>

                        {/* Mở trên CVAT */}
                        <a
                          href={t.cvat_url}
                          target="_blank"
                          rel="noreferrer"
                          className="py-1 px-2 rounded-lg bg-cyan-600/25 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/30 font-medium text-[11px] flex items-center space-x-1 transition-colors"
                          title="Mở Task trên CVAT để xem hoặc sửa nhãn"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Mở CVAT</span>
                        </a>

                        {/* Evaluate metrics button */}
                        <button
                          onClick={() => onEvaluateTask(t.id)}
                          className="py-1 px-2 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-medium text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Đo lường sai số và tỷ lệ sửa"
                        >
                          <BarChart2 className="w-3 h-3" />
                          <span>Metrics</span>
                        </button>

                        {/* Export Retraining Dataset */}
                        <button
                          onClick={() => handleExportRetrain(t.id)}
                          disabled={exportLoading}
                          className="py-1 px-2 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Xuất dataset chuẩn YOLO Pose để train lại"
                        >
                          <Download className="w-3 h-3" />
                          <span>Xuất Retrain</span>
                        </button>
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
