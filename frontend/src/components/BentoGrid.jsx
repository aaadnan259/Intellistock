import React from 'react';
import { cn } from '../utils/cn'; // Assuming we create a utility or use inline clsx

const BentoGrid = ({ className, children }) => {
    return (
        <div
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl mx-auto ${className}`}
        >
            {children}
        </div>
    );
};

const BentoItem = ({
    className,
    title,
    description,
    header,
    icon,
    colSpan = 1,
    rowSpan = 1,
    children
}) => {
    // col-span-X and row-span-X mappings for safe usage
    const colSpanClasses = {
        1: 'lg:col-span-1',
        2: 'lg:col-span-2',
        3: 'lg:col-span-3',
        4: 'lg:col-span-4',
    };

    const rowSpanClasses = {
        1: 'lg:row-span-1',
        2: 'lg:row-span-2',
    };

    return (
        <div
            className={`
                group/bento row-span-1 rounded-3xl p-6 justify-between flex flex-col space-y-4
                glass-card shadow-lg hover:shadow-xl
                ${colSpanClasses[colSpan] || 'lg:col-span-1'} 
                ${rowSpanClasses[rowSpan] || 'lg:row-span-1'}
                ${className}
            `}
        >
            {(title || icon) && (
                <div className="group-hover/bento:translate-x-1 transition duration-200">
                    <div className="flex items-center gap-2 mb-2">
                        {icon && <div className="text-blue-400">{icon}</div>}
                        {title && <h3 className="font-bold text-slate-100 text-lg tracking-tight">{title}</h3>}
                    </div>
                    {description && (
                        <p className="font-sans font-normal text-slate-400 text-sm">
                            {description}
                        </p>
                    )}
                </div>
            )}

            <div className={`flex-1 min-h-0 ${!children && !header ? 'hidden' : ''}`}>
                {header}
                {children}
            </div>
        </div>
    );
};

export { BentoGrid, BentoItem };
