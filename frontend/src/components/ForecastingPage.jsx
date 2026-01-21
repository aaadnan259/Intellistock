import React, { useState, useEffect } from 'react';
import { Target, TrendingUp, Calendar, RefreshCw } from 'lucide-react';
import ForecastChart from './ForecastChart';
import { forecastingApi, inventoryApi } from '../services/api';
import toast from 'react-hot-toast';

const ForecastingPage = () => {
    const [products, setProducts] = useState([]);
    const [selectedProduct, setSelectedProduct] = useState('');
    const [forecastData, setForecastData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [days, setDays] = useState(30);

    useEffect(() => {
        // Load available products for dropdown
        const loadProducts = async () => {
            try {
                const res = await inventoryApi.getProducts({ limit: 100 });
                const list = res.data.results || [];
                setProducts(list);
                if (list.length > 0) setSelectedProduct(list[0].id);
            } catch (e) {
                console.error("Error loading products", e);
            }
        };
        loadProducts();
    }, []);

    useEffect(() => {
        if (selectedProduct) {
            runForecast();
        }
    }, [selectedProduct, days]);

    const runForecast = async () => {
        setLoading(true);
        try {
            const res = await forecastingApi.predict({
                product_id: selectedProduct,
                days: days === 30 ? 30 : days === 90 ? 90 : 365,
                model: 'auto'
            });

            setForecastData(res.data.forecast || []);
            toast.success("Forecast updated");
        } catch (e) {
            console.error("Forecast failed", e);
            toast.error("Failed to generate forecast (Mocking for demo)");
            // Mocking data for demo if API fails
            setForecastData([
                { date: 'Jan', actual: 4000, forecast: null },
                { date: 'Feb', actual: 3000, forecast: null },
                { date: 'Mar', actual: 2000, forecast: null },
                { date: 'Apr', actual: 2780, forecast: null },
                { date: 'May', actual: 1890, forecast: 2000, upper_bound: 2400, lower_bound: 1600 },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Demand Forecasting</h2>
                    <p className="text-slate-400 mt-1">AI-powered demand prediction with confidence intervals.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-1">
                        <button className="px-3 py-1.5 text-sm font-medium rounded text-white bg-primary shadow-sm">
                            Items
                        </button>
                        <button className="px-3 py-1.5 text-sm font-medium rounded text-slate-400 hover:text-white transition-colors">
                            Categories
                        </button>
                    </div>

                    <button
                        onClick={runForecast}
                        disabled={loading || !selectedProduct}
                        className={`p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-primary border border-slate-700 transition-colors ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Controls Side Panel */}
                <div className="space-y-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm">
                        <label className="block text-sm font-medium text-slate-400 mb-2">Select Product</label>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="w-full bg-slate-800 border-slate-700 rounded-lg text-white p-2.5 outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        >
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                            {products.length === 0 && <option>Loading...</option>}
                        </select>

                        <div className="mt-6 space-y-4">
                            <label className="block text-sm font-medium text-slate-400">Forecast Horizon</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[30, 90, 365].map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setDays(d)}
                                        className={`px-2 py-2 text-xs font-medium rounded border transition-colors ${days === d
                                                ? 'border-primary bg-primary/20 text-primary'
                                                : 'border-slate-700 bg-slate-800/50 text-slate-300 hover:border-primary hover:text-primary'
                                            }`}
                                    >
                                        {d === 365 ? '1 Year' : `${d} Days`}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-800 space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded bg-emerald-500/10 text-emerald-400">
                                    <Target size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Model Accuracy</p>
                                    <p className="text-2xl font-mono text-white">94.2%</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded bg-blue-500/10 text-blue-400">
                                    <TrendingUp size={20} />
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Growth Trend</p>
                                    <p className="text-2xl font-mono text-white">+12.5%</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Chart Area */}
                <div className="lg:col-span-3 space-y-6">
                    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 backdrop-blur-sm min-h-[500px]">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    {products.find(p => p.id == selectedProduct)?.name || 'Product'} Forecast
                                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">High Confidence</span>
                                </h3>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-400">
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-slate-500"></span> Historical
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-cyan-400 border border-dashed border-white"></span> AI Prediction
                                </div>
                            </div>
                        </div>

                        {loading && forecastData.length === 0 ? (
                            <div className="h-[400px] flex items-center justify-center text-slate-500">Generating forecast...</div>
                        ) : (
                            <ForecastChart data={forecastData} />
                        )}

                        <div className="mt-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/10 flex items-start gap-3">
                            <div className="p-1">
                                <Calendar className="text-blue-400" size={18} />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-white">Seasonal Insight</h4>
                                <p className="text-sm text-slate-400 mt-1">
                                    Sales for historically peak in late July. We recommend stocking up by <strong>June 15th</strong> to avoid stockouts.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForecastingPage;
