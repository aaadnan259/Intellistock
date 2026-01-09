import React from 'react';

const EmptyState = ({ icon: Icon, title, description, action }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="bg-slate-100 p-4 rounded-full mb-4">
                <Icon className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
            <p className="text-sm text-slate-500 max-w-sm mb-6">{description}</p>
            {action && (
                <div>{action}</div>
            )}
        </div>
    );
};

export default EmptyState;
