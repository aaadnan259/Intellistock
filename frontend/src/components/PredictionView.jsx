import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const PredictionView = () => {
    const [selectedProduct, setSelectedProduct] = useState('1');

    // Mock prediction data
    const data = {
        labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
        datasets: [
            {
                label: 'Projected Sales',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Sales Forecast',
            },
        },
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Predictive Ordering</h1>
            <div className="bg-white p-6 rounded-lg shadow mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Product</label>
                <select
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                >
                    <option value="1">Laptop</option>
                    <option value="2">Mouse</option>
                    <option value="3">Keyboard</option>
                </select>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <Line options={options} data={data} />
                <div className="mt-4 p-4 bg-blue-50 rounded-md">
                    <p className="text-blue-700">
                        <strong>Recommendation:</strong> Based on the forecast, you should order <strong>15</strong> units of this product by next week.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default PredictionView;
