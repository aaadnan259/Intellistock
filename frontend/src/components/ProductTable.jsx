import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, ChevronUp, ChevronDown, Loader2, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import api from '../services/api';
import Sparkline from './Sparkline';

const ProductTable = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortConfig, setSortConfig] = useState({ key: 'sku', direction: 'asc' });
    const [forecastingIds, setForecastingIds] = useState(new Set());

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await api.get('/inventory/products/');
                setProducts(response.data);
            } catch (error) {
                console.error('Failed to fetch products', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleForecastInfo = async (productId) => {
        setForecastingIds(prev => new Set(prev).add(productId));
        try {
            const response = await api.post(`/forecasting/predict/${productId}/`);
            // Update the product with the new forecast data
            setProducts(prevProducts => prevProducts.map(p =>
                p.id === productId ? { ...p, forecast: response.data } : p
            ));
        } catch (error) {
            console.error("Forecast failed", error);
        } finally {
            setForecastingIds(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    const filteredAndSortedProducts = useMemo(() => {
        let result = [...products];

        // Filter by search
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(p =>
                p.name.toLowerCase().includes(lowerQuery) ||
                p.sku.toLowerCase().includes(lowerQuery)
            );
        }

        // Filter by status
        if (statusFilter !== 'All') {
            result = result.filter(p => {
                if (statusFilter === 'Low Stock') return p.current_stock > 0 && p.current_stock < 10;
                if (statusFilter === 'Out of Stock') return p.current_stock === 0;
                return true;
            });
        }

        // Sort
        if (sortConfig.key) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                if (typeof aValue === 'string') aValue = aValue.toLowerCase();
                if (typeof bValue === 'string') bValue = bValue.toLowerCase();

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [products, searchQuery, statusFilter, sortConfig]);

    if (loading) {
        return (
            <div className="flex h-64 w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Inventory Management</h2>

                <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by SKU or Name..."
                            className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:w-64"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <select
                            className="w-full appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-8 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:w-40"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option>All</option>
                            <option>Low Stock</option>
                            <option>Out of Stock</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <tr>
                                <th className="group cursor-pointer px-6 py-4 text-left hover:bg-slate-100" onClick={() => handleSort('sku')}>
                                    <div className="flex items-center gap-1">
                                        SKU
                                        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                </th>
                                <th className="group cursor-pointer px-6 py-4 text-left hover:bg-slate-100" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        Product Name
                                        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                </th>
                                <th className="group cursor-pointer px-6 py-4 text-left hover:bg-slate-100" onClick={() => handleSort('price')}>
                                    <div className="flex items-center gap-1">
                                        Price
                                        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                </th>
                                <th className="group cursor-pointer px-6 py-4 text-left hover:bg-slate-100" onClick={() => handleSort('current_stock')}>
                                    <div className="flex items-center gap-1">
                                        Stock
                                        <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                                    </div>
                                </th>
                                <th className="px-6 py-4 text-left">7-Day Trend</th>
                                <th className="px-6 py-4 text-left">Forecast</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                            {filteredAndSortedProducts.length > 0 ? (
                                filteredAndSortedProducts.map((product) => (
                                    <tr key={product.id} className="transition-colors hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono text-xs text-slate-500">{product.sku}</td>
                                        <td className="px-6 py-4 font-bold text-slate-900">{product.name}</td>
                                        <td className="px-6 py-4">${product.price.toFixed(2)}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.current_stock === 0 ? 'bg-red-100 text-red-800' :
                                                    product.current_stock < 10 ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-green-100 text-green-800'
                                                }`}>
                                                {product.current_stock} units
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Sparkline data={product.sales_history || []} color={product.forecast?.trend === 'down' ? '#ef4444' : '#10b981'} />
                                        </td>
                                        <td className="px-6 py-4">
                                            {product.forecast ? (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold">{product.forecast.value}</span>
                                                    {product.forecast.trend === 'up' && <TrendingUp className="h-4 w-4 text-green-500" />}
                                                    {product.forecast.trend === 'down' && <TrendingDown className="h-4 w-4 text-red-500" />}
                                                    {product.forecast.trend === 'stable' && <ArrowRight className="h-4 w-4 text-slate-400" />}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs">No data</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleForecastInfo(product.id); }}
                                                disabled={forecastingIds.has(product.id)}
                                                className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 disabled:opacity-50"
                                            >
                                                {forecastingIds.has(product.id) ? (
                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                ) : (
                                                    <TrendingUp className="h-3 w-3" />
                                                )}
                                                Forecast
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="bg-slate-50 p-4 rounded-full mb-3">
                                                <Search className="h-6 w-6 text-slate-400" />
                                            </div>
                                            <h3 className="text-lg font-medium text-slate-900">No products found</h3>
                                            <p className="text-slate-500 max-w-xs mx-auto mt-1">Try adjusting your search criteria or filter to find what you're looking for.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ProductTable;
