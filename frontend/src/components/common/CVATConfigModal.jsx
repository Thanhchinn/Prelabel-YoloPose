import React, { useState, useEffect } from "react";
import { X, Layers, KeyRound, Globe, User, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { api } from "../../services/api";

export default function CVATConfigModal({ isOpen, onClose, onConfigSaved }) {
  const [host, setHost] = useState("http://localhost:8080");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusInfo, setStatusInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      loadCurrentConfig();
    }
  }, [isOpen]);

  const loadCurrentConfig = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");
    try {
      const data = await api.getCVATConfig();
      if (data) {
        setHost(data.host || "http://localhost:8080");
        setUsername(data.username || "");
        setStatusInfo(data);
      }
    } catch (err) {
      setErrorMessage("Không thể tải cấu hình CVAT: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMessage("Vui lòng nhập tên tài khoản CVAT.");
      return;
    }
    if (!password.trim()) {
      setErrorMessage("Vui lòng nhập mật khẩu tài khoản CVAT.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const res = await api.updateCVATConfig({
        host: host.trim(),
        username: username.trim(),
        password: password.trim(),
      });

      setSuccessMessage(res.message || "Kết nối và lưu tài khoản CVAT thành công!");
      setPassword(""); // Xóa trường mật khẩu sau khi lưu

      // Tải lại status mới
      await loadCurrentConfig();

      if (onConfigSaved) {
        onConfigSaved();
      }

      // Tự động đóng sau 1.5s nếu muốn hoặc để user tự đóng
      setTimeout(() => {
        if (onClose) onClose();
      }, 1400);
    } catch (err) {
      setErrorMessage(err.message || "Xác thực tài khoản CVAT thất bại.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const cvatRegisterUrl = `${host.trim().rstrip ? host.trim().replace(/\/+$/, "") : host.trim()}/auth/register`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
        {/* Top ambient gradient */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Cấu hình Tài khoản & Máy chủ CVAT</h3>
              <p className="text-[11px] text-slate-400">
                Nhập tài khoản CVAT của bạn để đồng bộ task và nhãn 2 chiều
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[80vh]">
          {/* Current Status Badge */}
          {statusInfo && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start space-x-3 ${
                statusInfo.is_authenticated && statusInfo.server_online
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                  : statusInfo.server_online
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  : "bg-rose-500/10 border-rose-500/30 text-rose-300"
              }`}
            >
              {statusInfo.is_authenticated && statusInfo.server_online ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="font-semibold flex items-center justify-between">
                  <span>
                    {statusInfo.is_authenticated && statusInfo.server_online
                      ? `Đã đăng nhập thành công: ${statusInfo.username}`
                      : statusInfo.server_online
                      ? "Chưa xác thực tài khoản CVAT"
                      : "Không thể kết nối đến máy chủ CVAT"}
                  </span>
                  {statusInfo.server_version && (
                    <span className="text-[10px] font-mono opacity-80">v{statusInfo.server_version}</span>
                  )}
                </div>
                <div className="text-[11px] opacity-90 leading-relaxed">
                  {statusInfo.is_authenticated && statusInfo.server_online
                    ? `Kết nối ổn định tới ${statusInfo.host}. Sẵn sàng tạo và kéo nhãn.`
                    : statusInfo.last_error || "Vui lòng nhập tài khoản và mật khẩu của bạn bên dưới để kết nối."}
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Field: CVAT Host URL */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <Globe className="w-3.5 h-3.5 text-cyan-400" />
                <span>Địa chỉ máy chủ CVAT (Host URL):</span>
              </label>
              <input
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="http://localhost:8080"
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-all font-mono shadow-inner"
                required
              />
              <p className="text-[10px] text-slate-500">
                Mặc định là <code className="text-cyan-400">http://localhost:8080</code> (nếu chạy Docker local) hoặc IP máy chủ CVAT chung của nhóm.
              </p>
            </div>

            {/* Field: Username */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <User className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tên tài khoản CVAT (Username):</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username CVAT của bạn..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 outline-none transition-all shadow-inner"
                required
              />
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-semibold text-slate-300">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Mật khẩu CVAT (Password):</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu CVAT..."
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-cyan-500 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 outline-none transition-all shadow-inner"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error or Success Notice */}
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Friendly Helper for Team */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <p>💡 <strong className="text-slate-300">Dành cho thành viên mới:</strong> Mỗi bạn khi clone về chỉ cần nhập tài khoản CVAT của máy mình 1 lần duy nhất, hệ thống sẽ tự động lưu vĩnh viễn.</p>
              <div className="pt-1 flex items-center space-x-1.5 text-cyan-400">
                <span>Chưa có tài khoản trên CVAT?</span>
                <a
                  href={cvatRegisterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 underline hover:text-cyan-300"
                >
                  <span>Mở trang đăng ký CVAT</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isSaving || isLoading}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/25 flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang kiểm tra & lưu...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Kiểm tra & Lưu cấu hình</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
