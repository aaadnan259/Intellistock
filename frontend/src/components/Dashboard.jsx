import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, DollarSign, Target, Loader2, TrendingUp, Activity, Clock, ShoppingCart } from 'lucide-react';
import api from '../services/api';
import StatCard from './StatCard';
import { BentoGrid, BentoItem } from './BentoGrid';
import ForecastSimulator from './ForecastSimulator';
import InventoryHeatmap from './InventoryHeatmap';

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
                    <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                        Overview
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">Real-time command center</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
                    <Clock className="h-3 w-3 animate-pulse text-emerald-500" />
                    <span>LIVE UPDATE: 5m</span>
                </div>
            </div>

            <BentoGrid>
                {/* 1. Key Metric: Total Products */}
                <BentoItem
                    colSpan={1}
                    title="Total Products"
                    icon={<Package className="h-5 w-5" />}
                    className="bg-blue-950/20 hover:bg-blue-900/20 border-blue-500/20 hover:border-blue-500/40"
                    header={
                        <div className="mt-4">
                            <div className="text-4xl font-bold text-white tracking-tight">
                                {stats.total_products.toLocaleString()}
                            </div>
                            <div className="text-xs text-blue-400 mt-1 flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {stats.products_with_forecasts} active models
                            </div>
                        </div>
                    }
                />

                {/* 2. Key Metric: Inventory Value */}
                <BentoItem
                    colSpan={1}
                    title="Valuation"
                    icon={<DollarSign className="h-5 w-5" />}
                    className="bg-indigo-950/20 hover:bg-indigo-900/20 border-indigo-500/20 hover:border-indigo-500/40"
                    header={
                        <div className="mt-4">
                            <div className="text-4xl font-bold text-white tracking-tight">
                                {formatCurrency(stats.inventory_value)}
                            </div>
                            <div className="text-xs text-indigo-400 mt-1">
                                Current holding value
                            </div>
                        </div>
                    }
                />

                {/* 3. Interactive Component: Forecast Simulator (Large) */}
                <BentoItem
                    colSpan={2}
                    rowSpan={2}
                    title="AI Forecast Simulator"
                    icon={<TrendingUp className="h-5 w-5" />}
                    className="relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-950/50 pointer-events-none" />
                    <ForecastSimulator initialData={salesTrend} />
                </BentoItem>

                {/* 4. Critical Alert: Stock Health */}
                <BentoItem
                    colSpan={1}
                    title="Stock Health"
                    icon={<AlertTriangle className="h-5 w-5" />}
                    className={`${stats.out_of_stock_count > 0 ? 'bg-red-950/20 border-red-500/20' : 'bg-emerald-950/20 border-emerald-500/20'
                        }`}
                >
                    <div className="mt-4 flex flex-col gap-2">
                        <div className="flex justify-between items-center p-2 rounded bg-slate-900/50 border border-slate-800">
                            <span className="text-xs text-slate-400">Low Stock</span>
                            <span className="text-amber-500 font-bold">{stats.low_stock_count}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 rounded bg-slate-900/50 border border-slate-800">
                            <span className="text-xs text-slate-400">Out of Stock</span>
                            <span className="text-red-500 font-bold">{stats.out_of_stock_count}</span>
                        </div>
                    </div>
                </BentoItem>

                {/* 5. Forecast Accuracy */}
                <BentoItem
                    colSpan={1}
                    title="Model Accuracy"
                    icon={<Target className="h-5 w-5" />}
                    className="bg-purple-950/20 border-purple-500/20"
                    header={
                        <div className="mt-4">
                            <div className="text-4xl font-bold text-white tracking-tight">
                                {stats.avg_forecast_accuracy > 0 ? `${(stats.avg_forecast_accuracy * 100).toFixed(0)}%` : 'N/A'}
                            </div>
                            <div className="text-xs text-purple-400 mt-1">
                                Mean Average Precision
                            </div>
                        </div>
                    }
                />

                {/* 6. Visualization: Inventory Heatmap */}
                <BentoItem
                    colSpan={2}
                    rowSpan={1}
                    title="Inventory Composition"
                    icon={<Package className="h-5 w-5" />}
                >
                    <InventoryHeatmap stats={stats} />
                </BentoItem>

                {/* 7. Top Products List */}
                <BentoItem
                    colSpan={2}
                    rowSpan={1}
                    title="Top Performers"
                    icon={<ShoppingCart className="h-5 w-5" />}
                >
                    <div className="space-y-3 mt-2">
                        {topProducts.slice(0, 3).map((product, index) => (
                            <div key={product.product_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors">
                                <span className={`flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold ${index === 0 ? 'bg-amber-500/20 text-amber-500' :
                                    index === 1 ? 'bg-slate-500/20 text-slate-400' :
                                        'bg-orange-500/20 text-orange-500'
                                    }`}>
                                    #{index + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-slate-200 truncate">{product.name}</p>
                                </div>
                                <span className="text-xs font-mono text-emerald-400">
                                    ${Number(product.revenue).toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </BentoItem>

            </BentoGrid>
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
