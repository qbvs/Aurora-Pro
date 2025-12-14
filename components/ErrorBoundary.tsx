
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 p-6">
          <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold mb-2">哎呀，出错了</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
              应用遇到了一些问题。这通常是临时的，刷新页面可能解决问题。
            </p>
            {this.state.error && (
                <div className="mb-6 p-3 bg-slate-100 dark:bg-slate-950 rounded-lg text-left overflow-auto max-h-32">
                    <code className="text-xs font-mono text-red-500">{this.state.error.message}</code>
                </div>
            )}
            <button 
              onClick={this.handleReload}
              className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <RefreshCw size={18} /> 重新加载页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
