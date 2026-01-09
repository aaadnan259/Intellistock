import axios from 'axios';

// Use environment variable with fallback to proxy path (not localhost)
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL,
    timeout: 15000,  // Increased timeout for forecast operations
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor
api.interceptors.request.use(
    (config) => {
        // Add auth token if available
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor with comprehensive error handling and mock fallbacks
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const { config, response } = error;
        
        console.error('API Error:', {
            url: config?.url,
            status: response?.status,
            message: error.message
        });

        // Mock data fallback for development/demo when backend is unavailable
        if (error.code === 'ERR_NETWORK' || !response) {
            return getMockResponse(config);
        }

        // Handle specific HTTP errors
        if (response?.status === 401) {
            // Handle unauthorized - redirect to login
            localStorage.removeItem('authToken');
            window.location.href = '#login';
        }

        if (response?.status === 429) {
            // Rate limited - show friendly message
            console.warn('Rate limited. Please try again in a moment.');
        }

        return Promise.reject(error);
    }
);

// Mock data generator for demo purposes
function getMockResponse(config) {
    const url = config?.url || '';
    
    // Dashboard stats
    if (url.includes('/inventory/stats/')) {
        return Promise.resolve({
            data: {
                total_products: 1250,
                low_stock_count: 8,
                inventory_value: 487500.00,
                avg_forecast_accuracy: 0.847
            }
        });
    }
    
    // Product list
    if (url.includes('/inventory/products/')) {
        return Promise.resolve({
            data: generateMockProducts()
        });
    }
    
    // ABC Analysis
    if (url.includes('/analytics/abc-analysis/')) {
        return Promise.resolve({
            data: {
                a_items: generateMockProducts().slice(0, 3).map(p => ({
                    ...p, value: p.price * 1000, percentile: 0.1
                })),
                b_items: generateMockProducts().slice(3, 6).map(p => ({
                    ...p, value: p.price * 500, percentile: 0.4
                })),
                c_items: generateMockProducts().slice(6, 10).map(p => ({
                    ...p, value: p.price * 100, percentile: 0.8
                })),
                summary: {
                    a_count: 3,
                    b_count: 3,
                    c_count: 4,
                    a_value_pct: 78.5,
                    b_value_pct: 15.2,
                    c_value_pct: 6.3
                }
            }
        });
    }
    
    // Slow movers
    if (url.includes('/analytics/slow-movers/')) {
        return Promise.resolve({
            data: [
                { product_id: 101, name: 'Legacy USB Hub', sku: 'USB-001', days_no_sale: 95, stock_value: 450, current_stock: 30, recommended_action: 'Markdown 30-50%', urgency: 'high' },
                { product_id: 102, name: 'VGA Adapter', sku: 'VGA-002', days_no_sale: 120, stock_value: 180, current_stock: 45, recommended_action: 'Liquidate/Discount heavily (50%+)', urgency: 'critical' },
                { product_id: 103, name: 'CD-ROM Drive', sku: 'CDR-001', days_no_sale: 200, stock_value: 320, current_stock: 16, recommended_action: 'Liquidate/Discount heavily (50%+)', urgency: 'critical' },
            ]
        });
    }
    
    // Sales trends
    if (url.includes('/analytics/sales-trends/')) {
        const dates = [];
        const sales = [];
        const ma = [];
        const today = new Date();
        
        for (let i = 89; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            dates.push(d.toISOString().split('T')[0]);
            
            // Generate realistic-looking sales with weekly pattern
            const base = 5000 + Math.sin(i / 7 * Math.PI) * 1000;
            const noise = (Math.random() - 0.5) * 1000;
            const trend = i * 10; // Slight upward trend
            sales.push(Math.round(base + noise + trend));
        }
        
        // Calculate 7-day MA
        for (let i = 0; i < sales.length; i++) {
            if (i < 6) {
                ma.push(sales.slice(0, i + 1).reduce((a, b) => a + b, 0) / (i + 1));
            } else {
                ma.push(sales.slice(i - 6, i + 1).reduce((a, b) => a + b, 0) / 7);
            }
        }
        
        return Promise.resolve({
            data: {
                dates,
                daily_sales: sales,
                moving_average: ma.map(v => Math.round(v)),
                trend: 'increasing',
                trend_slope: 12.5,
                period_total: sales.reduce((a, b) => a + b, 0),
                period_avg: Math.round(sales.reduce((a, b) => a + b, 0) / sales.length)
            }
        });
    }
    
    // Forecast
    if (url.includes('/forecasting/advanced-predict')) {
        return Promise.resolve({
            data: generateMockForecast()
        });
    }
    
    // Default rejection for unknown endpoints
    return Promise.reject(new Error('Network unavailable and no mock data for this endpoint'));
}

function generateMockProducts() {
    return [
        { id: 1, sku: 'SKU-001', name: 'Wireless Bluetooth Headphones', price: 89.99, current_stock: 45, sales_history: [12, 15, 10, 18, 14, 16, 20], forecast: { value: 22, trend: 'up' } },
        { id: 2, sku: 'SKU-002', name: 'Ergonomic Wireless Mouse', price: 49.99, current_stock: 5, sales_history: [8, 6, 5, 4, 3, 2, 1], forecast: { value: 1, trend: 'down' } },
        { id: 3, sku: 'SKU-003', name: 'Mechanical Gaming Keyboard', price: 129.99, current_stock: 120, sales_history: [4, 5, 3, 6, 4, 5, 4], forecast: { value: 5, trend: 'stable' } },
        { id: 4, sku: 'SKU-004', name: 'USB-C Hub 7-in-1', price: 34.99, current_stock: 8, sales_history: [25, 28, 22, 30, 18, 15, 12], forecast: { value: 10, trend: 'down' } },
        { id: 5, sku: 'SKU-005', name: 'Laptop Stand Aluminum', price: 59.99, current_stock: 67, sales_history: [3, 4, 5, 4, 6, 5, 7], forecast: { value: 8, trend: 'up' } },
        { id: 6, sku: 'SKU-006', name: '27" 4K Monitor', price: 399.99, current_stock: 12, sales_history: [2, 1, 3, 2, 2, 3, 2], forecast: { value: 2, trend: 'stable' } },
        { id: 7, sku: 'SKU-007', name: 'Webcam 1080p HD', price: 79.99, current_stock: 0, sales_history: [15, 18, 20, 22, 25, 28, 30], forecast: { value: 32, trend: 'up' } },
        { id: 8, sku: 'SKU-008', name: 'Desk Organizer Set', price: 24.99, current_stock: 200, sales_history: [1, 2, 1, 1, 2, 1, 2], forecast: { value: 2, trend: 'stable' } },
        { id: 9, sku: 'SKU-009', name: 'Noise Cancelling Earbuds', price: 149.99, current_stock: 35, sales_history: [8, 10, 12, 9, 11, 13, 15], forecast: { value: 16, trend: 'up' } },
        { id: 10, sku: 'SKU-010', name: 'Wireless Charging Pad', price: 29.99, current_stock: 89, sales_history: [6, 7, 5, 8, 6, 7, 6], forecast: { value: 7, trend: 'stable' } },
    ];
}

function generateMockForecast() {
    const today = new Date();
    const forecast = [];
    let lastValue = 50 + Math.random() * 20;
    
    for (let i = 0; i < 30; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        
        // Add some trend and noise
        const trend = i * 0.3;
        const noise = (Math.random() - 0.5) * 10;
        const value = Math.max(0, Math.round(lastValue + trend + noise));
        lastValue = value;
        
        forecast.push({
            date: d.toISOString().split('T')[0],
            value,
            lower: Math.max(0, Math.round(value * 0.8)),
            upper: Math.round(value * 1.2)
        });
    }
    
    return {
        product_id: 1,
        product_name: 'Wireless Bluetooth Headphones',
        model_used: 'prophet',
        reason: 'High seasonality detected',
        forecast,
        metrics: {
            r2: 0.89,
            mae: 3.2,
            mape: 0.08
        },
        data_characteristics: {
            total_sales: 4520,
            avg_daily: 12.5,
            cv: 0.35,
            trend: 0.15,
            seasonality: 0.42,
            days_count: 365
        }
    };
}

export default api;
