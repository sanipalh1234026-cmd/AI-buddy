import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  AlertTriangle, 
  RotateCcw, 
  Home, 
  Plus, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { reportError, addBreadcrumb, getRecentErrors, clearErrorLogs } from '../services/errorLogger';

export { reportError, addBreadcrumb, getRecentErrors, clearErrorLogs };

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode | ((props: { error: Error; resetErrorBoundary: () => void }) => ReactNode);
  resetKeys?: any[];
  context?: Record<string, any>;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onGoHome?: () => void;
  onNewChat?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Capture stack traces and report to console.error + backend telemetry service
    reportError(error, errorInfo, {
      ...(this.props.context || {}),
      resetKeys: this.props.resetKeys,
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // If resetKeys change (e.g., activeSessionId or currentMode changed), auto-recover
    if (this.state.hasError && this.props.resetKeys && prevProps.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );
      if (hasKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  public resetErrorBoundary = () => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  private handleGoHome = () => {
    this.resetErrorBoundary();
    if (this.props.onGoHome) {
      this.props.onGoHome();
    }
  };

  private handleNewChat = () => {
    this.resetErrorBoundary();
    if (this.props.onNewChat) {
      this.props.onNewChat();
    }
  };

  private handleCopyDetails = async () => {
    const { error, errorInfo } = this.state;
    const details = [
      `Error: ${error?.name || 'Error'}: ${error?.message || 'Unknown error'}`,
      `Stack:\n${error?.stack || 'N/A'}`,
      `Component Stack:\n${errorInfo?.componentStack || 'N/A'}`,
      `Timestamp: ${new Date().toISOString()}`,
      `URL: ${window.location.href}`,
    ].join('\n\n');

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(details);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = details;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch (e) {
      console.error('Failed to copy error details:', e);
    }
  };

  public render() {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { children, fallback, onGoHome, onNewChat } = this.props;

    if (hasError && error) {
      if (typeof fallback === 'function') {
        return fallback({ error, resetErrorBoundary: this.resetErrorBoundary });
      }
      if (fallback) {
        return fallback;
      }

      return (
        <div className="flex-1 w-full h-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gray-50/50 dark:bg-gray-950/50 overflow-y-auto">
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-200">
            {/* Header Icon */}
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
              Something went wrong in this view
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 leading-relaxed max-w-md mx-auto">
              AI Buddy encountered an unexpected runtime issue while displaying this component. Your chat history, saved sessions, and settings are safe.
            </p>

            {/* Main Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={this.resetErrorBoundary}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium shadow-sm hover:shadow transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Try Again</span>
              </button>

              {onGoHome && (
                <button
                  type="button"
                  onClick={this.handleGoHome}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium transition cursor-pointer"
                >
                  <Home className="w-4 h-4" />
                  <span>Return to Home</span>
                </button>
              )}

              {onNewChat && (
                <button
                  type="button"
                  onClick={this.handleNewChat}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Start New Chat</span>
                </button>
              )}
            </div>

            {/* Collapsible Error Details Accordion */}
            <div className="border-t border-gray-100 dark:border-gray-800/80 pt-4 text-left">
              <button
                type="button"
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="w-full flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition py-1 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                  {showDetails ? 'Hide technical diagnostics' : 'Show technical diagnostics'}
                </span>
                {showDetails ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showDetails && (
                <div className="mt-3 p-3.5 rounded-xl bg-gray-900 dark:bg-black text-gray-200 text-xs font-mono border border-gray-800 overflow-hidden text-left relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
                    <span className="text-gray-400 text-[11px] font-sans font-medium">Error Details</span>
                    <button
                      type="button"
                      onClick={this.handleCopyDetails}
                      className="inline-flex items-center gap-1 text-[11px] font-sans text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 px-2 py-0.5 rounded transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="max-h-56 overflow-y-auto space-y-2 pr-1 select-text scrollbar-thin">
                    <div className="text-rose-400 font-semibold break-all">
                      {error.name}: {error.message}
                    </div>
                    {error.stack && (
                      <pre className="text-[11px] text-gray-400 whitespace-pre-wrap break-all leading-tight font-mono">
                        {error.stack}
                      </pre>
                    )}
                    {errorInfo?.componentStack && (
                      <div className="pt-2 border-t border-gray-800/80">
                        <span className="text-gray-500 text-[10px] uppercase font-sans tracking-wider block mb-1">
                          Component Stack
                        </span>
                        <pre className="text-[10px] text-gray-400 whitespace-pre-wrap break-all leading-tight font-mono">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}
