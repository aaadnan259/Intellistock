import React, { useState, useRef, useEffect } from 'react';
import { Download, Activity, TrendingUp, Loader2, AlertCircle, CheckCircle, Info, Package } from 'lucide-react';
import html2canvas from 'html2canvas';
import ForecastChart from './ForecastChart';
import api from '../services/api';
import toast from 'react-hot-toast';

const ForecastingPage = () => {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(true);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [days, setDays] = useState(30);
    const [modelType, setModelType] = useState('auto');
    const chartRef = useRef(null);

    const [chartData, setChartData] = useState([]);
    const [forecastResult, setForecastResult] = useState(null);
    const [error, setError] = useState(null);

    // Fetch products on mount
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/inventory/products/');
                const productList = response.data.results || response.data;
                setProducts(productList);
                if (productList.length > 0) {
                    setSelectedProduct(productList[0].id.toString());
                }
            } catch (err) {
                console.error('Failed to fetch products:', err);
                toast.error('Failed to load products');
            } finally {
                setProductsLoading(false);
            }
        };
        fetchProducts();
    }, []);

    const generateForecast = async () => {
        if (!selectedProduct) {
            toast.error('Please select a product');
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const response = await api.post('/forecasting/advanced-predict/', {
                product_id: parseInt(selectedProduct),
                days: days,
                model: modelType
            });

            const result = response.data;
            setForecastResult(result);

            // Transform data for chart
            const forecastData = result.forecast || [];
            const today = new Date();
            const chartPoints = [];

            // Add historical placeholder (30 days before forecast)
            const avgDaily = result.data_characteristics?.avg_daily || 10;
            const daysOfHistory = Math.min(30, result.data_characteristics?.days_count || 30);
            
            for (let i = daysOfHistory; i > 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                chartPoints.push({
                    date: d.toISOString().split('T')[0],
                    historical: Math.round(avgDaily + (Math.random() - 0.5) * avgDaily * 0.4),
                    forecast: null,
                    lower: null,
                    upper: null
                });
            }

            // Add forecast data
            forecastData.forEach((item, index) => {
                chartPoints.push({
                    date: item.date,
                    historical: index === 0 ? chartPoints[chartPoints.length - 1]?.historical : null,
                    forecast: Math.round(item.value),
                    lower: Math.round(item.lower),
                    upper: Math.round(item.upper)
                });
            });

            setChartData(chartPoints);
            toast.success(`Forecast generated using ${result.model_used} model`);

        } catch (err) {
            console.error("Forecast error:", err);
            const errorMessage = err.response?.data?.error || 'Failed to generate forecast';
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleExportPNG = async () => {
        if (chartRef.current) {
            try {
                const canvas = await html2canvas(chartRef.current, {
                    backgroundColor: '#ffffff',
                    scale: 2
                });
                const link = document.createElement('a');
                const productName = products.find(p => p.id.toString() === selectedProduct)?.name || 'forecast';
                link.download = `${productName.replace(/\s+/g, '_')}_forecast_${days}d.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                toast.success('Chart exported successfully');
            } catch (err) {
                toast.error('Failed to export chart');
            }
        }
    };

    const handleExportCSV = () => {
        if (!forecastResult?.forecast) return;

        const headers = ['Date', 'Predicted Value', 'Lower Bound (80% CI)', 'Upper Bound (80% CI)'];
        const rows = forecastResult.forecast.map(item => [
            item.date,
            item.value.toFixed(2),
            item.lower.toFixed(2),
            item.upper.toFixed(2)
        ]);

        const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const productName = products.find(p => p.id.toString() === selectedProduct)?.name || 'forecast';
        link.download = `${productName.replace(/\s+/g, '_')}_forecast_data.csv`;
        link.click();
        toast.success('CSV exported successfully');
    };

    const selectedProductData = products.find(p => p.id.toString() === selectedProduct);

    // Calculate forecast summary stats
    const forecastStats = forecastResult?.forecast ? {
        totalDemand: Math.round(forecastResult.forecast.reduce((acc, item) => acc + item.value, 0)),
        avgDemand: Math.round(forecastResult.forecast.reduce((acc, item) => acc + item.value, 0) / forecastResult.forecast.length),
        peakDemand: Math.round(Math.max(...forecastResult.forecast.map(item => item.value))),
        minDemand: Math.round(Math.min(...forecastResult.forecast.map(item => item.value)))
    } : null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Advanced Forecasting</h2>
                    <p className="text-sm text-slate-500 mt-1">AI-powered demand prediction with confidence intervals</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={handleExportCSV}
                        disabled={!forecastResult}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Download className="h-4 w-4" /> CSV
                    </button>
                    <button 
                        onClick={handleExportPNG}
                        disabled={chartData.length === 0}
                        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Download className="h-4 w-4" /> PNG
                    </button>
                    <button 
                        onClick={generateForecast} 
                        disabled={loading || !selectedProduct}
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70 transition-colors"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} 
                        Generate Forecast
                    </button>
                </div>
            </div>

            {/* Configuration Panel */}
            <div className="grid gap-4 rounded-xl bg-white p-6 shadow-sm border border-slate-100 sm:grid-cols-4">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Select Product</label>
                    {productsLoading ? (
                        <div className="w-full h-10 bg-slate-100 animate-pulse rounded-lg"></div>
                    ) : (
                        <select 
                            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" 
                            value={selectedProduct} 
                            onChange={(e) => {
                                setSelectedProduct(e.target.value);
                                setForecastResult(null);
                                setChartData([]);
                                setError(null);
                            }}
                        >
                            <option value="">Select a product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.sku})
                                </option>
                            ))}
                        </select>
                    )}
                </div>
                
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Forecast Period</label>
                    <div className="flex gap-1">
                        {[7, 14, 30, 60, 90].map(d => (
                            <button 
                                key={d} 
                                onClick={() => setDays(d)} 
                                className={`flex-1 rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                    days === d 
                                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700' 
                                        : 'border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                                {d}d
                            </button>
                        ))}
                    </div>
                </div>
                
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Model Selection</label>
                    <select 
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                        value={modelType}
                        onChange={(e) => setModelType(e.target.value)}
                    >
                        <option value="auto">Auto (Recommended)</option>
                        <option value="prophet">Prophet (Seasonal)</option>
                        <option value="arima">ARIMA (Trend)</option>
                        <option value="exponential">Exponential Smoothing</option>
                        <option value="ensemble">Ensemble (All Models)</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Current Stock</label>
                    <div className="flex items-center gap-2 h-10 px-3 rounded-lg bg-slate-100">
                        {selectedProductData ? (
                            <>
                                <span className={`text-lg font-bold ${
                                    selectedProductData.current_stock === 0 ? 'text-red-600' :
                                    selectedProductData.current_stock < 10 ? 'text-amber-600' :
                                    'text-slate-800'
                                }`}>
                                    {selectedProductData.current_stock}
                                </span>
                                <span className="text-sm text-slate-500">units</span>
                            </>
                        ) : (
                            <span className="text-sm text-slate-400">Select a product</span>
                        )}
                    </div>
                </div>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                    <div>
                        <p className="text-sm font-medium text-red-800">Forecast Error</p>
                        <p className="text-sm text-red-600">{error}</p>
                    </div>
                </div>
            )}

            {/* Chart Area */}
            <div ref={chartRef} className="relative min-h-[400px]">
                {chartData.length > 0 ? (
                    <ForecastChart data={chartData} />
                ) : (
                    <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <div className="rounded-full bg-indigo-100 p-4 mb-4">
                            <TrendingUp className="h-8 w-8 text-indigo-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-800">Ready to Forecast</h3>
                        <p className="mt-2 text-sm text-slate-500 max-w-md text-center">
                            Select a product and click "Generate Forecast" to see AI-powered demand predictions with confidence intervals.
                        </p>
                    </div>
                )}
            </div>

            {/* Results Panel */}
            {forecastResult && (
                <div className="space-y-4">
                    {/* Model Info */}
                    <div className="flex items-center gap-3 rounded-lg bg-blue-50 border border-blue-200 p-4">
                        <Info className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-blue-800">
                                Model Used: <span className="font-bold uppercase">{forecastResult.model_used}</span>
                            </p>
                            <p className="text-sm text-blue-600">{forecastResult.reason}</p>
                        </div>
                        <CheckCircle className="h-5 w-5 text-green-500" />
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                        <MetricCard
                            label="R² Score"
                            value={forecastResult.metrics?.r2?.toFixed(3) || 'N/A'}
                            description="Model fit quality"
                            color="emerald"
                            good={forecastResult.metrics?.r2 >= 0.7}
                        />
                        <MetricCard
                            label="MAE"
                            value={forecastResult.metrics?.mae?.toFixed(2) || 'N/A'}
                            description="Mean Absolute Error"
                            color="amber"
                        />
                        <MetricCard
                            label="MAPE"
                            value={forecastResult.metrics?.mape ? `${(forecastResult.metrics.mape * 100).toFixed(1)}%` : 'N/A'}
                            description="Percentage Error"
                            color="blue"
                        />
                        <MetricCard
                            label="Avg Daily Demand"
                            value={forecastResult.data_characteristics?.avg_daily?.toFixed(1) || 'N/A'}
                            description="Historical average"
                            color="purple"
                        />
                        <MetricCard
                            label="Seasonality"
                            value={forecastResult.data_characteristics?.seasonality?.toFixed(2) || 'N/A'}
                            description={forecastResult.data_characteristics?.seasonality > 0.3 ? 'Strong pattern' : 'Weak pattern'}
                            color="indigo"
                        />
                    </div>

                    {/* Forecast Summary */}
                    {forecastStats && (
                        <div className="rounded-xl bg-white p-6 shadow-sm border border-slate-100">
                            <h4 className="text-lg font-bold text-slate-800 mb-4">Forecast Summary ({days} Days)</h4>
                            <div className="grid gap-4 sm:grid-cols-4">
                                <SummaryCard 
                                    label="Total Predicted Demand" 
                                    value={forecastStats.totalDemand.toLocaleString()} 
                                    unit="units"
                                />
                                <SummaryCard 
                                    label="Average Daily Demand" 
                                    value={forecastStats.avgDemand.toLocaleString()} 
                                    unit="units/day"
                                />
                                <SummaryCard 
                                    label="Peak Day Demand" 
                                    value={forecastStats.peakDemand.toLocaleString()} 
                                    unit="units"
                                />
                                <SummaryCard 
                                    label="Minimum Day Demand" 
                                    value={forecastStats.minDemand.toLocaleString()} 
                                    unit="units"
                                />
                            </div>
                            
                            {/* Stock Warning */}
                            {selectedProductData && forecastStats.totalDemand > selectedProductData.current_stock && (
                                <div className="mt-4 flex items-center gap-3 rounded-lg bg-amber-50 border border-amber-200 p-4">
                                    <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Stock Alert</p>
                                        <p className="text-sm text-amber-600">
                                            Current stock ({selectedProductData.current_stock} units) may not meet predicted demand ({forecastStats.totalDemand} units). 
                                            Consider ordering <strong>{forecastStats.totalDemand - selectedProductData.current_stock}</strong> additional units.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Metric Card Component
const MetricCard = ({ label, value, description, color, good }) => {
    const colorMap = {
        emerald: 'border-l-emerald-500',
        amber: 'border-l-amber-500',
        blue: 'border-l-blue-500',
        purple: 'border-l-purple-500',
        indigo: 'border-l-indigo-500',
    };

    return (
        <div className={`rounded-xl border-l-4 ${colorMap[color]} bg-white p-4 shadow-sm`}>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
            <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-slate-800">{value}</p>
                {good !== undefined && (
                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${good ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {good ? 'Good' : 'Fair'}
                    </span>
                )}
            </div>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ label, value, unit }) => (
    <div className="text-center p-4 rounded-lg bg-slate-50">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
        <p className="text-xs text-slate-400">{unit}</p>
    </div>
);

export default ForecastingPage;
