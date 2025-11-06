
import React, { useCallback } from 'react';
import { IconComponents } from './IconComponents';

interface PasteInputProps {
    onHtmlChange: (html: string) => void;
}

export const PasteInput = React.forwardRef<HTMLDivElement, PasteInputProps>(({ onHtmlChange }, ref) => {
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const clipboardData = e.clipboardData;
        let html = clipboardData.getData('text/html');

        if (html) {
            const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/);
            if (match && match[1]) {
                html = match[1];
            }
        } else {
            const text = clipboardData.getData('text/plain');
            html = text.split(/\r?\n/).map(p => `<p>${p || '&nbsp;'}</p>`).join('');
        }
        
        const target = e.currentTarget;
        if (target) {
            // Clear placeholder before pasting
            if (target.innerHTML.includes('Click here and paste')) {
                target.innerHTML = '';
            }
            // A more robust way to insert pasted content
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                range.deleteContents();
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                const fragment = document.createDocumentFragment();
                let lastNode;
                while ((lastNode = tempDiv.firstChild)) {
                    fragment.appendChild(lastNode);
                }
                range.insertNode(fragment);

                 // Move cursor to the end of the inserted content
                if (lastNode) {
                    range.setStartAfter(lastNode);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } else {
                 target.innerHTML = html;
            }
        }
        onHtmlChange(target.innerHTML);
    }, [onHtmlChange]);

    const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
        onHtmlChange(e.currentTarget.innerHTML);
    }, [onHtmlChange]);

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center">
                <IconComponents.Document className="w-6 h-6 mr-2 text-indigo-500" />
                1. Paste Your Assignment
            </h2>
            <div className="bg-slate-100 rounded-lg p-2">
                <div
                    ref={ref}
                    contentEditable={true}
                    onPaste={handlePaste}
                    onInput={handleInput}
                    className="prose max-w-none w-full min-h-[250px] p-4 bg-white rounded-md shadow-inner focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    <p className="text-slate-400">Click here and paste your assignment from Google Docs, Word, etc.</p>
                </div>
            </div>
        </div>
    );
});
