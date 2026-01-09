import React, { useState } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { Download, RefreshCw, AlertTriangle, Calendar } from 'lucide-react';

const AnalyticsDashboard = () => {
    // MOCK DATA
    const turnoverData = [
        { name: 'Electronics', turnover: 8.5 },
        { name: 'Accessories', turnover: 4.2 },
        { name: 'Office', turnover: 6.1 },
        { name: 'Furniture', turnover: 2.3 },
    ];

    const abcData = [
        { name: 'A-Items (High Value)', value: 20 },
        { name: 'B-Items (Medium)', value: 30 },
        { name: 'C-Items (Low Value)', value: 50 },
    ];
    const COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

    const salesTrendData = [
        { name: 'Jan', sales: 4000, forecast: 4100 },
        { name: 'Feb', sales: 3000, forecast: 3200 },
        { name: 'Mar', sales: 2000, forecast: 2400 },
        { name: 'Apr', sales: 2780, forecast: 2900 },
        { name: 'May', sales: 1890, forecast: 2100 },
        { name: 'Jun', sales: 2390, forecast: 2500 },
        { name: 'Jul', sales: 3490, forecast: 3600 },
    ];

    const slowMovers = [
        { id: 1, name: 'Old Monitor Stand', days: 85, value: 450, stock: 15 },
        { id: 2, name: 'VGA Cable', days: 120, value: 120, stock: 40 },
        { id: 3, name: 'Wired Mouse Gen1', days: 65, value: 300, stock: 30 },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Analytics Insights</h2>
                <div className="flex gap-2">
                    <button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600">
                        <RefreshCw className="h-5 w-5" />
                    </button>
                    <button className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Calendar className="h-4 w-4" /> Last 90 Days
                    </button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[
                    { label: 'Total Inventory Value', value: '$1.2M', sub: '+2.5%', color: 'border-l-indigo-500' },
                    { label: 'Avg Turnover Ratio', value: '4.2', sub: 'Healthy', color: 'border-l-green-500' },
                    { label: 'Stock Accuracy', value: '98.5%', sub: 'Target: 99%', color: 'border-l-blue-500' },
                    { label: 'Days On Hand', value: '45', sub: '-2 days', color: 'border-l-purple-500' },
                ].map((card, i) => (
                    <div key={i} className={`rounded-xl border-l-[4px] ${card.color} bg-white p-4 shadow-sm`}>
                        <p className="text-xs font-medium uppercase text-slate-400">{card.label}</p>
                        <h3 className="mt-1 text-xl font-bold text-slate-800">{card.value}</h3>
                        <p className="text-xs text-slate-500">{card.sub}</p>
                    </div>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Inventory Turnover */}
                <div className="rounded-xl bg-white p-6 shadow-lg">
                    <h3 className="mb-4 text-lg font-bold text-slate-800">Inventory Turnover by Category</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={turnoverData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis />
                                <Tooltip cursor={{ fill: '#f1f5f9' }} />
                                <Bar dataKey="turnover" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* ABC Analysis */}
                <div className="rounded-xl bg-white p-6 shadow-lg">
                    <h3 className="mb-4 text-lg font-bold text-slate-800">ABC Analysis (Pareto Principle)</h3>
                    <div className="flex h-[300px] items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={abcData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {abcData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Sales Trends */}
                <div className="rounded-xl bg-white p-6 shadow-lg lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800">Sales Trends vs Forecast</h3>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesTrendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="name" />
                                <YAxis />
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="sales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                                <Area type="monotone" dataKey="forecast" stroke="#82ca9d" fillOpacity={1} fill="url(#colorForecast)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Slow Moving Inventory */}
                <div className="rounded-xl bg-white p-6 shadow-lg lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Slow Moving Inventory
                        </h3>
                        <button className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                            <Download className="h-4 w-4" /> Export CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-slate-600">
                            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3">Product Name</th>
                                    <th className="px-4 py-3">Days No Sale</th>
                                    <th className="px-4 py-3">Current Stock</th>
                                    <th className="px-4 py-3">Stock Value</th>
                                    <th className="px-4 py-3">Recommended Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {slowMovers.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                        <td className="px-4 py-3 text-red-600 font-medium">{item.days} days</td>
                                        <td className="px-4 py-3">{item.stock} units</td>
                                        <td className="px-4 py-3 text-slate-800">${item.value}</td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                                Markdown 20%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AnalyticsDashboard;
