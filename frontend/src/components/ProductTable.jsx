import React, { useState, useEffect } from 'react';
import { MoreVertical, ArrowUpDown } from 'lucide-react';
import { inventoryApi } from '../services/api';

const ProductTable = ({ limit }) => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        fetchProducts();
    }, [limit, page]);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            const response = await inventoryApi.getProducts({
                limit: limit || 10, // Assuming backend supports limit/offset or similar
                page: page
            });
            // Handle Django Rest Framework pagination format if applicable (results/count) or direct array
            const data = response.data.results || response.data;
            setProducts(Array.isArray(data) ? data : []);

            if (response.data.count && limit) {
                setTotalPages(Math.ceil(response.data.count / limit));
            }
        } catch (error) {
            console.error("Failed to fetch products:", error);
            // Fallback empty or mock if needed, for now just empty
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status) => {
        // Map backend status or logic to colors
        if (!status) return 'bg-slate-500/10 text-slate-400 border-slate-500/20'; // default

        const s = status.toLowerCase();
        if (s === 'in stock') return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        if (s === 'low stock') return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        if (s === 'out of stock') return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        if (s === 'critical') return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    };

    // Helper to determine status if not provided directly
    const ensureStatus = (product) => {
        if (product.status) return product.status;
        if (product.stock_quantity === 0) return 'Out of Stock';
        if (product.stock_quantity < 20) return 'Low Stock'; // Arbitrary threshold
        return 'In Stock';
    };

    if (loading && products.length === 0) {
        return <div className="p-8 text-center text-slate-500">Loading inventory...</div>;
    }

    return (
        <div className="glass-card w-full overflow-hidden rounded-3xl border border-slate-800 shadow-xl">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-sm">
                    <thead>
                        <tr className="border-b border-slate-800 bg-slate-900/80 text-slate-400">
                            <th className="px-6 py-5 font-medium uppercase tracking-wider text-xs">
                                <div className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors">
                                    Product Name <ArrowUpDown size={14} />
                                </div>
                            </th>
                            <th className="px-6 py-5 font-medium uppercase tracking-wider text-xs">SKU</th>
                            <th className="px-6 py-5 font-medium uppercase tracking-wider text-xs text-right">Price</th>
                            <th className="px-6 py-5 font-medium uppercase tracking-wider text-xs text-right">Stock Level</th>
                            <th className="px-6 py-5 font-medium uppercase tracking-wider text-xs text-center">Status</th>
                            <th className="px-6 py-5 font-medium uppercase tracking-wider text-xs text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                        {products.map((product) => {
                            const status = ensureStatus(product);
                            return (
                                <tr
                                    key={product.id}
                                    className="group hover:bg-slate-800/40 transition-colors duration-150"
                                >
                                    <td className="px-6 py-4 font-medium text-white">
                                        {product.name}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                        {product.sku || 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 text-slate-200 font-mono text-right">
                                        ${Number(product.price).toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 text-slate-200 font-mono text-right">
                                        {product.stock_quantity} units
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${getStatusColor(status)}`}>
                                            {status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button className="text-slate-500 hover:text-blue-400 transition-colors p-2 rounded hover:bg-slate-700/50">
                                            <MoreVertical size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {products.length === 0 && (
                            <tr>
                                <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                                    No products found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            {!limit && (
                <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/50 px-6 py-4 text-sm text-slate-400">
                    <div>Page {page} {totalPages > 1 && `of ${totalPages}`}</div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Previous
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages && totalPages > 0} // simple check
                            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductTable;
