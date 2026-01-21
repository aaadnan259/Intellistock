import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children }) => {
    const currentRoute = window.location.hash || '#dashboard';

    return (
        <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 selection:text-white">
            <Sidebar currentRoute={currentRoute} />

            <main className="flex-1 overflow-y-auto no-scrollbar relative">
                {/* Header Gradient Overlay */}
                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />

                <div className="max-w-7xl mx-auto p-8 relative z-0">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
