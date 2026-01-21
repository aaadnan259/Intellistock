import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

const StatCard = ({ title, value, prefix = "", suffix = "", trend, trendLabel, icon: Icon, color = "blue" }) => {
    const isPositive = trend > 0;
    const isNeutral = trend === 0;

    const colorMap = {
        blue: 'from-blue-500 to-cyan-400',
        green: 'from-emerald-500 to-teal-400',
        orange: 'from-orange-500 to-amber-400',
        purple: 'from-purple-500 to-pink-400',
    };

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-slate-700 hover:bg-slate-900 hover:shadow-lg hover:shadow-primary/5">
            {/* Background Gradient Blob */}
            <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${colorMap[color]} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-10`} />

            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-400">{title}</p>
                    <div className="mt-2 flex items-baseline gap-1">
                        <span className="text-lg text-slate-500 font-mono">{prefix}</span>
                        <h3 className="text-3xl font-bold text-white tracking-tight animate-fade-in">
                            {value}
                        </h3>
                        <span className="text-lg text-slate-500 font-mono">{suffix}</span>
                    </div>
                </div>

                <div className={`rounded-xl bg-slate-800/50 p-3 border border-slate-700/50 group-hover:border-${color}-500/30 transition-colors`}>
                    <Icon className={`h-6 w-6 text-${color}-400`} />
                </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
                <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${isPositive ? 'bg-emerald-500/10 text-emerald-400' :
                        isNeutral ? 'bg-slate-500/10 text-slate-400' :
                            'bg-rose-500/10 text-rose-400'
                    }`}>
                    {isPositive ? <ArrowUpRight size={12} /> : isNeutral ? <Minus size={12} /> : <ArrowDownRight size={12} />}
                    {Math.abs(trend)}%
                </div>
                <span className="text-xs text-slate-500">{trendLabel}</span>
            </div>
        </div>
    );
};

export default StatCard;
