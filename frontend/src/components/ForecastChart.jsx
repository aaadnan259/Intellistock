import React, { useMemo } from 'react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    ComposedChart,
    Line
} from 'recharts';
import LoadingSkeleton from './LoadingSkeleton';

/**
 * Forecast chart with confidence interval visualization.
 * 
 * Expected data format from backend:
 * { date: string, value: number, lower: number, upper: number }
 */
const ForecastChart = ({ data, loading }) => {
    // Transform data to support area chart for confidence band
    const chartData = useMemo(() => (data || []).map((item, index) => ({
        ...item,
        // Format date for display
        displayDate: typeof item.date === 'string'
            ? item.date.slice(5) // Show MM-DD
            : item.date,
        // Confidence band (difference between upper and lower)
        // This is used for the stacked area approach
        confidenceBand: item.upper - item.lower,
        // Index for animation
        index
    })), [data]);

    if (loading) {
        return <LoadingSkeleton variant="chart" className="h-[400px] w-full" />;
    }

    if (chartData.length === 0) {
        return (
            <div className="h-[400px] w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 flex items-center justify-center text-slate-500">
                No forecast data available
            </div>
        );
    }

    return (
        <div className="h-[400px] w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={chartData}
                    margin={{ top: 20, right: 20, bottom: 20, left: 0 }}
                >
                    <defs>
                        {/* Gradient for confidence band */}
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                        </linearGradient>
                        {/* Gradient for forecast line */}
                        <linearGradient id="forecastGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#60A5FA" />
                            <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#1E293B"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="displayDate"
                        stroke="#64748B"
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        tick={{ fontSize: 11 }}
                        interval="preserveStartEnd"
                    />

                    <YAxis
                        stroke="#64748B"
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => Math.round(value).toLocaleString()}
                    />

                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const dataPoint = payload[0]?.payload;
                                return (
                                    <div className="bg-slate-950/95 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-xl min-w-[180px]">
                                        <p className="text-slate-400 text-xs mb-3 font-medium">{dataPoint?.date}</p>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-cyan-400" />
                                                    <span className="text-slate-300 text-sm">Forecast</span>
                                                </div>
                                                <span className="text-white font-mono font-medium">
                                                    {Math.round(dataPoint?.value || 0).toLocaleString()}
                                                </span>
                                            </div>

                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-sm bg-blue-400/50" />
                                                    <span className="text-slate-400 text-xs">95% CI Range</span>
                                                </div>
                                                <span className="text-slate-300 text-xs font-mono">
                                                    {Math.round(dataPoint?.lower || 0)} – {Math.round(dataPoint?.upper || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Upper confidence bound - filled area from 0 to upper */}
                    <Area
                        type="monotone"
                        dataKey="upper"
                        stroke="none"
                        fill="url(#confidenceGradient)"
                        fillOpacity={1}
                        name="Upper Bound"
                        isAnimationActive={true}
                        animationDuration={800}
                    />

                    {/* Lower confidence bound - fill with background to "cut out" the band */}
                    <Area
                        type="monotone"
                        dataKey="lower"
                        stroke="none"
                        fill="#0F172A"
                        fillOpacity={1}
                        name="Lower Bound"
                        isAnimationActive={true}
                        animationDuration={800}
                    />

                    {/* Forecast line */}
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="url(#forecastGradient)"
                        strokeWidth={3}
                        dot={chartData.length < 30 ? { r: 3, fill: '#1E293B', strokeWidth: 2 } : false}
                        activeDot={{ r: 6, fill: '#22D3EE', strokeWidth: 0 }}
                        name="Forecast"
                        isAnimationActive={true}
                        animationDuration={1000}
                    />

                    {/* Upper bound edge line (subtle) */}
                    <Line
                        type="monotone"
                        dataKey="upper"
                        stroke="#3B82F6"
                        strokeWidth={1}
                        strokeOpacity={0.3}
                        strokeDasharray="4 4"
                        dot={false}
                        name="Upper CI"
                        isAnimationActive={true}
                    />

                    {/* Lower bound edge line (subtle) */}
                    <Line
                        type="monotone"
                        dataKey="lower"
                        stroke="#3B82F6"
                        strokeWidth={1}
                        strokeOpacity={0.3}
                        strokeDasharray="4 4"
                        dot={false}
                        name="Lower CI"
                        isAnimationActive={true}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ForecastChart;
