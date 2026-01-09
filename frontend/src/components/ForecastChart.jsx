import React from 'react';
import {
    ComposedChart,
    Line,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';

const ForecastChart = ({ data, todayIndex }) => {
    // Transform data to include range for confidence interval
    // Expected input: [{ date: '2023-01-01', historical: 100, forecast: null, lower: null, upper: null }, ...]
    
    const transformedData = data.map(item => ({
        ...item,
        // Create a range array for the Area component [lower, upper]
        confidenceRange: item.lower !== null && item.upper !== null 
            ? [item.lower, item.upper] 
            : null,
        // For better visualization, we need separate lower and upper values
        ci_lower: item.lower,
        ci_upper: item.upper,
    }));

    // Find the date where forecast starts (for the reference line)
    const todayDate = transformedData.find(d => d.forecast !== null && d.historical === null)?.date;

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0]?.payload;
            return (
                <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
                    <p className="text-sm font-semibold text-slate-800 mb-2">{label}</p>
                    {data?.historical !== null && data?.historical !== undefined && (
                        <p className="text-sm text-blue-600">
                            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
                            Historical: {data.historical.toFixed(0)} units
                        </p>
                    )}
                    {data?.forecast !== null && data?.forecast !== undefined && (
                        <>
                            <p className="text-sm text-orange-600">
                                <span className="inline-block w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                                Forecast: {data.forecast.toFixed(0)} units
                            </p>
                            {data?.ci_lower !== null && data?.ci_upper !== null && (
                                <p className="text-xs text-slate-500 mt-1">
                                    80% CI: {data.ci_lower.toFixed(0)} - {data.ci_upper.toFixed(0)}
                                </p>
                            )}
                        </>
                    )}
                </div>
            );
        }
        return null;
    };

    // Format date for X-axis (show only every nth label to prevent crowding)
    const formatXAxis = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div className="h-[400px] w-full rounded-xl bg-white p-4 shadow-sm border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={transformedData}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 20,
                    }}
                >
                    <defs>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#f97316" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickFormatter={formatXAxis}
                        interval="preserveStartEnd"
                        minTickGap={50}
                    />
                    
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ 
                            value: 'Units', 
                            angle: -90, 
                            position: 'insideLeft', 
                            fill: '#94a3b8',
                            fontSize: 12
                        }}
                    />
                    
                    <Tooltip content={<CustomTooltip />} />
                    
                    <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        formatter={(value) => (
                            <span className="text-sm text-slate-600">{value}</span>
                        )}
                    />

                    {/* Confidence Interval - Upper Bound Area */}
                    <Area
                        type="monotone"
                        dataKey="ci_upper"
                        stroke="none"
                        fill="url(#confidenceGradient)"
                        fillOpacity={1}
                        name="Confidence Interval (Upper)"
                        legendType="none"
                    />
                    
                    {/* Confidence Interval - Lower Bound (white fill to create band effect) */}
                    <Area
                        type="monotone"
                        dataKey="ci_lower"
                        stroke="none"
                        fill="#ffffff"
                        fillOpacity={1}
                        name="Confidence Interval (Lower)"
                        legendType="none"
                    />

                    {/* Historical Sales Line */}
                    <Line
                        type="monotone"
                        dataKey="historical"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ r: 2, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                        name="Historical Sales"
                        connectNulls={false}
                    />

                    {/* Forecasted Sales Line */}
                    <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        strokeDasharray="8 4"
                        dot={{ r: 2, fill: '#f97316', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#f97316', stroke: '#fff', strokeWidth: 2 }}
                        name="Forecast"
                        connectNulls={false}
                    />

                    {/* Today Reference Line */}
                    {todayDate && (
                        <ReferenceLine 
                            x={todayDate} 
                            stroke="#94a3b8" 
                            strokeDasharray="4 4"
                            label={{ 
                                value: 'Today', 
                                fill: '#64748b', 
                                fontSize: 11,
                                position: 'top'
                            }} 
                        />
                    )}
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ForecastChart;
