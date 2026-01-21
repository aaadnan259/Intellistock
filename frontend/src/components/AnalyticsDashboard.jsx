import React, { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Filter } from 'lucide-react';
import { inventoryApi } from '../services/api';

const AnalyticsDashboard = () => {
    const [abcData, setAbcData] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const res = await inventoryApi.getABCAnalysis();
                // Map ABC data to chart format if needed. 
                // Assuming res.data.summary = { a_count: 50, b_count: 150, c_count: 800 }
                const summary = res.data.summary || { a_count: 10, b_count: 20, c_count: 70 };
                setAbcData([
                    { name: 'A Items (High Value)', value: summary.a_count },
                    { name: 'B Items (Med Value)', value: summary.b_count },
                    { name: 'C Items (Low Value)', value: summary.c_count },
                ]);
            } catch (e) {
                console.error("Failed to load analytics", e);
                // Mock data fallback
                setAbcData([
                    { name: 'A Items', value: 15 },
                    { name: 'B Items', value: 35 },
                    { name: 'C Items', value: 50 },
                ]);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, []);

    // Mock monthly data (keep mock until API endpoint for this specific chart is ready/confirmed)
    const monthlyPerformance = [
        { name: 'Jan', revenue: 4000, profit: 2400 },
        { name: 'Feb', revenue: 3000, profit: 1398 },
        { name: 'Mar', revenue: 2000, profit: 9800 },
        { name: 'Apr', revenue: 2780, profit: 3908 },
        { name: 'May', revenue: 1890, profit: 4800 },
        { name: 'Jun', revenue: 2390, profit: 3800 },
    ];

    const COLORS = ['#3B82F6', '#8B5CF6', '#F97316', '#10B981'];

    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-3xl font-bold text-white tracking-tight">Analytics & Reports</h2>
                <div className="flex gap-2">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white transition-colors">
                        <Filter size={16} /> Filters
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 transition-colors shadow-lg shadow-primary/20">
                        <Download size={16} /> Export
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* ABC Analysis - Pie Chart */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-6">ABC Inventory Analysis</h3>
                    <div className="h-[300px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={abcData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {abcData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC', borderRadius: '8px' }}
                                    itemStyle={{ color: '#F8FAFC' }}
                                />
                                <Legend horizontalAlign="right" verticalAlign="middle" layout="vertical" iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Profit Margin Analysis - Bar Chart */}
                <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <h3 className="text-lg font-bold text-white mb-6">Revenue vs Profit</h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={monthlyPerformance}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748B" tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748B" tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip
                                    cursor={{ fill: '#1E293B', opacity: 0.5 }}
                                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC' }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                <Bar dataKey="revenue" name="Revenue" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="profit" name="Gross Profit" fill="#10B981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
