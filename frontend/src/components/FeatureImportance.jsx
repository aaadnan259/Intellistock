import React, { useState, useEffect } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { HelpCircle, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const FeatureImportance = ({ productId, className }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('local');

    useEffect(() => {
        const fetchExplanation = async () => {
            if (!productId) return;

            setLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/forecasting/${productId}/explain/`);
                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    setData(result.data);
                } else {
                    setError(result.error || 'Failed to fetch explanation');
                }
            } catch (err) {
                console.error(err);
                setError('Network error');
            } finally {
                setLoading(false);
            }
        };

        fetchExplanation();
    }, [productId]);

    if (loading) {
        return <LoadingSkeleton variant="chart" className={className || "h-[400px]"} />;
    }

    if (error) {
        return (
            <div className={`bg-slate-900/50 rounded-xl border border-slate-800 p-6 ${className}`}>
                <div className="flex items-center gap-2 text-red-400">
                    <HelpCircle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                </div>
            </div>
        );
    }

    if (!data) return null;

    const { global_feature_importance, prediction_explanation } = data;

    return (
        <div className={`bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6 ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-semibold text-white">Forecast Explainability</h3>
                </div>

                {/* Tab Switcher */}
                <div className="flex bg-slate-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setActiveTab('local')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'local'
                                ? "bg-purple-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                    >
                        This Prediction
                    </button>
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'global'
                                ? "bg-purple-600 text-white"
                                : "text-slate-400 hover:text-white"
                            }`}
                    >
                        Overall Importance
                    </button>
                </div>
            </div>

            {activeTab === 'local' ? (
                <>
                    {/* Explanation Text */}
                    <div className="bg-slate-800/30 rounded-lg p-4 mb-6 border border-slate-700/50">
                        <p className="text-slate-300 text-sm leading-relaxed">
                            {prediction_explanation.explanation_text}
                        </p>
                    </div>

                    {/* Feature Contributions List */}
                    <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar">
                        {prediction_explanation.contributions.map((item, i) => (
                            <div
                                key={i}
                                className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-slate-800/20 hover:bg-slate-800/40 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    {item.shap_value >= 0 ? (
                                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                    )}
                                    <span className="text-white text-sm font-medium">{item.feature}</span>
                                    <span className="text-slate-500 text-xs">({item.value})</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`text-sm font-mono font-medium ${item.shap_value >= 0 ? "text-emerald-400" : "text-red-400"
                                        }`}>
                                        {item.shap_value > 0 ? '+' : ''}{item.shap_value.toFixed(1)}
                                    </span>
                                    <span className="text-slate-500 text-xs w-12 text-right">
                                        {item.percent.toFixed(0)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                /* Global Feature Importance Chart */
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                        data={global_feature_importance.slice(0, 8)}
                        layout="vertical"
                        margin={{ left: 20, right: 20 }}
                    >
                        <XAxis
                            type="number"
                            stroke="#64748B"
                            tickFormatter={(v) => `${v.toFixed(0)}%`}
                            tick={{ fontSize: 11 }}
                        />
                        <YAxis
                            type="category"
                            dataKey="feature"
                            stroke="#64748B"
                            width={100}
                            tick={{ fontSize: 12, fill: '#CBD5E1' }}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#0F172A',
                                border: '1px solid #334155',
                                borderRadius: '8px'
                            }}
                            formatter={(value) => [`${value.toFixed(1)}%`, 'Importance']}
                        />
                        <Bar dataKey="importance_percent" radius={[0, 4, 4, 0]}>
                            {global_feature_importance.slice(0, 8).map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}

            {/* Footer Info */}
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span>Powered by SHAP</span>
                <span>Prediction for {prediction_explanation.date}</span>
            </div>
        </div>
    );
};

export default FeatureImportance;
