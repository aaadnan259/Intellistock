import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, test, expect } from 'vitest';
import Dashboard from '../pages/Dashboard';

// Mock API
vi.mock('../services/api', () => ({
    inventoryApi: {
        getDashboardStats: vi.fn(() => Promise.resolve({ data: {} })),
        getSalesTrends: vi.fn(() => Promise.resolve({ data: { dates: [], daily_sales: [] } })),
        getSlowMovers: vi.fn(() => Promise.resolve({ data: [] })),
    },
}));

test('renders dashboard heading', async () => {
    render(<Dashboard />);
    const heading = await screen.findByText(/Dashboard Overview/i);
    expect(heading).toBeInTheDocument();
});
