import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import {
  LS_BILLS_KEY,
  LS_HOUSE_KEY,
  LS_RULES_KEY,
  safeRemoveLocalStorage,
} from '../../context/householdStorageAndNormalizers';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<
  AppErrorBoundaryProps,
  AppErrorBoundaryState
> {
  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected rendering error occurred.',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('HouseSplits UI ErrorBoundary caught error:', error, info);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleResetCacheAndReload = (): void => {
    safeRemoveLocalStorage(LS_BILLS_KEY);
    safeRemoveLocalStorage(LS_HOUSE_KEY);
    safeRemoveLocalStorage(LS_RULES_KEY);
    window.location.reload();
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white">Something went wrong</h1>
              <p className="text-xs text-zinc-400">
                HouseSplits recovered from an unexpected display error.
              </p>
            </div>
          </div>

          {this.state.errorMessage && (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-mono text-rose-300 break-words">
              {this.state.errorMessage}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
            <button
              type="button"
              onClick={this.handleResetCacheAndReload}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs border border-zinc-700 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>Reset Local Cache &amp; Reload</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
}
