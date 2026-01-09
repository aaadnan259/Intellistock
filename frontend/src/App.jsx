import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ProductTable from './components/ProductTable';
import ForecastingPage from './components/ForecastingPage';
import AnalyticsDashboard from './components/AnalyticsDashboard';

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
    <Layout>
      {renderContent()}
    </Layout>
  );
}

export default App;
