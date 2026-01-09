import React, { useState, useRef } from 'react';
import { Download, Activity, TrendingUp, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import ForecastChart from './ForecastChart';
import api from '../services/api';

const ForecastingPage = () => {
    const [loading, setLoading] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState('1');
    const [days, setDays] = useState(30);
    const chartRef = useRef(null);

    const [chartData, setChartData] = useState([]);
    const [metrics, setMetrics] = useState({
        r2_score: 0,
        mae: 0,
        predicted_demand: 0,
        confidence_level: 0
    });

    const generateForecast = async () => {
        setLoading(true);
        try {
            // Simulate API delay
            await new Promise(r => setTimeout(r, 1500));

            const today = new Date();
            const data = [];
            // Generate historical data
            for (let i = 30; i > 0; i--) {
                const d = new Date(today);
                d.setDate(d.getDate() - i);
                data.push({
                    date: d.toISOString().split('T')[0],
                    historical: Math.floor(Math.random() * 50) + 50,
                    forecast: null,
                    range: null
                });
            }
            // Generate forecast data
            let lastVal = data[data.length - 1].historical;
            for (let i = 0; i < days; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() + i);
                const forecastVal = lastVal + (Math.random() * 10 - 4);
                lastVal = forecastVal;
                const range = [forecastVal - 10, forecastVal + 10];

                data.push({
                    date: d.toISOString().split('T')[0],
                    historical: null,
                    forecast: Math.round(forecastVal),
                    range: range
                });
            }

            setChartData(data);
            setMetrics({
                r2_score: 0.89,
                mae: 4.2,
                predicted_demand: Math.round(data.slice(-days).reduce((acc, curr) => acc + curr.forecast, 0)),
                confidence_level: 95
            });

        } catch (error) {
            console.error("Forecast error", error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async () => {
        if (chartRef.current) {
            const canvas = await html2canvas(chartRef.current);
            const link = document.createElement('a');
            link.download = 'forecast-chart.png';
            link.href = canvas.toDataURL();
            link.click();
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Advanced Forecasting</h2>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                        <Download className="h-4 w-4" /> Export
                    </button>
                    <button onClick={generateForecast} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-70">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Generate Forecast
                    </button>
                </div>
            </div>

            <div className="grid gap-4 rounded-xl bg-white p-6 shadow-sm border border-slate-100 sm:grid-cols-3">
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Select Product</label>
                    <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
                        <option value="1">Wireless Headphones (SKU-001)</option>
                        <option value="2">Ergonomic Mouse (SKU-002)</option>
                    </select>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Days</label>
                    <div className="flex gap-2">
                        {[30, 60, 90].map(d => (
                            <button key={d} onClick={() => setDays(d)} className={`flex-1 rounded-lg border px-3 py-2 text-sm ${days === d ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-200'}`}>{d}d</button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">Model</label>
                    <select className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                        <option>Ensemble (Best Accuracy)</option>
                        <option>ARIMA</option>
                    </select>
                </div>
            </div>

            <div ref={chartRef} className="relative min-h-[400px]">
                {chartData.length > 0 ? <ForecastChart data={chartData} /> : (
                    <div className="flex h-[400px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                        <TrendingUp className="h-8 w-8 text-indigo-400" />
                        <p className="mt-4 text-sm text-slate-500">Generate a forecast to see trends.</p>
                    </div>
                )}
            </div>

            {metrics.predicted_demand > 0 && (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-400">R² Score</p>
                        <p className="text-2xl font-bold">{metrics.r2_score}</p>
                    </div>
                    <div className="rounded-xl border-l-4 border-amber-500 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-400">MAE</p>
                        <p className="text-2xl font-bold">{metrics.mae}</p>
                    </div>
                    <div className="rounded-xl border-l-4 border-blue-500 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-400">Predicted Demand</p>
                        <p className="text-2xl font-bold">{metrics.predicted_demand}</p>
                    </div>
                    <div className="rounded-xl border-l-4 border-purple-500 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-400">Confidence</p>
                        <p className="text-2xl font-bold">{metrics.confidence_level}%</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ForecastingPage;
