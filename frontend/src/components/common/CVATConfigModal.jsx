import React, { useState, useEffect } from "react";
import { X, Layers, KeyRound, Globe, User, Eye, EyeOff, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { api } from "../../services/api";
import { Button, Input, Skeleton, toast } from "../ui";

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
      setPassword("");

      toast.success("Cấu hình CVAT đã lưu", {
        description: res.message || "Kết nối và lưu tài khoản CVAT thành công!",
        metadata: [
          { label: "Host", value: host.trim() },
          { label: "User", value: username.trim() },
        ],
      });

      await loadCurrentConfig();

      if (onConfigSaved) {
        onConfigSaved();
      }

      setTimeout(() => {
        if (onClose) onClose();
      }, 1400);
    } catch (err) {
      setErrorMessage(err.message || "Xác thực tài khoản CVAT thất bại.");
      toast.error("Xác thực CVAT thất bại", {
        description: err.message || "Vui lòng kiểm tra lại tài khoản hoặc địa chỉ máy chủ.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const cvatRegisterUrl = `${host.trim().replace(/\/+$/, "")}/auth/register`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-xl relative overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-300">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100 tracking-tight">Cấu hình kết nối CVAT</h3>
              <p className="text-[11px] text-zinc-400">
                Nhập tài khoản CVAT để kích hoạt đồng bộ 2 chiều
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[80vh]">
          {/* Current Status Badge or Skeleton */}
          {isLoading && !statusInfo ? (
            <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/40 space-y-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="w-4 h-4 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ) : statusInfo ? (
            <div
              className={`p-3.5 rounded-lg border text-xs flex items-start space-x-2.5 ${
                statusInfo.is_authenticated && statusInfo.server_online
                  ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                  : statusInfo.server_online
                  ? "bg-amber-500/5 border-amber-500/20 text-amber-300"
                  : "bg-rose-500/5 border-rose-500/20 text-rose-300"
              }`}
            >
              {statusInfo.is_authenticated && statusInfo.server_online ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="font-medium flex items-center justify-between">
                  <span>
                    {statusInfo.is_authenticated && statusInfo.server_online
                      ? `Đã đăng nhập: ${statusInfo.username}`
                      : statusInfo.server_online
                      ? "Chưa xác thực tài khoản CVAT"
                      : "Không thể kết nối đến máy chủ CVAT"}
                  </span>
                  {statusInfo.server_version && (
                    <span className="text-[10px] font-mono text-zinc-500">v{statusInfo.server_version}</span>
                  )}
                </div>
                <div className="text-[11px] text-zinc-400 leading-relaxed">
                  {statusInfo.is_authenticated && statusInfo.server_online
                    ? `Kết nối ổn định tới ${statusInfo.host}. Sẵn sàng tạo và kéo nhãn.`
                    : statusInfo.last_error || "Vui lòng nhập tài khoản và mật khẩu của bạn bên dưới để kết nối."}
                </div>
              </div>
            </div>
          ) : null}

          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            {/* Field: CVAT Host URL */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                <Globe className="w-3.5 h-3.5 text-zinc-400" />
                <span>Địa chỉ máy chủ CVAT (Host URL)</span>
              </label>
              <Input
                size="md"
                isMono
                type="text"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                placeholder="http://localhost:8080"
                required
              />
              <p className="text-[11px] text-zinc-500">
                Mặc định là <code className="text-zinc-300 font-mono">http://localhost:8080</code> (Docker local) hoặc IP máy chủ CVAT chung của nhóm.
              </p>
            </div>

            {/* Field: Username */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                <User className="w-3.5 h-3.5 text-zinc-400" />
                <span>Tên tài khoản CVAT (Username)</span>
              </label>
              <Input
                size="md"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập username CVAT của bạn..."
                required
              />
            </div>

            {/* Field: Password */}
            <div className="space-y-1.5">
              <label className="flex items-center space-x-1.5 text-xs font-medium text-zinc-300">
                <KeyRound className="w-3.5 h-3.5 text-zinc-400" />
                <span>Mật khẩu CVAT (Password)</span>
              </label>
              <Input
                size="md"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu CVAT..."
                trailingIcon={showPassword ? EyeOff : Eye}
                onTrailingIconClick={() => setShowPassword(!showPassword)}
                required
              />
            </div>

            {/* Error or Success Notice */}
            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Friendly Helper for Team */}
            <div className="pt-2 border-t border-zinc-800 text-[11px] text-zinc-400 space-y-1">
              <p>Hệ thống tự động lưu trữ cấu hình trên backend để không phải nhập lại sau mỗi phiên làm việc.</p>
              <div className="pt-0.5 flex items-center space-x-1 text-zinc-400">
                <span>Chưa có tài khoản trên CVAT?</span>
                <a
                  href={cvatRegisterUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-zinc-200 underline hover:text-white"
                >
                  <span>Đăng ký tại CVAT</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-3 flex items-center justify-end space-x-2.5">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={onClose}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSaving}
                loadingText="Đang lưu..."
                disabled={isLoading}
                icon={CheckCircle2}
              >
                Lưu cấu hình
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
