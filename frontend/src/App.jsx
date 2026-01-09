import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductTable from './components/ProductTable';
import ForecastingPage from './components/ForecastingPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { Toaster } from 'react-hot-toast';

function App() {
  const [currentRoute, setCurrentRoute] = useState('#dashboard');

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(window.location.hash || '#dashboard');
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
        return <ProductTable />;
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
      <Toaster position="top-right" />
      <Layout>
        {renderContent()}
      </Layout>
    </ErrorBoundary>
  );
}

export default App;
