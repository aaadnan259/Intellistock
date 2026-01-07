import React, { useEffect, useState } from 'react';
import api from './api';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [predictions, setPredictions] = useState({});
  const [predicting, setPredicting] = useState({});

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/inventory/products/');
      setProducts(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch products. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async (productId) => {
    setPredicting(prev => ({ ...prev, [productId]: true }));
    try {
      const response = await api.get(`/prediction/predict/${productId}/`);
      setPredictions(prev => ({
        ...prev,
        [productId]: response.data.predicted_sales_tomorrow
      }));
    } catch (err) {
      console.error(err);
      alert('Prediction failed');
    } finally {
      setPredicting(prev => ({ ...prev, [productId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Intellistock Dashboard</h1>
          <p className="text-gray-600 mt-2">AI-Powered Inventory Management</p>
        </header>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading inventory...</p>
          </div>
        ) : (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">AI Forecast (Tomorrow)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">No products found. Add some in Django Admin.</td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.sku}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${product.price}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${product.current_stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                          {product.current_stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {predictions[product.id] !== undefined ? (
                          <span className="font-bold text-blue-600">{predictions[product.id]} units</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handlePredict(product.id)}
                          disabled={predicting[product.id]}
                          className={`text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1 rounded-md text-sm transition-colors ${predicting[product.id] ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        >
                          {predicting[product.id] ? 'Analyzing...' : 'Predict Demand'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
