import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ForecastChart from './ForecastChart';

// Mock Recharts to avoid SVG complexity and focus on prop/data logic
vi.mock('recharts', () => ({
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
    ComposedChart: ({ data, children }) => (
        <div data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
            {children}
        </div>
    ),
    Area: () => <div data-testid="area" />,
    Line: () => <div data-testid="line" />,
    XAxis: () => <div data-testid="xaxis" />,
    YAxis: () => <div data-testid="yaxis" />,
    CartesianGrid: () => <div data-testid="grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
}));

// Mock LoadingSkeleton to verify loading state logic
vi.mock('./LoadingSkeleton', () => ({
    default: ({ className }) => <div data-testid="loading-skeleton" className={className} />
}));

describe('ForecastChart', () => {
    const mockData = [
        { date: '2023-01-01', value: 100, lower: 90, upper: 110 },
        { date: '2023-01-02', value: 105, lower: 95, upper: 115 },
    ];

    it('renders loading skeleton when loading is true', () => {
        render(<ForecastChart data={[]} loading={true} />);
        expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
        expect(screen.queryByTestId('composed-chart')).not.toBeInTheDocument();
    });

    it('renders empty state message when data is empty', () => {
        render(<ForecastChart data={[]} loading={false} />);
        expect(screen.getByText('No forecast data available')).toBeInTheDocument();
    });

    it('renders empty state message when data is null', () => {
        render(<ForecastChart data={null} loading={false} />);
        expect(screen.getByText('No forecast data available')).toBeInTheDocument();
    });

    it('renders chart when data is provided', () => {
        render(<ForecastChart data={mockData} loading={false} />);
        expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
        expect(screen.queryByTestId('loading-skeleton')).not.toBeInTheDocument();
    });

    it('transforms data correctly for the chart', () => {
        render(<ForecastChart data={mockData} loading={false} />);

        const chartElement = screen.getByTestId('composed-chart');
        const passedData = JSON.parse(chartElement.getAttribute('data-chart-data'));

        expect(passedData).toHaveLength(2);

        // Verify Date Formatting (slice(5) -> MM-DD)
        expect(passedData[0].displayDate).toBe('01-01');
        expect(passedData[1].displayDate).toBe('01-02');

        // Verify Confidence Band Calculation (upper - lower)
        expect(passedData[0].confidenceBand).toBe(20); // 110 - 90
        expect(passedData[1].confidenceBand).toBe(20); // 115 - 95

        // Verify original properties are preserved
        expect(passedData[0].value).toBe(100);
    });
});
