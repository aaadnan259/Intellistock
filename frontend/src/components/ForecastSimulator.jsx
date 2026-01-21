import React, { useState, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Sliders, Zap } from 'lucide-react';

const ForecastSimulator = ({ initialData = [] }) => {
    const [growthFactor, setGrowthFactor] = useState(1.0); // 1.0 = 0% growth

    // Generate simulated data based on slider
    const simulatedData = useMemo(() => {
        // Fallback mock data if initialData is empty
        const baseData = initialData.length > 0 ? initialData : Array.from({ length: 12 }, (_, i) => ({
            name: `Month ${i + 1}`,
            actual: 1000 + Math.random() * 500 + (i * 50),
            forecast: 1000 + (i * 60)
        }));

        return baseData.map(item => ({
            ...item,
            // Apply growth factor logic to the 'forecast' part or create a 'simulated' line
            simulated: item.forecast * growthFactor + (Math.random() * 50 * (growthFactor - 1))
        }));
    }, [initialData, growthFactor]);

    const percentageChange = ((growthFactor - 1) * 100).toFixed(0);

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Sliders className="h-4 w-4" />
                    <span>Inventory Simulation</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${growthFactor >= 1 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                    {growthFactor >= 1 ? '+' : ''}{percentageChange}% Impact
                </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 min-h-[160px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={simulatedData}>
                        <defs>
                            <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                            itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="simulated"
                            stroke="#8b5cf6"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorSim)"
                            name="Simulated Scenario"
                            animationDuration={300}
                        />
                        <Area
                            type="monotone"
                            dataKey="actual"
                            stroke="#64748b"
                            strokeWidth={1}
                            strokeDasharray="4 4"
                            fill="transparent"
                            name="Baseline"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* Controls */}
            <div className="mt-4 bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
                <label className="flex justify-between text-xs font-medium text-slate-300 mb-2">
                    <span>Marketing Spend Adjustment</span>
                    <span className="text-blue-400">{growthFactor}x</span>
                </label>
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={growthFactor}
                    onChange={(e) => setGrowthFactor(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <Zap className="h-3 w-3" />
                    Adjusting this factor resimulates potential revenue outcomes.
                </p>
            </div>
        </div>
    );
};

export default ForecastSimulator;
