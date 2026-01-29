import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import Dashboard from './Dashboard';

// Mock API with proper data structures
vi.mock('../services/api', () => ({
    default: {
        get: vi.fn((url) => {
            if (url.includes('stats')) {
                return Promise.resolve({
                    data: {
                        total_products: 100,
                        low_stock_count: 5,
                        out_of_stock_count: 2,
                        inventory_value: 50000,
                        avg_forecast_accuracy: 0.85,
                        products_with_forecasts: 50,
                        health_status: 'healthy'
                    }
                });
            }
            if (url.includes('sales-trends')) {
                return Promise.resolve({ data: { dates: [], daily_sales: [] } });
            }
            if (url.includes('top-products')) {
                return Promise.resolve({ data: [] });
            }
            return Promise.resolve({ data: {} });
        }),
    },
}));

test('renders dashboard overview', async () => {
    render(<Dashboard />);
    // Wait for async data to load and show Overview heading
    const heading = await screen.findByText(/Overview/i);
    expect(heading).toBeInTheDocument();
});
