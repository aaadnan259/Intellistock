import React from 'react';

const LoadingSkeleton = ({ type = 'text', count = 1, className = '' }) => {
    const renderSkeleton = (key) => {
        let baseClasses = "animate-pulse bg-slate-200 rounded";

        if (type === 'text') baseClasses += " h-4 w-3/4 mb-2";
        if (type === 'rect') baseClasses += " h-32 w-full mb-4";
        if (type === 'chart') baseClasses += " h-64 w-full rounded-xl";
        if (type === 'table-row') baseClasses += " h-12 w-full mb-2";
        if (type === 'card') baseClasses += " h-24 w-full rounded-xl mb-4";

        return (
            <div key={key} className={`${baseClasses} ${className}`}></div>
        );
    };

    return (
        <>
            {Array.from({ length: count }).map((_, i) => renderSkeleton(i))}
        </>
    );
};

export default LoadingSkeleton;
