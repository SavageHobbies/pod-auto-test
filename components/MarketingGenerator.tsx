import React, { useState, useCallback, useEffect } from 'react';
import { WorkflowState, Job, AppView, MarketingCopy } from '../types.ts';
import { generateMarketingCopy } from '../services/geminiService.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SparklesIcon from './icons/SparklesIcon.tsx';

interface MarketingGeneratorProps {
  workflowState: WorkflowState | null;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  setCurrentView: (view: AppView) => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
}

const MarketingGenerator: React.FC<MarketingGeneratorProps> = ({ workflowState, updateWorkflow, setCurrentView, addJob, updateJobStatus }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copy, setCopy] = useState<MarketingCopy | null>(workflowState?.marketingCopy || null);

    const handleGenerate = useCallback(async () => {
        if (!workflowState?.asset) return;
        setIsLoading(true);
        setError(null);
        const jobId = Date.now();
        addJob({ id: jobId, name: `Generating marketing copy for ${workflowState.asset.name}`, status: 'processing' });

        try {
            const result = await generateMarketingCopy(workflowState.asset);
            setCopy(result);
            updateWorkflow({ marketingCopy: result });
            updateJobStatus(jobId, 'completed');
        } catch (e) {
            console.error(e);
            setError('Failed to generate marketing copy. Please try again.');
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsLoading(false);
        }
    }, [workflowState?.asset, addJob, updateJobStatus, updateWorkflow]);
    
    useEffect(() => {
        if (workflowState?.marketingCopy) {
            setCopy(workflowState.marketingCopy);
        } else if (!isLoading && !copy) {
            handleGenerate();
        }
    }, [workflowState, handleGenerate, isLoading, copy]);

    if (!workflowState || !workflowState.asset) {
        return (
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Marketing Copy Generator</h1>
                <p className="text-slate-400 mt-2">Please start a workflow by selecting a design first.</p>
            </div>
        );
    }
    
    const handleInputChange = (field: keyof MarketingCopy, value: string | string[]) => {
        if (!copy) return;
        const newCopy = { ...copy, [field]: value };
        setCopy(newCopy);
        updateWorkflow({ marketingCopy: newCopy });
    };

    // FIX: The mockups object contains 'light' and 'dark' arrays, so we need to access them correctly.
    const displayMockup = workflowState.mockups.light[0]?.url || workflowState.mockups.dark[0]?.url || workflowState.asset.imageUrl;

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white text-center">4. Generate Marketing Copy</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                    <h2 className="text-xl font-semibold">Your Product</h2>
                    <img src={displayMockup} alt="Product" className="w-full rounded-md" />
                    <p className="text-lg font-bold">{workflowState.asset.name}</p>
                    <p className="text-sm text-slate-400">On a {workflowState.selectedProduct?.name}</p>
                </div>

                <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold">AI-Generated Copy</h2>
                         <button onClick={handleGenerate} disabled={isLoading} className="bg-brand-primary text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-600">
                            {isLoading ? <SpinnerIcon /> : <SparklesIcon />}
                            <span className="ml-2">{isLoading ? 'Generating...' : 'Regenerate'}</span>
                        </button>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    
                    {!copy && isLoading ? (
                        <div className="text-center py-8"><SpinnerIcon className="mx-auto h-8 w-8" /></div>
                    ) : copy ? (
                        <div className="space-y-4">
                             <div>
                                <label htmlFor="title" className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                                <input id="title" type="text" value={copy.title} onChange={e => handleInputChange('title', e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" />
                            </div>
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea id="description" value={copy.description} onChange={e => handleInputChange('description', e.target.value)} rows={5} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" />
                            </div>
                            <div>
                                <label htmlFor="tags" className="block text-sm font-medium text-slate-300 mb-1">Tags / Keywords</label>
                                <input id="tags" type="text" value={copy.tags.join(', ')} onChange={e => handleInputChange('tags', e.target.value.split(',').map(t => t.trim()))} className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2" />
                            </div>
                        </div>
                    ) : null }
                </div>
            </div>
            <div className="flex justify-between items-center mt-8">
                <button 
                    onClick={() => setCurrentView('generateMockups')}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Back
                </button>
                <button 
                    onClick={() => setCurrentView('reviewAndPublish')}
                    disabled={!copy || isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Continue to Final Review
                </button>
            </div>
        </div>
    );
};

export default MarketingGenerator;