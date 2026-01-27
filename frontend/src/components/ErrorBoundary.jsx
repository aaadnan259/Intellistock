import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null, retryCount: 0 };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo });
        // Log to an error reporting service here if available
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState(prevState => ({
            hasError: false,
            error: null,
            errorInfo: null,
            retryCount: prevState.retryCount + 1
        }));
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-slate-900/50 rounded-2xl border border-slate-800">
                    <div className="flex items-center justify-center w-16 h-16 mb-6 rounded-full bg-rose-500/10 border border-rose-500/20">
                        <AlertTriangle className="w-8 h-8 text-rose-400" />
                    </div>

                    <h3 className="text-xl font-semibold text-white mb-2">Something went wrong</h3>
                    <p className="text-slate-400 text-center mb-6 max-w-md">
                        An unexpected error occurred while rendering this component.
                        {this.state.retryCount > 0 && ` (Retry attempt: ${this.state.retryCount})`}
                    </p>

                    {process.env.NODE_ENV === 'development' && this.state.error && (
                        <details className="mb-6 w-full max-w-lg">
                            <summary className="cursor-pointer text-sm text-slate-500 hover:text-slate-300 transition-colors">
                                Show error details
                            </summary>
                            <pre className="mt-2 p-4 text-xs text-rose-300 bg-slate-950 rounded-lg overflow-auto max-h-48 border border-slate-800">
                                {this.state.error.toString()}
                                {this.state.errorInfo?.componentStack}
                            </pre>
                        </details>
                    )}

                    <button
                        onClick={this.handleRetry}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/20"
                    >
                        <RefreshCw size right={16} className={this.state.retryCount > 2 ? 'animate-spin' : ''} />
                        Try Again
                    </button>

                    {this.state.retryCount >= 3 && (
                        <p className="mt-4 text-sm text-amber-400">
                            Multiple retries failed. Please refresh the page or contact support.
                        </p>
                    )}
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
