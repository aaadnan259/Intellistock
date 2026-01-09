import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { Download, RefreshCw, AlertTriangle, Calendar, TrendingUp, TrendingDown, Loader2, Package } from 'lucide-react';
import api from '../services/api';
import LoadingSkeleton from './LoadingSkeleton';
import EmptyState from './EmptyState';

const AnalyticsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState(90);
    
    const [turnoverData, setTurnoverData] = useState([]);
    const [abcData, setAbcData] = useState({ a_items: [], b_items: [], c_items: [], summary: {} });
    const [salesTrendData, setSalesTrendData] = useState({ dates: [], daily_sales: [], moving_average: [] });
    const [slowMovers, setSlowMovers] = useState([]);
    const [healthScore, setHealthScore] = useState(null);

    const COLORS = ['#3b82f6', '#f59e0b', '#ef4444'];

    const fetchAllData = async () => {
        try {
            const [turnoverRes, abcRes, trendsRes, slowRes] = await Promise.allSettled([
                api.get('/inventory/analytics/turnover/'),
                api.get('/inventory/analytics/abc-analysis/'),
                api.get(`/inventory/analytics/sales-trends/?days=${dateRange}`),
                api.get('/inventory/analytics/slow-movers/?threshold=60')
            ]);

            if (turnoverRes.status === 'fulfilled') {
                setTurnoverData(turnoverRes.value.data);
            }
            
            if (abcRes.status === 'fulfilled') {
                setAbcData(abcRes.value.data);
            }
            
            if (trendsRes.status === 'fulfilled') {
                const trendData = trendsRes.value.data;
                // Transform for chart
                const chartData = trendData.dates?.map((date, i) => ({
                    date,
                    sales: trendData.daily_sales[i],
                    ma: trendData.moving_average[i]
                })) || [];
                setSalesTrendData({ ...trendData, chartData });
            }
            
            if (slowRes.status === 'fulfilled') {
                setSlowMovers(slowRes.value.data);
            }

        } catch (error) {
            console.error('Failed to fetch analytics data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [dateRange]);

    const handleRefresh = () => {
        setRefreshing(true);
        fetchAllData();
    };

    const handleExportCSV = () => {
        if (slowMovers.length === 0) return;
        
        const headers = ['SKU', 'Product Name', 'Days Without Sale', 'Stock Value', 'Current Stock', 'Recommended Action'];
        const rows = slowMovers.map(item => [
            item.sku,
            item.name,
            item.days_no_sale,
            item.stock_value,
            item.current_stock,
            item.recommended_action
        ]);
        
        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'slow_movers_report.csv';
        link.click();
    };

    // Prepare ABC chart data
    const abcChartData = [
        { name: `A-Items (${abcData.summary?.a_count || 0})`, value: abcData.summary?.a_value_pct || 0, items: abcData.summary?.a_count || 0 },
        { name: `B-Items (${abcData.summary?.b_count || 0})`, value: abcData.summary?.b_value_pct || 0, items: abcData.summary?.b_count || 0 },
        { name: `C-Items (${abcData.summary?.c_count || 0})`, value: abcData.summary?.c_value_pct || 0, items: abcData.summary?.c_count || 0 },
    ];

    // Calculate metrics
    const totalSlowMoverValue = slowMovers.reduce((acc, item) => acc + (item.stock_value || 0), 0);
    const criticalSlowMovers = slowMovers.filter(item => item.urgency === 'critical').length;

    if (loading) {
        return (
            <div className="space-y-6">
                <LoadingSkeleton type="rect" className="h-12 w-64" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <LoadingSkeleton type="card" count={4} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <LoadingSkeleton type="chart" />
                    <LoadingSkeleton type="chart" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Analytics Insights</h2>
                    <p className="text-sm text-slate-500 mt-1">Inventory performance and optimization recommendations</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                    >
                        <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(Number(e.target.value))}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <option value={30}>Last 30 Days</option>
                        <option value={60}>Last 60 Days</option>
                        <option value={90}>Last 90 Days</option>
                        <option value={180}>Last 6 Months</option>
                    </select>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    label="Total Inventory Value"
                    value={`$${(abcData.summary?.total_value || 0).toLocaleString()}`}
                    subtext="Annual sales value"
                    color="indigo"
                    trend={salesTrendData.trend}
                />
                <MetricCard
                    label="Avg Turnover Ratio"
                    value={turnoverData[0]?.turnover_ratio?.toFixed(1) || '0.0'}
                    subtext={turnoverData[0]?.turnover_ratio >= 4 ? 'Healthy' : 'Needs improvement'}
                    color={turnoverData[0]?.turnover_ratio >= 4 ? 'green' : 'yellow'}
                />
                <MetricCard
                    label="Slow Movers"
                    value={slowMovers.length}
                    subtext={`$${totalSlowMoverValue.toLocaleString()} at risk`}
                    color={slowMovers.length > 10 ? 'red' : 'yellow'}
                    icon={AlertTriangle}
                />
                <MetricCard
                    label="Sales Trend"
                    value={salesTrendData.trend === 'increasing' ? 'Growing' : salesTrendData.trend === 'decreasing' ? 'Declining' : 'Stable'}
                    subtext={`${salesTrendData.trend_slope > 0 ? '+' : ''}${salesTrendData.trend_slope?.toFixed(1) || 0}/day`}
                    color={salesTrendData.trend === 'increasing' ? 'green' : salesTrendData.trend === 'decreasing' ? 'red' : 'blue'}
                    icon={salesTrendData.trend === 'increasing' ? TrendingUp : TrendingDown}
                />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Inventory Turnover */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100">
                    <h3 className="mb-4 text-lg font-bold text-slate-800">Inventory Turnover by Category</h3>
                    {turnoverData.length > 0 ? (
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={turnoverData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" tick={{ fontSize: 12 }} />
                                    <YAxis dataKey="category" type="category" tick={{ fontSize: 12 }} width={100} />
                                    <Tooltip 
                                        cursor={{ fill: '#f1f5f9' }}
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    />
                                    <Bar 
                                        dataKey="turnover_ratio" 
                                        fill="#6366f1" 
                                        radius={[0, 4, 4, 0]} 
                                        barSize={30}
                                        name="Turnover Ratio"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyState 
                            icon={Package} 
                            title="No turnover data" 
                            description="Turnover data will appear once sales are recorded."
                        />
                    )}
                </div>

                {/* ABC Analysis */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100">
                    <h3 className="mb-4 text-lg font-bold text-slate-800">ABC Analysis (Pareto Principle)</h3>
                    <div className="flex h-[300px] items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={abcChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    paddingAngle={3}
                                    dataKey="value"
                                    label={({ name, value }) => `${value.toFixed(1)}%`}
                                    labelLine={false}
                                >
                                    {abcChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                />
                                <Legend 
                                    verticalAlign="bottom" 
                                    height={36}
                                    formatter={(value) => <span className="text-sm">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-blue-50 p-2">
                            <p className="text-xs text-blue-600 font-medium">A Items</p>
                            <p className="text-lg font-bold text-blue-800">{abcData.summary?.a_count || 0}</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 p-2">
                            <p className="text-xs text-amber-600 font-medium">B Items</p>
                            <p className="text-lg font-bold text-amber-800">{abcData.summary?.b_count || 0}</p>
                        </div>
                        <div className="rounded-lg bg-red-50 p-2">
                            <p className="text-xs text-red-600 font-medium">C Items</p>
                            <p className="text-lg font-bold text-red-800">{abcData.summary?.c_count || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Sales Trends */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100 lg:col-span-2">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800">Sales Trends</h3>
                            <p className="text-sm text-slate-500">
                                Period total: ${(salesTrendData.period_total || 0).toLocaleString()} | 
                                Daily avg: ${(salesTrendData.period_avg || 0).toLocaleString()}
                            </p>
                        </div>
                        <div className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                            salesTrendData.trend === 'increasing' ? 'bg-green-100 text-green-700' :
                            salesTrendData.trend === 'decreasing' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-700'
                        }`}>
                            {salesTrendData.trend === 'increasing' ? <TrendingUp className="h-4 w-4" /> : 
                             salesTrendData.trend === 'decreasing' ? <TrendingDown className="h-4 w-4" /> : null}
                            {salesTrendData.trend || 'Calculating...'}
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        {salesTrendData.chartData?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesTrendData.chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fontSize: 11 }}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        interval="preserveStartEnd"
                                        minTickGap={60}
                                    />
                                    <YAxis tick={{ fontSize: 11 }} />
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                        formatter={(value) => [`$${value.toLocaleString()}`, '']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="sales" 
                                        stroke="#6366f1" 
                                        strokeWidth={2}
                                        fillOpacity={1} 
                                        fill="url(#colorSales)" 
                                        name="Daily Sales"
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="ma" 
                                        stroke="#f59e0b" 
                                        strokeWidth={2}
                                        dot={false}
                                        name="7-Day MA"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <EmptyState 
                                icon={TrendingUp} 
                                title="No trend data" 
                                description="Sales trend data will appear once transactions are recorded."
                            />
                        )}
                    </div>
                </div>

                {/* Slow Moving Inventory */}
                <div className="rounded-xl bg-white p-6 shadow-lg border border-slate-100 lg:col-span-2">
                    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            <h3 className="text-lg font-bold text-slate-800">Slow Moving Inventory</h3>
                            {criticalSlowMovers > 0 && (
                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                    {criticalSlowMovers} critical
                                </span>
                            )}
                        </div>
                        <button 
                            onClick={handleExportCSV}
                            disabled={slowMovers.length === 0}
                            className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="h-4 w-4" /> Export CSV
                        </button>
                    </div>
                    
                    {slowMovers.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm text-slate-600">
                                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                                    <tr>
                                        <th className="px-4 py-3">SKU</th>
                                        <th className="px-4 py-3">Product Name</th>
                                        <th className="px-4 py-3">Days No Sale</th>
                                        <th className="px-4 py-3">Current Stock</th>
                                        <th className="px-4 py-3">Stock Value</th>
                                        <th className="px-4 py-3">Recommended Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {slowMovers.slice(0, 10).map((item) => (
                                        <tr key={item.product_id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.sku}</td>
                                            <td className="px-4 py-3 font-medium text-slate-800">{item.name}</td>
                                            <td className="px-4 py-3">
                                                <span className={`font-medium ${
                                                    item.days_no_sale > 120 ? 'text-red-600' :
                                                    item.days_no_sale > 90 ? 'text-amber-600' :
                                                    'text-slate-600'
                                                }`}>
                                                    {item.days_no_sale} days
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{item.current_stock} units</td>
                                            <td className="px-4 py-3 text-slate-800">${item.stock_value?.toLocaleString()}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                                                    item.urgency === 'critical' ? 'bg-red-100 text-red-700' :
                                                    item.urgency === 'high' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-blue-100 text-blue-700'
                                                }`}>
                                                    {item.recommended_action}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {slowMovers.length > 10 && (
                                <div className="mt-4 text-center">
                                    <p className="text-sm text-slate-500">
                                        Showing 10 of {slowMovers.length} slow-moving items. 
                                        <button className="ml-1 text-indigo-600 hover:underline">View all</button>
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <EmptyState 
                            icon={Package} 
                            title="No slow movers detected" 
                            description="Great news! All your inventory is moving well."
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ label, value, subtext, color, trend, icon: Icon }) => {
    const colorMap = {
        indigo: 'border-l-indigo-500',
        green: 'border-l-emerald-500',
        yellow: 'border-l-amber-500',
        red: 'border-l-red-500',
        blue: 'border-l-blue-500',
    };

    return (
        <div className={`rounded-xl border-l-4 ${colorMap[color]} bg-white p-4 shadow-sm hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-800">{value}</h3>
                    <p className="text-xs text-slate-500 mt-1">{subtext}</p>
                </div>
                {Icon && (
                    <div className={`rounded-lg p-2 ${
                        color === 'green' ? 'bg-emerald-100 text-emerald-600' :
                        color === 'red' ? 'bg-red-100 text-red-600' :
                        color === 'yellow' ? 'bg-amber-100 text-amber-600' :
                        'bg-indigo-100 text-indigo-600'
                    }`}>
                        <Icon className="h-5 w-5" />
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
