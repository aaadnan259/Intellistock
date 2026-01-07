import React, { useState, useEffect } from 'react';
import axios from 'axios';

const InventoryList = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data for now, replace with API call later
        // axios.get('http://localhost:8000/api/inventory/products/')
        //   .then(res => setProducts(res.data));
        setProducts([
            { id: 1, name: 'Laptop', sku: 'LPT-001', price: 999.99, current_stock: 50 },
            { id: 2, name: 'Mouse', sku: 'MSE-002', price: 29.99, current_stock: 200 },
            { id: 3, name: 'Keyboard', sku: 'KBD-003', price: 59.99, current_stock: 150 },
        ]);
        setLoading(false);
    }, []);

    if (loading) return <div>Loading...</div>;

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Inventory</h1>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {products.map((product) => (
                            <tr key={product.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{product.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{product.sku}</td>
                                <td className="px-6 py-4 whitespace-nowrap">${product.price}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{product.current_stock}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default InventoryList;
