import React, { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  // Explicit props typed helper for sandbox typescript resolution
  public props!: Props;

  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught exception caught by ErrorBoundary:", error, errorInfo);
  }

  private handleReset = () => {
    localStorage.clear();
    window.location.search = ''; // Reset any query params
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-2xl p-8 shadow-lg space-y-6">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertCircle className="w-8 h-8" />
              <h2 className="text-xl font-bold">시스템 컴포넌트 렌더링 지연 및 오류가 감지되었습니다.</h2>
            </div>
            
            <p className="text-sm text-slate-600 leading-relaxed font-sans">
              브라우저의 엄격한 보안 샌드박스 정책(Safari/Mac 등) 또는 로컬 캐시 불일치로 인해 UI가 일시적으로 중단되었을 수 있습니다. 시스템 상태를 자가 부트스트랩 복구하여 세션을 재연동합니다.
            </p>

            {this.state.error && (
              <div className="bg-slate-55 bg-neutral-900 text-neutral-100 p-4 rounded-xl font-mono text-xs overflow-auto max-h-48 whitespace-pre-wrap leading-relaxed">
                <span className="text-amber-400 font-bold">{this.state.error.name}:</span> {this.state.error.message}
                {this.state.error.stack && (
                  <div className="mt-2 text-[10px] text-neutral-400 border-t border-neutral-700 pt-2 font-mono">
                    {this.state.error.stack}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                로컬 저장소 초기화 후 재동기화 (강제 새로고침)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
