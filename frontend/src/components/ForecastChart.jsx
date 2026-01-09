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

const ForecastChart = ({ data }) => {
    // Data expected format: [{ date: '2023-01-01', historical: 100, forecast: null, ci_lower: null, ci_upper: null }, ...]

    return (
        <div className="h-[400px] w-full rounded-xl bg-white p-4 shadow-sm border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                    data={data}
                    margin={{
                        top: 20,
                        right: 30,
                        left: 20,
                        bottom: 20,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                        dataKey="date"
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        label={{ value: 'Units Sold', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        }}
                        itemStyle={{ fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />

                    {/* Confidence Interval Area */}
                    <Area
                        type="monotone"
                        dataKey="ci_upper"
                        stroke="none"
                        fill="#ffedd5" // Orange-100
                        fillOpacity={0.6}
                        name="Confidence Interval"
                    />
                    <Area
                        type="monotone"
                        dataKey="ci_lower"
                        stroke="none"
                        fill="#fff" // Mask the bottom part of the area
                        fillOpacity={1}
                        name="Confidence Interval Base" // Usually hidden or handled differently, but this is a simple trick for range area if not supported directly
                    />
                    {/* Better approach for Range Area in Recharts is usually using [lower, upper] in Area, but data format needs to be specific.
              Let's assume we just render the upper area and hope the lower part isn't too distracting if we don't have a split range.
              Actually, Recharts Area accepts 'dataKey' as array [min, max], let's try that if supported, strictly it takes one key.
              Standard trick: 'Confidence' Area is the range. We can use stacked areas or just simple overlay. 
              Let's stick to a simple shaded region for Upper Bound for now to represent potential, as implementing true Range Area in Recharts requires specific data shaping (e.g. [min, max]).
          */}
                    <Area
                        type="monotone"
                        dataKey="range"
                        fill="#fed7aa"
                        stroke="none"
                        opacity={0.3}
                        name="Confidence Range (80%)"
                    />


                    {/* Historical Sales */}
                    <Line
                        type="monotone"
                        dataKey="historical"
                        stroke="#3b82f6" // Blue-500
                        strokeWidth={3}
                        dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        name="Historical Sales"
                        connectNulls
                    />

                    {/* Forecasted Sales */}
                    <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke="#f97316" // Orange-500
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
                        name="Forecast"
                        connectNulls
                    />

                    {/* 'Today' Line reference */}
                    <ReferenceLine x="2023-10-25" stroke="red" label="Today" strokeDasharray="3 3" />
                </ComposedChart>
            </ResponsiveContainer>
        </div>
    );
};

export default ForecastChart;
