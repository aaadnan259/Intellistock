import React from 'react';
import { ResponsiveContainer, Treemap, Tooltip } from 'recharts';

const InventoryHeatmap = ({ stats }) => {
    // Transform stats into hierarchical data for Treemap
    const data = [
        {
            name: 'Inventory Health',
            children: [
                { name: 'Healthy', size: Math.max(stats.total_products - stats.low_stock_count - stats.out_of_stock_count, 0) || 1, fill: '#10b981' }, // Emerald-500
                { name: 'Low Stock', size: stats.low_stock_count || 0, fill: '#f59e0b' }, // Amber-500
                { name: 'Out of Stock', size: stats.out_of_stock_count || 0, fill: '#ef4444' }, // Red-500
            ],
        },
    ];

    return (
        <div className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
                <Treemap
                    data={data}
                    dataKey="size"
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomContent />}
                >
                    <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}
                        itemStyle={{ color: '#e2e8f0' }}
                        cursor={{ fill: 'transparent' }}
                    />
                </Treemap>
            </ResponsiveContainer>
        </div>
    );
};

const CustomContent = ({ x, y, width, height, payload, name }) => {
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                    fill: payload.fill,
                    stroke: '#0f172a',
                    strokeWidth: 2,
                    strokeOpacity: 1,
                }}
                rx={8}
                ry={8}
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize={12}
                    fontWeight="bold"
                    dy={4}
                >
                    {name}
                </text>
            )}
        </g>
    );
};

export default InventoryHeatmap;
