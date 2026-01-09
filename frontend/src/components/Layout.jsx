import React, { useState } from 'react';
import { Home, Package, TrendingUp, BarChart2, Menu, X, User } from 'lucide-react';

const Layout = ({ children }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', icon: Home, href: '#dashboard' },
        { name: 'Products', icon: Package, href: '#products' },
        { name: 'Forecasting', icon: TrendingUp, href: '#forecasting' },
        { name: 'Analytics', icon: BarChart2, href: '#analytics' },
    ];

    const handleNavClick = (href) => {
        // Simple hash routing for this setup, or just state updates in parent
        window.location.hash = href;
        setIsSidebarOpen(false); // Close mobile sidebar on click
    };

    const currentPath = window.location.hash || '#dashboard';

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-16 items-center justify-center border-b border-slate-800">
                    <h1 className="text-xl font-bold tracking-wider text-indigo-400">INTELLISTOCK</h1>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    {navigation.map((item) => {
                        const isActive = currentPath === item.href;
                        return (
                            <a
                                key={item.name}
                                href={item.href}
                                onClick={() => handleNavClick(item.href)}
                                className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                    }`}
                            >
                                <item.icon className="h-5 w-5" />
                                {item.name}
                            </a>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                    >
                        <Menu className="h-6 w-6" />
                    </button>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="hidden text-right sm:block">
                            <p className="text-sm font-medium text-slate-700">Admin User</p>
                            <p className="text-xs text-slate-500">admin@intellistock.com</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                            <User className="h-6 w-6" />
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    <div className="mx-auto max-w-7xl animate-fade-in">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;
