import React, { useState } from "react";
import { Layers, ExternalLink, RefreshCw, CheckCircle2, Download, BarChart2, AlertCircle, Loader2 } from "lucide-react";
import { api } from "../services/api";

export default function CVATSyncView({ onEvaluateTask }) {
  const [taskName, setTaskName] = useState("Pose_Batch_" + new Date().toISOString().slice(5, 10).replace("-", ""));
  const [includePrelabels, setIncludePrelabels] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const [tasks, setTasks] = useState([
    {
      id: 101,
      name: "Pose_Demo_Batch_01",
      image_count: 5,
      status: "Ready for Annotation",
      url: "http://localhost:8080/tasks/101",
    },
  ]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!taskName.trim()) return;

    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await api.syncToCVAT({
        task_name: taskName,
        include_prelabels: includePrelabels,
      });
      setSyncResult(res);

      // Thêm task vào danh sách hiển thị
      setTasks((prev) => [
        {
          id: res.task_id,
          name: res.task_name,
          image_count: res.image_count,
          status: "Pre-labeled",
          url: res.cvat_url,
        },
        ...prev,
      ]);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 flex items-center space-x-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          <span>Trung tâm đồng bộ CVAT Local & Active Learning</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Tạo task trên CVAT với skeleton 17 điểm COCO, nạp nhãn pre-label từ YOLO 26 và xuất dataset để huấn luyện lại.
        </p>
      </div>

      {/* Sync Creation Form Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleCreateTask} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tên Task trên CVAT:
              </label>
              <input
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="Nhập tên task..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-slate-100 outline-none transition-colors"
                required
              />
            </div>

            <div className="flex items-center pt-6 space-x-3">
              <input
                type="checkbox"
                id="prelabels"
                checked={includePrelabels}
                onChange={(e) => setIncludePrelabels(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
              <label htmlFor="prelabels" className="text-xs font-medium text-slate-300 cursor-pointer select-none">
                Tự động nạp khung xương 17 điểm của YOLO 26 vào ảnh
              </label>
            </div>
          </div>

          <div className="flex items-center space-x-3 pt-2">
            <button
              type="submit"
              disabled={isSyncing}
              className="py-2.5 px-6 rounded-xl font-medium text-xs flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang kết nối CVAT & nạp dữ liệu...</span>
                </>
              ) : (
                <>
                  <Layers className="w-4 h-4" />
                  <span>Đồng bộ sang CVAT Local</span>
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Danh sách Task trên CVAT Local:</h3>
          <span className="text-xs text-slate-400">{tasks.length} tasks</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider">
                <th className="pb-3 font-semibold">Task ID</th>
                <th className="pb-3 font-semibold">Tên Task</th>
                <th className="pb-3 font-semibold">Số ảnh</th>
                <th className="pb-3 font-semibold">Trạng thái</th>
                <th className="pb-3 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-3 font-mono text-cyan-400">#{t.id}</td>
                  <td className="py-3 font-medium text-slate-200">{t.name}</td>
                  <td className="py-3 text-slate-300">{t.image_count} ảnh</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {t.status}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Direct CVAT URL */}
                      <a
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                        title="Mở trên CVAT Local"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {/* Evaluate metrics button */}
                      <button
                        onClick={() => onEvaluateTask(t.id)}
                        className="py-1 px-2.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-medium text-[11px] flex items-center space-x-1 transition-colors"
                        title="Đo lường sai số và tỷ lệ sửa"
                      >
                        <BarChart2 className="w-3 h-3" />
                        <span>Metrics</span>
                      </button>

                      {/* Export Retraining Dataset */}
                      <button
                        onClick={() => handleExportRetrain(t.id)}
                        disabled={exportLoading}
                        className="py-1 px-2.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] flex items-center space-x-1 transition-colors"
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
      </div>
    </div>
  );
}
