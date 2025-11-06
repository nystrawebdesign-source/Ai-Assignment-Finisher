
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Header } from './components/Header';
import { PasteInput } from './components/PasteInput';
import { ContextInput } from './components/ContextInput';
import { ResultDisplay } from './components/ResultDisplay';
import { IconComponents } from './components/IconComponents';
import { initialContext } from './constants';

const App: React.FC = () => {
    const [assignmentHtml, setAssignmentHtml] = useState<string>('');
    const [contextText, setContextText] = useState<string>(initialContext);
    const [completedAssignmentHtml, setCompletedAssignmentHtml] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    
    // State for the new dynamic progress bar
    const [progress, setProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Generating...');
    
    const assignmentRef = useRef<HTMLDivElement>(null);

    const handleGenerate = useCallback(async () => {
        if (!assignmentHtml || !assignmentRef.current) {
            setError('Please paste your assignment into the document editor first.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setCompletedAssignmentHtml('');
        setProgress(0);
        setLoadingMessage('Initializing...');

        // Progress callback for the service to update the UI
        const onProgressUpdate = (message: string, currentProgress: number) => {
            setLoadingMessage(message);
            setProgress(currentProgress);
        };

        try {
            // Dynamically import services and libraries only when needed
            const geminiService = await import('./services/geminiService');
            const htmlToImage = await import('html-to-image');

            onProgressUpdate('Analyzing assignment...', 5);
            const requiresImages = await geminiService.analyzeTask(assignmentHtml);
            
            onProgressUpdate('Capturing document context...', 10);
            const imageBase64 = await htmlToImage.toPng(assignmentRef.current, {
                quality: 0.95,
                backgroundColor: '#ffffff'
            });
            const cleanImageBase64 = imageBase64.split(',')[1];
            
            let result;
            if (requiresImages) {
                // Route to the advanced workflow with image generation
                result = await geminiService.completeAssignmentWithImages(
                    assignmentHtml, 
                    contextText, 
                    cleanImageBase64,
                    onProgressUpdate
                );
            } else {
                // Route to the standard workflow
                onProgressUpdate('Completing assignment...', 30);
                result = await geminiService.completeAssignment(
                    assignmentHtml, 
                    contextText, 
                    cleanImageBase64
                );
                onProgressUpdate('Finalizing...', 95);
            }
            
            setCompletedAssignmentHtml(result);

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'An unknown error occurred.');
        } finally {
            setProgress(100);
            setLoadingMessage('Complete!');
            setIsLoading(false);
        }
    }, [assignmentHtml, contextText]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    <div className="space-y-8">
                        <PasteInput ref={assignmentRef} onHtmlChange={setAssignmentHtml} />
                        <ContextInput context={contextText} onContextChange={setContextText} />
                    </div>
                    <div className="space-y-8 lg:sticky lg:top-8">
                        <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-200">
                            <h2 className="text-xl font-bold text-slate-700 mb-4 flex items-center">
                                <IconComponents.Sparkles className="w-6 h-6 mr-2 text-indigo-500" />
                                Generate Completion
                            </h2>
                            <p className="text-slate-500 mb-6">
                                Once your assignment and notes are ready, click the button below to let the AI work its magic.
                            </p>
                            <button
                                onClick={handleGenerate}
                                disabled={isLoading || !assignmentHtml}
                                className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-indigo-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105"
                            >
                                {isLoading ? (
                                    <div className="w-full">
                                        <div className="flex justify-between items-center mb-1 text-sm font-medium">
                                            <span>{loadingMessage}</span>
                                        </div>
                                        <div className="w-full bg-indigo-400 rounded-full h-2.5">
                                            <div className="bg-white h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <IconComponents.Wand className="w-5 h-5" />
                                        <span>Complete Assignment</span>
                                    </>
                                )}
                            </button>
                            {error && (
                                <div className="mt-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded-lg text-sm">
                                    <strong>Error:</strong> {error}
                                </div>
                            )}
                        </div>
                        
                        <ResultDisplay completedHtml={completedAssignmentHtml} isLoading={isLoading} />
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;
