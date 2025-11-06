import React, { useCallback } from 'react';
import { IconComponents } from './IconComponents';

interface ContextInputProps {
    context: string;
    onContextChange: (text: string) => void;
}

export const ContextInput: React.FC<ContextInputProps> = ({ context, onContextChange }) => {
    
    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                onContextChange(text);
            };
            reader.readAsText(file);
        }
    }, [onContextChange]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center">
                <IconComponents.Note className="w-6 h-6 mr-2 text-indigo-500" />
                2. Add Notes (Optional)
            </h2>
            <p className="text-slate-500 mb-4">
                Provide any notes, guides, or materials the AI should use. You can paste text or upload a file.
            </p>
            <div className="flex justify-end mb-4">
                <label className="cursor-pointer bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg transition-colors text-sm inline-flex items-center gap-2">
                    <IconComponents.Upload className="w-4 h-4"/>
                    Upload File
                    <input type="file" className="hidden" accept=".txt,.md,.html" onChange={handleFileChange} />
                </label>
            </div>
            <div className="bg-slate-100 rounded-lg p-2">
                <textarea
                    value={context}
                    onChange={(e) => onContextChange(e.target.value)}
                    placeholder="Paste your notes or context here..."
                    className="w-full min-h-[200px] p-4 bg-white text-slate-800 rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
            </div>
        </div>
    );
};