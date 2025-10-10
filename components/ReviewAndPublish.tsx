import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { WorkflowState, AppView, Job, MockupStyle } from '../types.ts';
import { generateMockupImage } from '../services/geminiService.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import DownloadIcon from './icons/DownloadIcon.tsx';
import PencilIcon from './icons/PencilIcon.tsx';
import EditDesignModal from './EditDesignModal.tsx';
import RefreshIcon from './icons/RefreshIcon.tsx';

interface ReviewAndPublishProps {
  workflowState: WorkflowState | null;
  onPublish: () => void;
  setCurrentView: (view: AppView) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
}

// Helper functions copied from Mockups.tsx to support re-generation
const isColorDark = (hexColor: string): boolean => {
    if (!hexColor) return false;
    const color = hexColor.startsWith('#') ? hexColor.substring(1, 7) : hexColor;
    if (color.length < 6) return false;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
};

const getSceneForStyle = (style: MockupStyle, productType: string): string => {
    switch (style) {
        case 'flatLay': return `A ${productType} laid flat on a clean, complementary surface`;
        case 'folded': return `A neatly folded ${productType} on a clean, complementary surface`;
        case 'hanging': return `A ${productType} on a simple wooden hanger against a clean, neutral wall`;
        case 'man': return `A ${productType} worn by a male model in a bright, modern studio setting`;
        case 'woman': return `A ${productType} worn by a female model in a bright, modern studio setting`;
        case 'kid': return `A ${productType} worn by a child model in a playful, well-lit setting`;
        default: return `A photorealistic mockup of a ${productType}`;
    }
};


const ReviewAndPublish: React.FC<ReviewAndPublishProps> = ({ workflowState, onPublish, setCurrentView, showNotification, addJob, updateJobStatus, updateWorkflow }) => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<{url: string; type: 'original' | 'variant'} | null>(null);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [isRegenerating, setIsRegenerating] = useState(false);

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

    const handleEditClick = (url: string, type: 'original' | 'variant') => {
        setImageToEdit({ url, type });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (newUrl: string) => {
        if (!imageToEdit || !workflowState) return;

        if (imageToEdit.type === 'original') {
            const updatedAsset = { ...workflowState.asset, imageUrl: newUrl };
            updateWorkflow({ asset: updatedAsset });
        } else {
            updateWorkflow({ designVariantUrl: newUrl });
        }
        
        setIsEditModalOpen(false);
        setImageToEdit(null);
        showNotification('Design updated successfully.', 'success');
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
                await fetchAndAdd(workflowState.designVariantUrl, 'design_variant_light.png');
            }
            if (workflowState.videoUrl) {
                 await fetchAndAdd(workflowState.videoUrl, 'video_ad.mp4');
            }
            for (let i = 0; i < workflowState.mockups.length; i++) {
                await fetchAndAdd(workflowState.mockups[i].url, `mockup_${i + 1}.png`);
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
    
    const handleToggleSelection = (index: number) => {
        const newSelection = new Set(selectedIndices);
        if (newSelection.has(index)) {
            newSelection.delete(index);
        } else {
            newSelection.add(index);
        }
        setSelectedIndices(newSelection);
    };

    const handleRegenerateSelected = useCallback(async () => {
        if (selectedIndices.size === 0 || !workflowState || !workflowState.selectedProduct) return;
        
        setIsRegenerating(true);
        const { asset, designVariantUrl, selectedProduct, mockupGenerationConfig, mockups } = workflowState;
        
        const colorOptions = selectedProduct.variants.find(v => v.name === 'Color')?.options || [];
        const newMockups = [...mockups];

        for (const index of selectedIndices) {
            const { params } = mockups[index];
            const jobId = Date.now() + Math.random();
            const jobName = `Re-gen Mockup: ${params.style} (${params.color})`;
            addJob({ id: jobId, name: jobName, status: 'processing' });
            try {
                const hex = colorOptions.find(opt => opt.value === params.color)?.hex;
                const useVariant = hex && isColorDark(hex) && designVariantUrl;
                const designImageUrl = useVariant ? designVariantUrl : asset.imageUrl;

                const scene = getSceneForStyle(params.style, selectedProduct.name);
                const newUrl = await generateMockupImage(designImageUrl, scene, params.color, selectedProduct.name, mockupGenerationConfig?.theme);
                
                newMockups[index] = { ...newMockups[index], url: newUrl };
                updateJobStatus(jobId, 'completed');
            } catch (e) {
                console.error(`Failed to re-generate mockup for ${params.color} - ${params.style}`, e);
                updateJobStatus(jobId, 'failed');
            }
        }
        
        updateWorkflow({ mockups: newMockups });
        setSelectedIndices(new Set());
        setIsRegenerating(false);

    }, [selectedIndices, workflowState, addJob, updateJobStatus, updateWorkflow]);

    if (!workflowState || !workflowState.marketingCopy) {
        return (
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Review & Publish</h1>
                <p className="text-slate-400 mt-2">Complete the previous workflow steps to review your product here.</p>
            </div>
        );
    }
    
    return (
        <>
        {isEditModalOpen && imageToEdit && (
            <EditDesignModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                imageUrl={imageToEdit.url}
                onSave={handleSaveEdit}
                addJob={addJob}
                updateJobStatus={updateJobStatus}
            />
        )}
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white text-center">5. Review & Publish</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-slate-800 p-6 rounded-lg">
                        <h2 className="text-xl font-semibold mb-4">Core Designs</h2>
                        <div className="flex flex-wrap gap-4">
                            {/* Original Design */}
                            <div className="flex-1 min-w-[200px]">
                                <h3 className="font-semibold text-slate-300 mb-2">Original Design</h3>
                                <div className="checkerboard-bg p-2 rounded-md aspect-square flex items-center justify-center relative group">
                                    <img src={workflowState.asset.imageUrl} alt="Original Design" className="max-w-full max-h-full"/>
                                    <button onClick={() => handleEditClick(workflowState.asset.imageUrl, 'original')} className="absolute top-2 right-2 bg-slate-800/80 hover:bg-brand-primary p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        <PencilIcon />
                                    </button>
                                </div>
                            </div>
                            {/* Light Variant */}
                            {workflowState.designVariantUrl && (
                               <div className="flex-1 min-w-[200px]">
                                    <h3 className="font-semibold text-slate-300 mb-2">Light Variant (for Dark Products)</h3>
                                    <div className="checkerboard-bg p-2 rounded-md aspect-square flex items-center justify-center relative group">
                                        <img src={workflowState.designVariantUrl} alt="Light Design Variant" className="max-w-full max-h-full"/>
                                        <button onClick={() => handleEditClick(workflowState.designVariantUrl, 'variant')} className="absolute top-2 right-2 bg-slate-800/80 hover:bg-brand-primary p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                            <PencilIcon />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

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
                        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                            <h2 className="text-xl font-semibold">Generated Mockups ({workflowState.mockups.length})</h2>
                             {selectedIndices.size > 0 && (
                                <button onClick={handleRegenerateSelected} disabled={isRegenerating} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-700 disabled:cursor-not-allowed">
                                    {isRegenerating ? <SpinnerIcon /> : <RefreshIcon />}
                                    <span className="ml-2">Re-generate Selected ({selectedIndices.size})</span>
                                </button>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mb-4 -mt-3">Note: Mockups do not update automatically when you edit a core design.</p>
                        <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {workflowState.mockups.map((mockup, i) => (
                                <div key={i} className="relative group aspect-square">
                                    <img src={mockup.url} alt={`Mockup ${i+1}`} className="rounded-md w-full h-full object-cover" />
                                     <div 
                                        className={`absolute inset-0 rounded-md transition-all duration-200 ${selectedIndices.has(i) ? 'ring-4 ring-brand-primary bg-slate-900/50' : 'cursor-pointer group-hover:bg-slate-900/30'}`}
                                        onClick={() => handleToggleSelection(i)}
                                    >
                                        <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors bg-slate-800/80 ${selectedIndices.has(i) ? 'bg-brand-primary border-brand-primary' : 'border-slate-400'}`}>
                                            {selectedIndices.has(i) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                    </div>
                                </div>
                            ))}
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
        </>
    );
};

export default ReviewAndPublish;