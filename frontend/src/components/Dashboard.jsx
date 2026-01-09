import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, DollarSign, Target, Loader2, TrendingUp, Activity, Clock, ShoppingCart } from 'lucide-react';
import api from '../services/api';
import StatCard from './StatCard';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_products: 0,
        low_stock_count: 0,
        out_of_stock_count: 0,
        inventory_value: 0,
        avg_forecast_accuracy: 0,
        products_with_forecasts: 0,
        health_status: 'healthy'
    });
    const [recentSales, setRecentSales] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [salesTrend, setSalesTrend] = useState([]);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, trendsRes, topRes] = await Promise.allSettled([
                    api.get('/inventory/stats/'),
                    api.get('/inventory/analytics/sales-trends/?days=7'),
                    api.get('/inventory/analytics/top-products/?limit=5&days=30')
                ]);

                if (statsRes.status === 'fulfilled') {
                    setStats(statsRes.value.data);
                }
                
                if (trendsRes.status === 'fulfilled') {
                    const trendData = trendsRes.value.data;
                    const chartData = trendData.dates?.slice(-7).map((date, i) => ({
                        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                        value: trendData.daily_sales[trendData.dates.length - 7 + i] || 0
                    })) || [];
                    setSalesTrend(chartData);
                }
                
                if (topRes.status === 'fulfilled') {
                    setTopProducts(topRes.value.data || []);
                }

            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        
        // Refresh every 5 minutes
        const interval = setInterval(fetchDashboardData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(value);
    };

    const getAccuracyColor = (val) => {
        const percentage = val * 100;
        if (percentage >= 80) return 'green';
        if (percentage >= 70) return 'yellow';
        return 'red';
    };

    const getHealthStatusColor = (status) => {
        if (status === 'healthy') return 'green';
        if (status === 'warning') return 'yellow';
        return 'red';
    };

    if (loading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mx-auto" />
                    <p className="mt-2 text-sm text-slate-500">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                    <p className="text-sm text-gray-500 mt-1">Real-time inventory insights</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Clock className="h-4 w-4" />
                    <span>Auto-refreshes every 5 min</span>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Products"
                    value={stats.total_products.toLocaleString()}
                    icon={Package}
                    color="blue"
                    trend="stable"
                    trendValue={`${stats.products_with_forecasts} forecasted`}
                    trendLabel=""
                />

                <StatCard
                    title="Stock Alerts"
                    value={stats.low_stock_count + stats.out_of_stock_count}
                    icon={AlertTriangle}
                    color={stats.low_stock_count + stats.out_of_stock_count > 5 ? 'red' : stats.low_stock_count > 0 ? 'yellow' : 'green'}
                    trend={stats.out_of_stock_count > 0 ? 'down' : 'stable'}
                    trendValue={stats.out_of_stock_count > 0 ? `${stats.out_of_stock_count} out of stock` : 'All stocked'}
                    trendLabel=""
                />

                <StatCard
                    title="Inventory Value"
                    value={formatCurrency(stats.inventory_value)}
                    icon={DollarSign}
                    color="indigo"
                    trend="up"
                    trendValue="Current valuation"
                    trendLabel=""
                />

                <StatCard
                    title="Forecast Accuracy"
                    value={stats.avg_forecast_accuracy > 0 ? `${(stats.avg_forecast_accuracy * 100).toFixed(1)}%` : 'N/A'}
                    icon={Target}
                    color={getAccuracyColor(stats.avg_forecast_accuracy)}
                    trend="stable"
                    trendValue={stats.avg_forecast_accuracy >= 0.8 ? 'Excellent' : stats.avg_forecast_accuracy >= 0.7 ? 'Good' : 'Needs data'}
                    trendLabel=""
                />
            </div>

            {/* Secondary Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* 7-Day Sales Trend Mini Chart */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">7-Day Sales</h3>
                        <TrendingUp className="h-5 w-5 text-indigo-500" />
                    </div>
                    {salesTrend.length > 0 ? (
                        <div className="h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={salesTrend}>
                                    <Tooltip 
                                        contentStyle={{ 
                                            borderRadius: '8px', 
                                            border: '1px solid #e2e8f0',
                                            fontSize: '12px'
                                        }}
                                        formatter={(value) => [`$${value.toLocaleString()}`, 'Sales']}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="#6366f1" 
                                        strokeWidth={2}
                                        dot={{ fill: '#6366f1', strokeWidth: 0, r: 3 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-[120px] flex items-center justify-center text-slate-400 text-sm">
                            No sales data available
                        </div>
                    )}
                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                        {salesTrend.map((item, i) => (
                            <span key={i}>{item.date}</span>
                        ))}
                    </div>
                </div>

                {/* Top Products */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Top Products</h3>
                        <ShoppingCart className="h-5 w-5 text-emerald-500" />
                    </div>
                    {topProducts.length > 0 ? (
                        <div className="space-y-3">
                            {topProducts.slice(0, 5).map((product, index) => (
                                <div key={product.product_id} className="flex items-center gap-3">
                                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                        index === 0 ? 'bg-amber-100 text-amber-700' :
                                        index === 1 ? 'bg-slate-200 text-slate-600' :
                                        index === 2 ? 'bg-orange-100 text-orange-700' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{product.name}</p>
                                        <p className="text-xs text-slate-500">{product.units_sold} units sold</p>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-800">
                                        ${product.revenue?.toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="h-[160px] flex items-center justify-center text-slate-400 text-sm">
                            No sales data yet
                        </div>
                    )}
                </div>

                {/* System Status */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
                        <Activity className="h-5 w-5 text-green-500" />
                    </div>
                    <div className="space-y-3">
                        <StatusItem 
                            label="API Gateway" 
                            status="online" 
                        />
                        <StatusItem 
                            label="Forecasting Engine" 
                            status={stats.products_with_forecasts > 0 ? 'active' : 'idle'} 
                        />
                        <StatusItem 
                            label="Database" 
                            status="online" 
                        />
                        <StatusItem 
                            label="Cache Layer" 
                            status="online" 
                        />
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-slate-600">Inventory Health</span>
                            <span className={`text-sm font-semibold ${
                                stats.health_status === 'healthy' ? 'text-green-600' :
                                stats.health_status === 'warning' ? 'text-amber-600' :
                                'text-red-600'
                            }`}>
                                {stats.health_status?.charAt(0).toUpperCase() + stats.health_status?.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="text-white">
                        <h3 className="text-lg font-semibold">Ready to optimize your inventory?</h3>
                        <p className="text-indigo-100 text-sm mt-1">
                            Generate forecasts and analyze trends to make data-driven decisions.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <a 
                            href="#forecasting" 
                            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                            <TrendingUp className="h-4 w-4" />
                            Generate Forecast
                        </a>
                        <a 
                            href="#analytics" 
                            className="inline-flex items-center gap-2 rounded-lg bg-indigo-400/30 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400/40 transition-colors"
                        >
                            View Analytics
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Status Item Component
const StatusItem = ({ label, status }) => {
    const statusConfig = {
        online: { color: 'bg-green-500', text: 'Online' },
        active: { color: 'bg-blue-500 animate-pulse', text: 'Active' },
        idle: { color: 'bg-slate-400', text: 'Idle' },
        offline: { color: 'bg-red-500', text: 'Offline' }
    };
    
    const config = statusConfig[status] || statusConfig.offline;
    
    return (
        <div className="flex items-center gap-2">
            <div className={`h-2.5 w-2.5 rounded-full ${config.color}`}></div>
            <span className="text-sm text-slate-600 flex-1">{label}</span>
            <span className="text-xs text-slate-500">{config.text}</span>
        </div>
    );
};

export default Dashboard;
