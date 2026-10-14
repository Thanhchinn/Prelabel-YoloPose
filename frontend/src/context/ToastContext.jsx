import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from "lucide-react";

const ToastContext = createContext(null);

let globalToastHandler = null;

export const toast = (options) => {
  if (globalToastHandler) {
    return globalToastHandler.show(options);
  }
  console.warn("ToastProvider not found in component tree");
  return null;
};

toast.success = (title, options = {}) => toast({ ...options, title, type: "success" });
toast.error = (title, options = {}) => toast({ ...options, title, type: "error" });
toast.warning = (title, options = {}) => toast({ ...options, title, type: "warning" });
toast.info = (title, options = {}) => toast({ ...options, title, type: "info" });
toast.loading = (title, options = {}) => toast({ ...options, title, type: "loading", duration: Infinity });
toast.dismiss = (id) => globalToastHandler?.dismiss(id);
toast.update = (id, updates) => globalToastHandler?.update(id, updates);
toast.promise = async (promise, { loading = "Đang xử lý...", success, error }) => {
  const id = toast.loading(loading);
  try {
    const result = await promise;
    const successOpts = typeof success === "function" ? success(result) : success;
    toast.update(id, {
      type: "success",
      title: typeof successOpts === "string" ? successOpts : successOpts?.title || "Thành công",
      ...successOpts,
      duration: successOpts?.duration || 4000,
    });
    return result;
  } catch (err) {
    const errorOpts = typeof error === "function" ? error(err) : error;
    toast.update(id, {
      type: "error",
      title: typeof errorOpts === "string" ? errorOpts : errorOpts?.title || "Thao tác thất bại",
      description: err.message || errorOpts?.description,
      ...errorOpts,
      duration: errorOpts?.duration || 5000,
    });
    throw err;
  }
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());

  const dismiss = useCallback((id) => {
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((options) => {
    const id = options.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const duration = options.duration !== undefined ? options.duration : 4200;

    const newToast = {
      id,
      type: options.type || "info",
      title: options.title || "",
      description: options.description || null,
      metadata: options.metadata || null, // Array of { label, value }
      action: options.action || null, // { label, onClick }
      duration,
    };

    setToasts((prev) => {
      // Giới hạn hiển thị tối đa 4 toasts cùng lúc
      const filtered = prev.filter((t) => t.id !== id);
      return [...filtered.slice(-3), newToast];
    });

    if (duration !== Infinity && duration > 0) {
      if (timersRef.current.has(id)) {
        clearTimeout(timersRef.current.get(id));
      }
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    }

    return id;
  }, [dismiss]);

  const update = useCallback((id, updates) => {
    const duration = updates.duration !== undefined ? updates.duration : 4200;

    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updates, duration } : t))
    );

    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }

    if (duration !== Infinity && duration > 0) {
      const timer = setTimeout(() => {
        dismiss(id);
      }, duration);
      timersRef.current.set(id, timer);
    }
  }, [dismiss]);

  // Đăng ký global handler
  globalToastHandler = { show, dismiss, update };

  return (
    <ToastContext.Provider value={{ toast, show, dismiss, update }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return toast;
  }
  return toast;
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex flex-col space-y-2.5 pointer-events-none max-w-sm w-full sm:w-[380px]"
    >
      {toasts.map((item) => (
        <ToastItem key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ item, onDismiss }) {
  const { id, type, title, description, metadata, action, duration } = item;

  const getTheme = () => {
    switch (type) {
      case "success":
        return {
          stripe: "bg-emerald-500",
          progress: "bg-emerald-500/80",
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
        };
      case "error":
        return {
          stripe: "bg-rose-500",
          progress: "bg-rose-500/80",
          icon: <AlertCircle className="w-4 h-4 text-rose-400" />,
        };
      case "warning":
        return {
          stripe: "bg-amber-500",
          progress: "bg-amber-500/80",
          icon: <AlertTriangle className="w-4 h-4 text-amber-400" />,
        };
      case "loading":
        return {
          stripe: "bg-zinc-400",
          progress: "bg-zinc-500",
          icon: <Loader2 className="w-4 h-4 text-zinc-300 animate-spin" />,
        };
      default:
        return {
          stripe: "bg-sky-500",
          progress: "bg-sky-500/80",
          icon: <Info className="w-4 h-4 text-sky-400" />,
        };
    }
  };

  const theme = getTheme();

  return (
    <div
      className="pointer-events-auto relative overflow-hidden rounded-lg bg-zinc-950/95 backdrop-blur-md border border-zinc-800/90 shadow-2xl shadow-black/80 flex flex-col transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in select-none group"
    >
      {/* Vạch chỉ báo trạng thái dọc siêu mảnh */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${theme.stripe}`} />

      {/* Nội dung Toast */}
      <div className="pl-4 pr-3 py-3 flex items-start space-x-2.5">
        <div className="mt-0.5 shrink-0">{theme.icon}</div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-xs font-semibold text-zinc-100 tracking-tight leading-snug">
            {title}
          </div>

          {description && (
            <div className="text-[11px] text-zinc-400 leading-relaxed break-words font-sans">
              {description}
            </div>
          )}

          {/* Structured Telemetry Metadata */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {metadata.map((m, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                >
                  {m.label && <span className="text-zinc-500">{m.label}:</span>}
                  <span className="font-semibold text-zinc-200">{m.value}</span>
                </span>
              ))}
            </div>
          )}

          {/* Action Button */}
          {action && (
            <div className="pt-1.5">
              <button
                type="button"
                onClick={() => {
                  action.onClick?.();
                  onDismiss(id);
                }}
                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-850 text-zinc-200 hover:text-white border border-zinc-800 hover:border-zinc-700 text-[11px] font-medium transition-colors cursor-pointer shadow-xs"
              >
                <span>{action.label}</span>
              </button>
            </div>
          )}
        </div>

        {/* Nút đóng */}
        <button
          type="button"
          onClick={() => onDismiss(id)}
          className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-colors cursor-pointer shrink-0"
          title="Đóng thông báo"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Thanh tiến trình tự đóng siêu mảnh */}
      {duration && duration !== Infinity && (
        <div className="w-full bg-zinc-900/40 h-[1.5px] overflow-hidden">
          <div
            className={`h-full ${theme.progress}`}
            style={{
              animation: `toast-progress ${duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
}
