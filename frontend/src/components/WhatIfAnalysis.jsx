import React, { useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Beaker, Play, Plus, Trash2, AlertTriangle } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';

const SCENARIO_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

const SCENARIO_TYPES = [
    { type: 'promotion', label: 'Promotion', params: { intensity: 'medium', duration_days: 7 } },
    { type: 'demand_change', label: 'Demand +15%', params: { percent_change: 15 } },
    { type: 'demand_change', label: 'Demand -20%', params: { percent_change: -20 } },
    { type: 'supply_disruption', label: 'Supply Disruption', params: { duration_days: 14 } },
    { type: 'price_change', label: 'Price +10%', params: { percent_change: 10 } },
];

const WhatIfAnalysis = ({ productId }) => {
    const [scenarios, setScenarios] = useState([]);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const addScenario = (type, params, label) => {
        if (scenarios.length >= 5) return;

        setScenarios([
            ...scenarios,
            {
                id: Date.now(),
                type,
                name: label || `Scenario ${scenarios.length + 1}`,
                parameters: params,
                description: `${label} scenario`
            }
        ]);
        // Clear previous results when scenarios change
        setResults(null);
    };

    const removeScenario = (id) => {
        setScenarios(scenarios.filter(s => s.id !== id));
        setResults(null);
    };

    const runComparison = async () => {
        if (!productId || scenarios.length === 0) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/forecasting/scenario/compare/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    product_id: productId,
                    scenarios: scenarios.map(s => ({
                        type: s.type,
                        name: s.name,
                        parameters: s.parameters,
                        description: s.description
                    })),
                    forecast_days: 30
                })
            });

            const result = await response.json();

            if (response.ok && result.status === 'success') {
                setResults(result.data);
            } else {
                setError(result.error || 'Failed to run scenarios');
            }
        } catch (err) {
            console.error(err);
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    // Build chart data
    const chartData = results?.comparison?.[0]?.adjusted_forecast.map((_, i) => {
        const point = { day: i + 1, Baseline: results.baseline_forecast[i] };
        results.comparison.forEach((s, idx) => {
            point[s.scenario_name] = s.adjusted_forecast[i];
        });
        return point;
    }) || [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Beaker className="w-6 h-6 text-purple-400" />
                    <h2 className="text-xl font-bold text-white">What-If Analysis</h2>
                </div>

                {scenarios.length > 0 && (
                    <button
                        onClick={runComparison}
                        disabled={loading || !productId}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2 transition-colors"
                    >
                        <Play className="w-4 h-4" />
                        {loading ? 'Running...' : 'Run Scenarios'}
                    </button>
                )}
            </div>

            {/* Scenario Type Buttons */}
            <div className="flex gap-2 flex-wrap">
                {SCENARIO_TYPES.map((st, i) => (
                    <button
                        key={i}
                        onClick={() => addScenario(st.type, st.params, st.label)}
                        disabled={scenarios.length >= 5}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-white transition-colors"
                    >
                        <Plus className="w-3 h-3" />
                        {st.label}
                    </button>
                ))}
            </div>

            {/* Active Scenarios */}
            {scenarios.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                    {scenarios.map((s, i) => (
                        <span
                            key={s.id}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-full text-sm text-white border border-slate-700"
                        >
                            <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }}
                            />
                            {s.name}
                            <button
                                onClick={() => removeScenario(s.id)}
                                className="hover:text-red-400 transition-colors"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </span>
                    ))}
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 p-4 bg-red-900/20 border border-red-800/30 rounded-lg text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    <span className="text-sm">{error}</span>
                </div>
            )}

            {/* Loading State */}
            {loading && <LoadingSkeleton variant="chart" className="h-[300px]" />}

            {/* Results Chart */}
            {results && !loading && (
                <div className="bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-800 p-6">
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData}>
                            <XAxis
                                dataKey="day"
                                stroke="#64748B"
                                tick={{ fontSize: 11 }}
                                tickFormatter={(v) => `Day ${v}`}
                            />
                            <YAxis
                                stroke="#64748B"
                                tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0F172A',
                                    border: '1px solid #334155',
                                    borderRadius: '8px'
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="Baseline"
                                stroke="#64748B"
                                strokeWidth={2}
                                strokeDasharray="5 5"
                                dot={false}
                            />
                            {results.comparison.map((s, i) => (
                                <Line
                                    key={s.scenario_name}
                                    type="monotone"
                                    dataKey={s.scenario_name}
                                    stroke={SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                                    strokeWidth={2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>

                    {/* Impact Summary */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {results.comparison.map((s, i) => (
                            <div
                                key={s.scenario_name}
                                className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/50"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: SCENARIO_COLORS[i % SCENARIO_COLORS.length] }}
                                    />
                                    <span className="text-white font-medium text-sm">{s.scenario_name}</span>
                                </div>
                                <div className="text-xs text-slate-400 space-y-1">
                                    <div className="flex justify-between">
                                        <span>Impact:</span>
                                        <span className={s.impact.percent_change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                                            {s.impact.percent_change >= 0 ? '+' : ''}{s.impact.percent_change.toFixed(1)}%
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Peak:</span>
                                        <span className="text-white">{s.impact.peak_demand.toFixed(0)} units</span>
                                    </div>
                                </div>
                                {s.recommendations.length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-700/50 text-xs text-slate-400">
                                        {s.recommendations[0]}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {!results && scenarios.length === 0 && !loading && (
                <div className="text-center py-12 text-slate-500">
                    <Beaker className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Add scenarios to compare forecasts</p>
                </div>
            )}
        </div>
    );
};

export default WhatIfAnalysis;
