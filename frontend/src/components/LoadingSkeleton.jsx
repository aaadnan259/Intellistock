import React from 'react';
import { cn } from '../utils/cn';

const LoadingSkeleton = ({ count = 3, className, variant = 'list' }) => {

    if (variant === 'card') {
        return (
            <div className={cn("space-y-3 animate-pulse", className)}>
                <div className="h-32 bg-slate-800/50 rounded-xl w-full"></div>
                <div className="h-4 bg-slate-800/50 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800/50 rounded w-1/2"></div>
            </div>
        );
    }

    if (variant === 'chart') {
        return (
            <div className={cn("animate-pulse w-full h-full flex items-end space-x-2 p-4 bg-slate-900/50 rounded-xl", className)}>
                <div className="w-1/6 h-[30%] bg-slate-800/50 rounded-t"></div>
                <div className="w-1/6 h-[50%] bg-slate-800/50 rounded-t"></div>
                <div className="w-1/6 h-[70%] bg-slate-800/50 rounded-t"></div>
                <div className="w-1/6 h-[40%] bg-slate-800/50 rounded-t"></div>
                <div className="w-1/6 h-[60%] bg-slate-800/50 rounded-t"></div>
                <div className="w-1/6 h-[80%] bg-slate-800/50 rounded-t"></div>
            </div>
        );
    }

    // Default list variant
    return (
        <div className={cn("space-y-4 animate-pulse w-full", className)}>
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex space-x-4">
                    <div className="h-12 w-12 bg-slate-800/50 rounded-full"></div>
                    <div className="flex-1 space-y-2 py-1">
                        <div className="h-4 bg-slate-800/50 rounded w-3/4"></div>
                        <div className="space-y-2">
                            <div className="h-4 bg-slate-800/50 rounded"></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LoadingSkeleton;
