import React, { useState } from 'react';
import {
    LayoutDashboard,
    Package,
    TrendingUp,
    BarChart2,
    ChevronLeft,
    ChevronRight,
    Settings,
    LogOut
} from 'lucide-react';

const Sidebar = ({ currentRoute }) => {
    const [collapsed, setCollapsed] = useState(false);

    const navItems = [
        { id: '#dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: '#products', label: 'Inventory', icon: Package },
        { id: '#forecasting', label: 'Forecasting', icon: TrendingUp },
        { id: '#analytics', label: 'Analytics', icon: BarChart2 },
    ];

    return (
        <aside
            className={`relative h-screen bg-slate-950 border-r border-slate-800 transition-all duration-300 ease-in-out ${collapsed ? 'w-20' : 'w-64'
                }`}
        >
            <div className="flex items-center justify-between p-6">
                {!collapsed && (
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-400 truncate">
                        Intellistock
                    </h1>
                )}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors absolute -right-3 top-7 z-10"
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            <nav className="px-3 space-y-2 mt-4">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentRoute === item.id;

                    return (
                        <a
                            key={item.id}
                            href={item.id}
                            className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group ${isActive
                                    ? 'bg-primary/10 text-primary border border-primary/20'
                                    : 'text-slate-400 hover:bg-slate-900 hover:text-white hover:border hover:border-slate-800 border border-transparent'
                                }`}
                        >
                            <Icon size={22} className={isActive ? 'text-primary' : 'group-hover:text-white'} />
                            {!collapsed && (
                                <span className="font-medium whitespace-nowrap overflow-hidden">
                                    {item.label}
                                </span>
                            )}

                            {isActive && !collapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-glow-primary" />
                            )}
                        </a>
                    );
                })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-slate-950">
                <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                        AA
                    </div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Adnan Ashraf</p>
                            <p className="text-xs text-slate-500 truncate">Admin</p>
                        </div>
                    )}
                    {!collapsed && (
                        <button className="text-slate-400 hover:text-white transition-colors">
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
