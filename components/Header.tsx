
import React from 'react';
import { IconComponents } from './IconComponents';

export const Header: React.FC = () => {
    return (
        <header className="bg-white shadow-sm border-b border-slate-200">
            <div className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-600 p-2 rounded-lg text-white">
                        <IconComponents.Robot className="w-6 h-6" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        AI Assignment Finisher
                    </h1>
                </div>
                <p className="hidden md:block text-slate-500">Your intelligent partner for academic success.</p>
            </div>
        </header>
    );
};
