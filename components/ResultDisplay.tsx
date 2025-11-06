
import React, { useState, useCallback, useEffect } from 'react';
import { IconComponents } from './IconComponents';

interface ResultDisplayProps {
    completedHtml: string;
    isLoading: boolean;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ completedHtml, isLoading }) => {
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        if(completedHtml) {
            setCopyStatus('idle');
        }
    }, [completedHtml]);

    const handleCopy = useCallback(async () => {
        if (!completedHtml) return;

        try {
            const htmlBlob = new Blob([completedHtml], { type: 'text/html' });
            // Create a temporary element to get plain text representation
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = completedHtml;
            const textBlob = new Blob([tempDiv.innerText || ''], { type: 'text/plain' });

            const clipboardItem = new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob,
            });
            await navigator.clipboard.write([clipboardItem]);
            setCopyStatus('copied');
            setTimeout(() => setCopyStatus('idle'), 2000);
        } catch (err) {
            console.error('Failed to copy rich text:', err);
            // Fallback for older browsers
            try {
                const tempDiv = document.createElement('div');
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-9999px';
                tempDiv.innerHTML = completedHtml;
                document.body.appendChild(tempDiv);
                
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(tempDiv);
                selection?.removeAllRanges();
                selection?.addRange(range);
                
                document.execCommand('copy');
                selection?.removeAllRanges();
                document.body.removeChild(tempDiv);

                setCopyStatus('copied');
                setTimeout(() => setCopyStatus('idle'), 2000);

            } catch(fallbackError) {
                console.error('Fallback copy failed:', fallbackError);
                alert('Failed to copy content.');
            }
        }
    }, [completedHtml]);

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center h-full text-slate-500">
                    <p>Generating your completed assignment...</p>
                </div>
            );
        }

        if (completedHtml) {
            return (
                <div
                    className="prose max-w-none w-full p-4"
                    dangerouslySetInnerHTML={{ __html: completedHtml }}
                />
            );
        }

        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 p-4">
                <IconComponents.Magic className="w-16 h-16 mb-4 text-slate-300" />
                <p className="font-semibold">Your completed assignment will appear here.</p>
                <p className="text-sm">Just paste your work, add notes, and hit "Generate".</p>
            </div>
        );
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-slate-700 flex items-center">
                    <IconComponents.CheckCircle className="w-6 h-6 mr-2 text-indigo-500" />
                    3. Get Completed Assignment
                </h2>
                {completedHtml && (
                    <button
                        onClick={handleCopy}
                        className="bg-green-500 text-white font-semibold py-2 px-4 rounded-lg flex items-center gap-2 hover:bg-green-600 transition-colors disabled:bg-slate-400"
                        disabled={copyStatus === 'copied'}
                    >
                        {copyStatus === 'copied' ? (
                             <>
                                <IconComponents.Check className="w-5 h-5"/>
                                <span>Copied!</span>
                             </>
                        ) : (
                             <>
                                <IconComponents.Copy className="w-5 h-5" />
                                <span>Copy</span>
                             </>
                        )}
                    </button>
                )}
            </div>
            <div className="bg-slate-100 rounded-lg min-h-[300px] flex items-center justify-center">
                 <div className="bg-white rounded-md shadow-inner w-full min-h-[300px]">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
