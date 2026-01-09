import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Adjust if your Django backend runs on a different port
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to add auth token if needed in the future
api.interceptors.request.use(
    (config) => {
        // const token = localStorage.getItem('token');
        // if (token) {
        //   config.headers.Authorization = `Bearer ${token}`;
        // }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor to handle errors or mock data if backend is missing
api.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response || error.message);

        // MOCK DATA FALLBACK (For demo purposes if backend is not ready)
        // Only applies if the request fails
        if (error.code === 'ERR_NETWORK' || error.response?.status === 404) {
            if (error.config.url.includes('/inventory/stats/')) {
                return {
                    data: {
                        total_products: 1250,
                        low_stock_count: 5,
                        inventory_value: 450000,
                        avg_forecast_accuracy: 0.85
                    }
                };
            }
            if (error.config.url.includes('/inventory/products/')) {
                return {
                    data: [
                        { id: 1, sku: 'SKU-001', name: 'Wireless Headphones', price: 99.99, current_stock: 45, sales_history: [10, 12, 15, 8, 12, 14, 18], forecast: { value: 20, trend: 'up' } },
                        { id: 2, sku: 'SKU-002', name: 'Ergonomic Mouse', price: 49.99, current_stock: 5, sales_history: [5, 4, 3, 2, 1, 0, 1], forecast: { value: 0, trend: 'down' } },
                        { id: 3, sku: 'SKU-003', name: 'Mechanical Keyboard', price: 129.99, current_stock: 120, sales_history: [2, 3, 2, 4, 3, 5, 4], forecast: { value: 5, trend: 'stable' } },
                        { id: 4, sku: 'SKU-004', name: 'USB-C Cable', price: 19.99, current_stock: 8, sales_history: [50, 45, 60, 55, 40, 35, 30], forecast: { value: 25, trend: 'down' } },
                        { id: 5, sku: 'SKU-005', name: 'Monitor Stand', price: 39.99, current_stock: 15, sales_history: [1, 2, 1, 1, 3, 2, 4], forecast: { value: 5, trend: 'up' } },
                    ]
                };
            }
        }

        return Promise.reject(error);
    }
);

export default api;
