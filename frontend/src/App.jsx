import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ProductTable from './components/ProductTable';
import ForecastingPage from './components/ForecastingPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

function App() {
  const [currentRoute, setCurrentRoute] = useState('#dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash || '#dashboard';
      setCurrentRoute(hash);
    };

    window.addEventListener('hashchange', handleHashChange);
    // Set initial route
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const renderContent = () => {
    switch (currentRoute) {
      case '#dashboard':
        return <Dashboard />;
      case '#products':
        return (
          <div className="animate-fade-in">
            <h2 className="text-3xl font-bold text-white tracking-tight mb-6">Inventory Management</h2>
            <ProductTable limit={20} />
          </div>
        );
      case '#forecasting':
        return <ForecastingPage />;
      case '#analytics':
        return <AnalyticsDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <ErrorBoundary>
      <Toaster position="top-right" toastOptions={{
        style: {
          background: '#0F172A',
          color: '#fff',
          border: '1px solid #1E293B',
        },
      }} />
      <Layout>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
