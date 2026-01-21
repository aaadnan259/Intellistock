import axios from 'axios';

const api = axios.create({
    baseURL: '/api', // Vite proxy will handle forwarding to Backend
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
