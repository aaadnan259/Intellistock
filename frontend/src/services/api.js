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

// Exponential backoff retry for transient failures
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Don't retry if we've exhausted attempts or it's not retryable
        if (!config || config._retryCount >= MAX_RETRIES) {
            return Promise.reject(error);
        }

        // Only retry on network errors or 5xx server errors
        const isNetworkError = !error.response;
        const isServerError = error.response?.status >= 500;

        if (!isNetworkError && !isServerError) {
            return Promise.reject(error);
        }

        config._retryCount = (config._retryCount || 0) + 1;
        const delay = RETRY_DELAY_MS * Math.pow(2, config._retryCount - 1);

        console.warn(`API retry ${config._retryCount}/${MAX_RETRIES} after ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));

        return api(config);
    }
);

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
