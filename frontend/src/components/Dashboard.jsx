import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, DollarSign, Target, Loader2 } from 'lucide-react';
import api from '../services/api';
import StatCard from './StatCard';

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_products: 0,
        low_stock_count: 0,
        inventory_value: 0,
        avg_forecast_accuracy: 0,
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/inventory/stats/');
                setStats(response.data);
            } catch (error) {
                console.error('Failed to fetch stats', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Dashboard Overview</h2>
                <span className="text-sm text-gray-500">Last updated: Today, 9:00 AM</span>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Products"
                    value={stats.total_products}
                    icon={Package}
                    color="blue"
                    trend="up"
                    trendValue="+12%"
                    trendLabel="from last month"
                />

                <StatCard
                    title="Low Stock Alerts"
                    value={stats.low_stock_count}
                    icon={AlertTriangle}
                    color={stats.low_stock_count > 0 ? 'red' : 'green'}
                    trend={stats.low_stock_count > 0 ? 'down' : 'stable'}
                    trendValue={stats.low_stock_count > 0 ? 'Action Needed' : 'Healthy'}
                    trendLabel=""
                />

                <StatCard
                    title="Total Inventory Value"
                    value={formatCurrency(stats.inventory_value)}
                    icon={DollarSign}
                    color="indigo"
                    trend="up"
                    trendValue="+5.2%"
                    trendLabel="from last month"
                />

                <StatCard
                    title="Avg Forecast Accuracy"
                    value={`${(stats.avg_forecast_accuracy * 100).toFixed(1)}%`}
                    icon={Target}
                    color={getAccuracyColor(stats.avg_forecast_accuracy)}
                    trend="stable"
                    trendValue="Target > 80%"
                    trendLabel=""
                />
            </div>

            {/* Placeholder for future sections like Recent Activity or Quick Actions */}
            <div className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-xl bg-white p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {[1, 2, 3].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                                <div className="h-2 w-2 rounded-full bg-indigo-500"></div>
                                <p className="text-sm text-gray-600">Stock update received from warehouse A.</p>
                                <span className="ml-auto text-xs text-gray-400">2h ago</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-xl bg-white p-6 shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">System Status</h3>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-700">API Gateway: Online</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-3 w-3 rounded-full bg-green-500"></div>
                        <span className="text-sm font-medium text-gray-700">Forecasting Engine: Idle</span>
                    </div>
                    <p className="mt-4 text-xs text-gray-400">Running on v2.1.0 (Production)</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
