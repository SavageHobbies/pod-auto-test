
import React, { useState } from 'react';
import JSZip from 'jszip';
import { WorkflowState, AppView, Job } from '../types.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import DownloadIcon from './icons/DownloadIcon.tsx';

interface ReviewAndPublishProps {
  workflowState: WorkflowState | null;
  onPublish: () => void;
  setCurrentView: (view: AppView) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
  // FIX: Added addJob and updateJobStatus to props to fix type error and allow job tracking.
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
}

const ReviewAndPublish: React.FC<ReviewAndPublishProps> = ({ workflowState, onPublish, setCurrentView, showNotification, addJob, updateJobStatus }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);

    const handlePublish = () => {
        setIsPublishing(true);
        const jobId = Date.now();
        addJob({ id: jobId, name: `Publishing ${workflowState!.asset.name}`, status: 'processing' });
        setTimeout(() => {
            showNotification('Product published successfully! (Mock)', 'success');
            setIsPublishing(false);
            updateJobStatus(jobId, 'completed');
            onPublish();
        }, 2000);
    };

    const handleDownloadAll = async () => {
        if (!workflowState) return;
        setIsZipping(true);
        const jobId = Date.now();
        addJob({ id: jobId, name: `Zipping assets for ${workflowState.asset.name}`, status: 'processing' });
        try {
            const zip = new JSZip();
            const fetchAndAdd = async (url: string, name: string) => {
                const response = await fetch(url);
                const blob = await response.blob();
                zip.file(name, blob);
            };

            await fetchAndAdd(workflowState.asset.imageUrl, 'design_original.png');
            if (workflowState.designVariantUrl) {
                await fetchAndAdd(workflowState.designVariantUrl, 'design_variant_dark.png');
            }
            if (workflowState.videoUrl) {
                 await fetchAndAdd(workflowState.videoUrl, 'video_ad.mp4');
            }
            for (let i = 0; i < workflowState.mockups.length; i++) {
                await fetchAndAdd(workflowState.mockups[i], `mockup_${i + 1}.png`);
            }
            
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${workflowState.asset.name}_assets.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            showNotification('Assets zipped and downloaded!', 'success');
            updateJobStatus(jobId, 'completed');
        } catch (error) {
            console.error("Error zipping files:", error);
            showNotification('Failed to download assets.', 'error');
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsZipping(false);
        }
    };

    if (!workflowState || !workflowState.marketingCopy) {
        return (
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Review & Publish</h1>
                <p className="text-slate-400 mt-2">Complete the previous workflow steps to review your product here.</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white text-center">5. Review & Publish</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Final Marketing Details</h2>
                        <h3 className="text-2xl font-bold text-white">{workflowState.marketingCopy.title}</h3>
                        <p className="text-slate-400 mt-2">{workflowState.marketingCopy.description}</p>
                        <div className="flex flex-wrap gap-2 mt-4">
                            {workflowState.marketingCopy.tags.map(tag => (
                                <span key={tag} className="text-xs bg-slate-700 text-slate-300 font-medium px-2 py-1 rounded">{tag}</span>
                            ))}
                        </div>
                    </div>
                     <div className="bg-slate-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Generated Mockups ({workflowState.mockups.length})</h2>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {workflowState.mockups.map((url, i) => <img key={i} src={url} alt={`Mockup ${i+1}`} className="rounded-md aspect-square object-cover" />)}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                     <div className="bg-slate-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-2">Final Product Info</h2>
                        <div className="space-y-1 text-sm">
                            <p><span className="font-semibold text-slate-400">Design:</span> {workflowState.asset.name}</p>
                            <p><span className="font-semibold text-slate-400">Product:</span> {workflowState.selectedProduct?.name}</p>
                            <p><span className="font-semibold text-slate-400">Provider:</span> {workflowState.selectedProvider?.name}</p>
                            <p><span className="font-semibold text-slate-400">Colors:</span> {workflowState.selectedColors.join(', ')}</p>
                            <p><span className="font-semibold text-slate-400">Base Price:</span> ${workflowState.selectedProvider?.price.toFixed(2)}</p>
                        </div>
                    </div>
                     {workflowState.videoUrl && (
                        <div className="bg-slate-800 p-6 rounded-lg">
                            <h2 className="text-xl font-semibold mb-4">Video Ad</h2>
                            <video src={workflowState.videoUrl} controls className="w-full rounded-md" />
                        </div>
                     )}
                     <div className="bg-slate-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">All Assets</h2>
                        <button onClick={handleDownloadAll} disabled={isZipping} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:bg-slate-700">
                             {isZipping ? <SpinnerIcon/> : <DownloadIcon/>} <span className="ml-2">{isZipping ? 'Zipping...' : 'Download All Assets (.zip)'}</span>
                        </button>
                     </div>
                </div>
            </div>
            
             <div className="flex justify-between items-center mt-8">
                 <button 
                    onClick={() => setCurrentView('marketingCopy')}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Back
                </button>
                <button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-4 px-10 rounded-lg text-xl disabled:bg-slate-600 disabled:cursor-not-allowed">
                    {isPublishing ? <SpinnerIcon /> : 'Publish to Store'}
                </button>
            </div>
        </div>
    );
};

export default ReviewAndPublish;
