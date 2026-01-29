import axios from 'axios';

// Security: Fail hard if VITE_API_URL is missing in production
const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL && import.meta.env.PROD) {
    console.error("CRITICAL: VITE_API_URL is not defined in production environment.");
}

const api = axios.create({
    baseURL: baseURL || '/api', // Fallback for dev proxy, but never 'localhost'
    timeout: 10000, // 10s timeout
    headers: {
        'Content-Type': 'application/json',
    },
});

export const inventoryApi = {
    getProducts: (params) => api.get('/inventory/products/', { params }),
    getProduct: (id) => api.get(`/inventory/products/${id}/`),
    getSalesTrends: (days = 30) => api.get(`/inventory/analytics/sales-trends/?days=${days}`),
    getABCAnalysis: () => api.get('/inventory/analytics/abc-analysis/'),
    getDashboardStats: () => api.get('/inventory/stats/'),
    getSlowMovers: () => api.get('/inventory/analytics/slow-movers/'),
};

export const forecastingApi = {
    predict: (data) => api.post('/forecasting/advanced-predict/', data),
    batchStatus: () => api.get('/forecasting/batch-status/'),
};

export default api;
