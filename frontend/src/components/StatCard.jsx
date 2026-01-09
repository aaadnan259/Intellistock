import React from 'react';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

const StatCard = ({ title, value, icon: Icon, trend, trendValue, trendLabel, color = 'indigo' }) => {
    const colorMap = {
        indigo: 'from-indigo-500 to-blue-500',
        green: 'from-emerald-500 to-teal-500',
        red: 'from-red-500 to-rose-500',
        yellow: 'from-amber-400 to-orange-500',
        blue: 'from-blue-400 to-cyan-500',
    };

    const trendColor =
        trend === 'up' ? 'text-green-600' :
            trend === 'down' ? 'text-red-600' :
                'text-slate-500';

    const TrendIcon =
        trend === 'up' ? ArrowUp :
            trend === 'down' ? ArrowDown :
                Minus;

    return (
        <div className="group relative overflow-hidden rounded-xl bg-white p-6 shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-slate-500">{title}</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900">{value}</h3>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${colorMap[color]} text-white shadow-md`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>

            {(trendValue || trendLabel) && (
                <div className="mt-4 flex items-center text-sm">
                    <span className={`flex items-center gap-1 font-medium ${trendColor}`}>
                        <TrendIcon className="h-4 w-4" />
                        {trendValue}
                    </span>
                    <span className="ml-2 text-slate-400">{trendLabel}</span>
                </div>
            )}

            {/* Decorative background element */}
            <div className="absolute -right-4 -top-4 -z-10 h-24 w-24 rounded-full bg-slate-50 opacity-50 transition-transform group-hover:scale-110" />
        </div>
    );
};

export default StatCard;
