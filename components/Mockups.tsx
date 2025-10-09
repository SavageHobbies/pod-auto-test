import React, { useState, useCallback } from 'react';
import { WorkflowState, Job, AppView } from '../types.ts';
import { generateInverseDesignVariant, generateMockupImage, generateVideoMockup } from '../services/geminiService.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SparklesIcon from './icons/SparklesIcon.tsx';
import VideoIcon from './icons/VideoIcon.tsx';
import DownloadIcon from './icons/DownloadIcon.tsx';
import UploadIcon from './icons/UploadIcon.tsx';

interface GenerateMockupsProps {
  workflowState: WorkflowState | null;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  setCurrentView: (view: AppView) => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
}

const GenerateMockups: React.FC<GenerateMockupsProps> = ({ workflowState, updateWorkflow, setCurrentView, addJob, updateJobStatus }) => {
    const [isGeneratingVariant, setIsGeneratingVariant] = useState(false);
    const [isGeneratingMockups, setIsGeneratingMockups] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [mockupQuantity, setMockupQuantity] = useState(8);
    const [scenes, setScenes] = useState<string[]>(['Man', 'Woman']);
    const [themes, setThemes] = useState<string[]>([]);
    const [useVariant, setUseVariant] = useState(true);
    const [selectedMockup, setSelectedMockup] = useState<string | null>(null);
    const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);

    const handleGenerateVariant = useCallback(async () => {
        if (!workflowState?.asset?.imageUrl) return;
        setIsGeneratingVariant(true);
        const jobId = Date.now();
        addJob({ id: jobId, name: 'Generating dark variant', status: 'processing' });
        try {
            const variantUrl = await generateInverseDesignVariant(workflowState.asset.imageUrl);
            updateWorkflow({ designVariantUrl: variantUrl });
            updateJobStatus(jobId, 'completed');
        } catch (e) {
            console.error(e);
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsGeneratingVariant(false);
        }
    }, [workflowState?.asset?.imageUrl, addJob, updateJobStatus, updateWorkflow]);

    const handleVariantUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                updateWorkflow({ designVariantUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerateMockups = useCallback(async () => {
        if (!workflowState || !workflowState.selectedProduct || workflowState.selectedColors.length === 0) return;

        const isDarkColor = (color: string) => ['black', 'navy', 'charcoal', 'maroon', 'forest green'].includes(color.toLowerCase());
        const darkColorsSelected = workflowState.selectedColors.some(isDarkColor);
        if (darkColorsSelected && useVariant && !workflowState.designVariantUrl) {
            alert("Please generate a design variant for the selected dark colors.");
            return;
        }
        
        setIsGeneratingMockups(true);
        setSelectedMockup(null);
        updateWorkflow({ mockups: [], videoUrl: null });
        const jobId = Date.now();
        addJob({ id: jobId, name: `Generating ${mockupQuantity} mockups`, status: 'processing' });

        const mockupsToGenerate = Array.from({ length: mockupQuantity }, (_, i) => {
            const color = workflowState.selectedColors[i % workflowState.selectedColors.length];
            const baseScenes = ["On a Hanger", "Folded Flat"];
            const lifestyleScenes = scenes.length > 0 ? scenes : ['Man', 'Woman']; // Default if none selected
            const scenePool = [...baseScenes, ...lifestyleScenes];
            const scene = scenePool[Math.floor(Math.random() * scenePool.length)];
            const designUrl = isDarkColor(color) && useVariant ? workflowState.designVariantUrl! : workflowState.asset.imageUrl;
            const theme = themes.length > 0 ? themes[Math.floor(Math.random() * themes.length)] : undefined;
            return { color, scene, designUrl, theme };
        });

        const generated: string[] = [];
        for (let i = 0; i < mockupsToGenerate.length; i++) {
            try {
                const { color, scene, designUrl, theme } = mockupsToGenerate[i];
                updateJobStatus(jobId, 'processing', (i / mockupsToGenerate.length) * 100, `Generating mockup ${i + 1}/${mockupQuantity}...`);
                const mockupUrl = await generateMockupImage(designUrl, scene, color, workflowState.selectedProduct.type, theme);
                generated.push(mockupUrl);
                updateWorkflow({ mockups: [...generated] });
            } catch (e) {
                console.error(`Failed to generate mockup ${i + 1}`, e);
            }
        }
        updateJobStatus(jobId, 'completed');
        setIsGeneratingMockups(false);
    }, [workflowState, mockupQuantity, scenes, themes, useVariant, addJob, updateJobStatus, updateWorkflow]);

    const handleGenerateVideo = useCallback(async () => {
        if (!selectedMockup) return;
        setIsGeneratingVideo(true);
        const jobId = Date.now();
        addJob({ id: jobId, name: 'Generating video ad', status: 'processing', details: 'This may take a few minutes...' });
        try {
            const videoUrl = await generateVideoMockup(selectedMockup);
            updateWorkflow({ videoUrl });
            updateJobStatus(jobId, 'completed');
        } catch (e) {
            console.error(e);
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsGeneratingVideo(false);
        }
    }, [selectedMockup, addJob, updateJobStatus, updateWorkflow]);

    if (!workflowState) return null;

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {previewModalImage && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center" onClick={() => setPreviewModalImage(null)}>
                    <img src={previewModalImage} className="max-w-[80vw] max-h-[80vh] rounded-lg" alt="Preview"/>
                </div>
            )}
            <h1 className="text-3xl font-bold text-white text-center">3. Generate Mockups</h1>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-3">1. Design Variants</h2>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <img src={workflowState.asset.imageUrl} className="w-full rounded-md cursor-pointer" onClick={() => setPreviewModalImage(workflowState.asset.imageUrl)} alt="For Light Products"/>
                                <p className="text-xs text-center mt-1">For Light Products</p>
                            </div>
                            <div className="relative">
                                {isGeneratingVariant ? <SpinnerIcon className="mx-auto mt-8"/> : (
                                    workflowState.designVariantUrl ?
                                    <img src={workflowState.designVariantUrl} className="w-full rounded-md cursor-pointer" onClick={() => setPreviewModalImage(workflowState.designVariantUrl)} alt="For Dark Products"/> :
                                    <button onClick={handleGenerateVariant} className="w-full aspect-square bg-slate-700 rounded-md flex flex-col items-center justify-center hover:bg-slate-600">
                                        <SparklesIcon/>
                                        <span className="text-xs mt-1">Generate</span>
                                    </button>
                                )}
                                <div className="absolute top-1 right-1 flex flex-col gap-1">
                                     {workflowState.designVariantUrl && (
                                        <a href={workflowState.designVariantUrl} download="variant.png" className="p-1 bg-slate-900/50 rounded-full hover:bg-slate-900/80"><DownloadIcon className="w-4 h-4"/></a>
                                    )}
                                    <label htmlFor="variant-upload" className="p-1 bg-slate-900/50 rounded-full hover:bg-slate-900/80 cursor-pointer"><UploadIcon className="w-4 h-4"/></label>
                                    <input type="file" id="variant-upload" className="hidden" onChange={handleVariantUpload} accept="image/png"/>
                                </div>
                                <p className="text-xs text-center mt-1">For Dark Products</p>
                            </div>
                        </div>
                        <div className="flex items-center mt-3">
                            <input id="use-variant" type="checkbox" checked={useVariant} onChange={(e) => setUseVariant(e.target.checked)} className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-brand-primary focus:ring-brand-primary"/>
                            <label htmlFor="use-variant" className="ml-2 text-sm">Use white variant on dark products</label>
                        </div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <label htmlFor="mockup-qty" className="text-lg font-semibold">2. Mockup Quantity: <span className="text-brand-primary font-bold">{mockupQuantity}</span></label>
                        <input id="mockup-qty" type="range" min="1" max="12" value={mockupQuantity} onChange={(e) => setMockupQuantity(parseInt(e.target.value))} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer mt-2"/>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold mb-2">3. Select Mockup Scenes</h2>
                        <p className="text-xs text-slate-400 mb-3">"On a Hanger" and "Folded Flat" are always included.</p>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                            {['Man', 'Woman', 'Kid'].map(s => (
                                <button key={s} onClick={() => setScenes(p => p.includes(s) ? p.filter(i => i !== s) : [...p, s])} className={`p-2 rounded-md ${scenes.includes(s) ? 'bg-brand-primary text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{s}</button>
                            ))}
                        </div>
                        <h3 className="text-md font-semibold mt-4 mb-2">Optional Themes</h3>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                             {['Christmas', 'Fall', 'Spring'].map(t => (
                                <button key={t} onClick={() => setThemes(p => p.includes(t) ? p.filter(i => i !== t) : [...p, t])} className={`p-2 rounded-md ${themes.includes(t) ? 'bg-brand-primary text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>{t}</button>
                            ))}
                        </div>
                    </div>
                    <button onClick={handleGenerateMockups} disabled={isGeneratingMockups} className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-md flex items-center justify-center text-lg disabled:bg-slate-600">
                        {isGeneratingMockups ? <SpinnerIcon/> : <SparklesIcon/>} <span className="ml-2">{isGeneratingMockups ? 'Generating...' : `Generate ${mockupQuantity} Mockup(s)`}</span>
                    </button>
                </div>
                <div className="lg:col-span-2 bg-slate-800 p-4 rounded-lg">
                    <h2 className="text-lg font-semibold mb-2">Your Mockups</h2>
                    <p className="text-xs text-slate-400 mb-4">💡 Tip: Click a mockup to generate a video ad!</p>
                    <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 min-h-[200px] ${isGeneratingMockups ? 'opacity-50' : ''}`}>
                        {workflowState.mockups.map((url, i) => (
                            <img key={i} src={url} onClick={() => setSelectedMockup(url)} className={`w-full rounded-md cursor-pointer aspect-square object-cover ${selectedMockup === url ? 'ring-4 ring-brand-primary' : ''}`} alt={`Mockup ${i+1}`}/>
                        ))}
                        {isGeneratingMockups && <SpinnerIcon className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10"/>}
                    </div>
                    {selectedMockup && (
                         <div className="mt-6">
                            <h2 className="text-lg font-semibold mb-2">Video Ad</h2>
                            {workflowState.videoUrl && !isGeneratingVideo ? (
                                <div>
                                    <video src={workflowState.videoUrl} controls className="w-full rounded-md"/>
                                    <a href={workflowState.videoUrl} download="video-ad.mp4" className="w-full mt-2 bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center">
                                        <DownloadIcon /> <span className="ml-2">Download Video</span>
                                    </a>
                                </div>
                            ) : (
                                <button onClick={handleGenerateVideo} disabled={isGeneratingVideo} className="w-full bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:bg-slate-700">
                                    {isGeneratingVideo ? <SpinnerIcon/> : <VideoIcon/>} <span className="ml-2">{isGeneratingVideo ? 'Generating Video...' : 'Generate Video Ad'}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
             <div className="flex justify-between items-center mt-8">
                <button 
                    onClick={() => setCurrentView('productSelection')}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Back
                </button>
                <button 
                    onClick={() => setCurrentView('marketingCopy')}
                    disabled={workflowState.mockups.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Continue to Marketing
                </button>
            </div>
        </div>
    );
};

export default GenerateMockups;