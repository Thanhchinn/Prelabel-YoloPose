import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("PoseFlow Error Boundary caught an error:", error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-slate-100 p-6 select-none font-sans">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-slate-200">Đã xảy ra sự cố hiển thị</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống đã tự động ngăn chặn sự cố. Vui lòng nhấn làm mới để tiếp tục phiên làm việc.
              </p>
              {this.state.error?.message && (
                <div className="mt-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono text-rose-300 break-words text-left">
                  {this.state.error.message}
                </div>
              )}
            </div>
            <button
              onClick={this.handleReload}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 inline-flex items-center space-x-2 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
