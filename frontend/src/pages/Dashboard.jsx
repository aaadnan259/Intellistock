import React, { useState, useEffect } from 'react';
import { DollarSign, Package, AlertTriangle, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import StatCard from '../components/StatCard';
import ProductTable from '../components/ProductTable';
import { inventoryApi } from '../services/api';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        revenue: { value: 0, trend: 0 },
        inventory_value: { value: 0, trend: 0 },
        stockout_risk: { value: 0, trend: 0 },
        active_forecasts: { value: 0, trend: 0 }
    });
    const [trendData, setTrendData] = useState([]);
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, trendsRes, slowMoversRes] = await Promise.all([
                    inventoryApi.getDashboardStats(),
                    inventoryApi.getSalesTrends(30),
                    inventoryApi.getSlowMovers()
                ]);

                setStats(statsRes.data || {
                    revenue: { value: 45231, trend: 12.5 },
                    inventory_value: { value: 128.4, trend: -2.4 },
                    stockout_risk: { value: 12, trend: 5.0 },
                    active_forecasts: { value: 89, trend: 0 }
                });

                // Transform trend data for Recharts if API returns structure, else fallback or empty
                const formattedTrends = trendsRes.data.dates ? trendsRes.data.dates.map((date, i) => ({
                    name: date,
                    sales: trendsRes.data.daily_sales[i] || 0,
                    inventory: trendsRes.data.moving_average?.[i] || 0
                })) : [];
                setTrendData(formattedTrends);

                setAlerts(slowMoversRes.data || []);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
                toast.error("Using offline mode (API unreachable)");
                // Fallback or keep loading false
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Dashboard Overview</h2>
                    <p className="text-slate-400 mt-1">Real-time inventory intelligence and forecasting.</p>
                </div>
                <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors font-medium text-sm">
                        Export Report
                    </button>
                    <button className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-blue-600 shadow-lg shadow-primary/20 transition-all hover:-translate-y-0.5 font-medium text-sm">
                        + Add Product
                    </button>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Revenue"
                    value={stats.revenue?.value?.toLocaleString()}
                    prefix="$"
                    trend={stats.revenue?.trend}
                    trendLabel="vs last month"
                    icon={DollarSign}
                    color="blue"
                />
                <StatCard
                    title="Inventory Value"
                    value={stats.inventory_value?.value?.toLocaleString()}
                    prefix="$"
                    suffix="k"
                    trend={stats.inventory_value?.trend}
                    trendLabel="Efficiency"
                    icon={Package}
                    color="purple"
                />
                <StatCard
                    title="Stockout Risk"
                    value={stats.stockout_risk?.value}
                    suffix=" items"
                    trend={stats.stockout_risk?.trend}
                    trendLabel="Needs attention"
                    icon={AlertTriangle}
                    color="orange"
                />
                <StatCard
                    title="Active Forecasts"
                    value={stats.active_forecasts?.value}
                    suffix="%"
                    trend={stats.active_forecasts?.trend}
                    trendLabel="Accuracy Rate"
                    icon={Activity}
                    color="green"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-white">Sales vs Inventory Trends</h3>
                        <select className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-1 outline-none focus:border-primary">
                            <option>Last 30 days</option>
                        </select>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData.length > 0 ? trendData : [{ name: 'No Data', sales: 0, inventory: 0 }]}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748B" tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748B" tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', color: '#F8FAFC' }}
                                    itemStyle={{ color: '#F8FAFC' }}
                                />
                                <Area type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                                <Area type="monotone" dataKey="inventory" stroke="#8B5CF6" strokeWidth={3} fillOpacity={1} fill="url(#colorInv)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Secondary Info / Alerts */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-4">Stock Alerts</h3>
                    <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
                        {alerts.length === 0 ? (
                            <div className="text-center py-8">
                                <div className="inline-flex p-3 rounded-full bg-slate-800/50 text-slate-500 mb-2">
                                    <AlertTriangle size={24} />
                                </div>
                                <p className="text-slate-500 text-sm">No critical alerts found.</p>
                            </div>
                        ) : (
                            alerts.map((item, i) => (
                                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:border-slate-700 transition-colors cursor-pointer group">
                                    <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400 group-hover:text-orange-300 transition-colors">
                                        <AlertTriangle size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-medium text-slate-200 truncate">{item.name}</h4>
                                        <p className="text-xs text-slate-500">{item.days_no_sale} days no sales</p>
                                    </div>
                                    <span className="text-xs font-mono text-orange-400 bg-orange-500/10 px-2 py-1 rounded">Action</span>
                                </div>
                            ))
                        )}
                    </div>
                    <button className="mt-auto pt-4 w-full text-center text-sm text-primary hover:text-blue-400 font-medium transition-colors">
                        View All Alerts
                    </button>
                </div>
            </div>

            {/* Recent Activity Table */}
            <div>
                <h3 className="text-xl font-bold text-white mb-4">Recent Inventory Movement</h3>
                <ProductTable limit={5} />
            </div>
        </div>
    );
};

export default Dashboard;
