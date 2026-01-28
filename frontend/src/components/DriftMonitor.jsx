import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Activity, RefreshCw } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

const DriftMonitor = ({ productId, className }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDrift = async () => {
            if (!productId) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/forecasting/${productId}/drift/`);
                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    setData(result.data);
                } else {
                    setError(result.error || 'Failed to fetch drift status');
                }
            } catch (err) {
                console.error(err);
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        fetchDrift();
    }, [productId]);

    const handleRefresh = () => {
        setData(null);
        setLoading(true);
    };

    if (loading) {
        return <LoadingSkeleton variant="card" className={className || "h-[200px]"} />;
    }

    if (error) {
        return (
            <div className={`bg-slate-900/50 rounded-xl border border-slate-800 p-6 ${className}`}>
                <div className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { drift_summary, drifted_features, recommendation, action_required } = data;

    return (
        <div className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-semibold text-white">Model Health</h3>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <RefreshCw className="w-4 h-4 text-slate-400" />
                    </button>

                    {drift_summary.data_drift_detected ? (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-red-900/50 text-red-400 border border-red-800/50">
                            <AlertTriangle className="w-3 h-3" />
                            Drift Detected
                        </span>
                    ) : (
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-emerald-900/50 text-emerald-400 border border-emerald-800/50">
                            <CheckCircle className="w-3 h-3" />
                            Stable
                        </span>
                    )}
                </div>
            </div>

            {/* Recommendation Box */}
            <div className={`p-4 rounded-lg mb-4 ${action_required
                    ? "bg-red-900/20 border border-red-800/30"
                    : "bg-emerald-900/10 border border-emerald-800/20"
                }`}>
                <p className="text-sm text-slate-300">{recommendation}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Drift Score</p>
                    <p className={`text-2xl font-bold ${drift_summary.dataset_drift_score > 0.3
                            ? "text-red-400"
                            : "text-emerald-400"
                        }`}>
                        {(drift_summary.dataset_drift_score * 100).toFixed(0)}%
                    </p>
                </div>
                <div className="text-center p-3 bg-slate-800/30 rounded-lg">
                    <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Features Drifted</p>
                    <p className="text-2xl font-bold text-white">
                        {drifted_features.length}
                    </p>
                </div>
            </div>

            {/* Drifted Features List */}
            {drifted_features.length > 0 && (
                <div className="mt-4 pt-4 border-t border-slate-800">
                    <p className="text-xs text-slate-500 mb-2">Affected Features:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {drifted_features.map((feature, i) => (
                            <span
                                key={i}
                                className="px-2 py-0.5 bg-red-900/30 text-red-400 text-xs rounded"
                            >
                                {feature}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default DriftMonitor;
