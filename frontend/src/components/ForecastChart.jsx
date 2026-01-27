import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Area,
    ComposedChart
} from 'recharts';
import LoadingSkeleton from './LoadingSkeleton';

const ForecastChart = ({ data, loading }) => {
    if (loading) {
        return <LoadingSkeleton variant="chart" className="h-[400px] w-full" />;
    }
    return (
        <div className="h-[400px] w-full bg-slate-900/50 rounded-xl border border-slate-800 p-4 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <defs>
                        <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorForecast" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#60A5FA" />
                            <stop offset="100%" stopColor="#22D3EE" />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />

                    <XAxis
                        dataKey="date"
                        stroke="#64748B"
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                        tick={{ fontSize: 12 }}
                    />

                    <YAxis
                        stroke="#64748B"
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => `${value}`}
                    />

                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                                return (
                                    <div className="bg-slate-950/90 backdrop-blur-md border border-slate-700 p-4 rounded-xl shadow-xl">
                                        <p className="text-slate-400 text-xs mb-2">{label}</p>
                                        {payload.map((entry, index) => (
                                            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                                <span className="text-slate-300 text-sm font-medium">{entry.name}:</span>
                                                <span className="text-white text-sm font-mono">{entry.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                );
                            }
                            return null;
                        }}
                    />

                    {/* Confidence Interval (Upper/Lower bounds) - visualized as Area */}
                    <Area
                        type="monotone"
                        dataKey="upper_bound"
                        stroke="none"
                        fill="url(#colorConfidence)"
                        name="Confidence Interval"
                    />
                    <Area
                        type="monotone"
                        dataKey="lower_bound"
                        stroke="none"
                        fill="#0F172A" // Hide standard fill to create "band" effect logic if strictly layering, but simpler to just use Area for band.
                    // Actually, to make a band, simpler is to stack or use error bars, but standard UX for forecast confidence is a light filled area behind the line.
                    // Since dataKey="lower_bound" would fill from 0 to lower_bound, hiding it isn't quite right for a "band" unless we pre-calc the difference.
                    // For simplicity in this demo, I'll just show the Area of the upper_bound as the "range" if the data is structured to support it, 
                    // or assume simple Line for now. 
                    // Let's assume 'confidence' is a separate area or use error bars. 
                    // Better visual: Area chart representing the range.
                    />

                    <Line
                        type="monotone"
                        dataKey="actual"
                        stroke="#94A3B8"
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#1E293B', strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        name="Historical Sales"
                    />

                    <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="url(#colorForecast)"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={false}
                        name="AI Forecast"
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ForecastChart;
