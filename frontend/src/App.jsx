import React, { useEffect, useState } from 'react';
import api from './api';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [forecasts, setForecasts] = useState({});

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const resp = await api.get('/inventory/products/');
      setProducts(resp.data);
    } catch (err) {
      console.error("Backend offline?", err);
    } finally {
      setLoading(false);
    }
  };

  const getForecast = async (productId) => {
    try {
      setForecasts(prev => ({ ...prev, [productId]: '...' }));
      const resp = await api.get(`/forecasting/predict/${productId}/`);
      setForecasts(prev => ({ ...prev, [productId]: resp.data.forecast_next_day }));
    } catch (err) {
      console.error(err);
      setForecasts(prev => ({ ...prev, [productId]: 'Error' }));
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading system...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 border-b pb-4">
          <h1 className="text-2xl font-bold text-slate-800">Intellistock v1.0</h1>
          <p className="text-slate-500">Production Inventory Control</p>
        </header>

        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 uppercase text-xs font-semibold text-gray-700">
              <tr>
                <th className="px-6 py-3">SKU</th>
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Price</th>
                <th className="px-6 py-3">Stock Level</th>
                <th className="px-6 py-3">Demand Forecast</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-mono text-slate-700">{p.sku}</td>
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4">${p.price}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${p.current_stock < 10 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                      {p.current_stock}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-indigo-600">
                    {forecasts[p.id] !== undefined ? forecasts[p.id] : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => getForecast(p.id)}
                      className="text-xs bg-slate-800 text-white px-3 py-2 rounded hover:bg-slate-700 active:bg-slate-900 transition-all"
                    >
                      Run Forecast
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && (
            <div className="p-8 text-center text-gray-400 italic">No products in database.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
