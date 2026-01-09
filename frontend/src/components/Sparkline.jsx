import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const Sparkline = ({ data, color = "#6366f1" }) => {
    // data expected format: [10, 20, 15, ...] array of numbers
    const chartData = data.map((val, index) => ({ index, value: val }));

    return (
        <div className="h-[30px] w-[60px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#1e293b',
                            color: '#fff',
                            border: 'none',
                            fontSize: '10px',
                            padding: '2px 4px',
                            borderRadius: '4px'
                        }}
                        itemStyle={{ color: '#fff' }}
                        labelStyle={{ display: 'none' }}
                        formatter={(value) => [value, '']}
                        cursor={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default Sparkline;
