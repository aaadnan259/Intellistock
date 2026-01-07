import React from 'react';

const Dashboard = () => {
    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Total Products</h2>
                    <p className="text-4xl font-bold text-blue-600">120</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Low Stock Items</h2>
                    <p className="text-4xl font-bold text-red-600">5</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-2">Pending Orders</h2>
                    <p className="text-4xl font-bold text-yellow-600">12</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
