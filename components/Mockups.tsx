
import React, { useState, useCallback } from 'react';
import { WorkflowState, Job, AppView, MockupStyle, MockupData } from '../types.ts';
import { generateMockupImage, generateVideoMockup, generateInverseDesignVariant } from '../services/geminiService.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import VideoIcon from './icons/VideoIcon.tsx';
import XIcon from './icons/XIcon.tsx';
import RefreshIcon from './icons/RefreshIcon.tsx';


interface GenerateMockupsProps {
  workflowState: WorkflowState | null;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  setCurrentView: (view: AppView) => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
}

const StyleCheckbox: React.FC<{ label: string; isChecked: boolean; onChange: () => void; disabled?: boolean }> = ({ label, isChecked, onChange, disabled }) => (
    <label className={`flex items-center space-x-3 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
        <input type="checkbox" checked={isChecked} onChange={onChange} disabled={disabled} className="hidden" />
        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${isChecked ? 'bg-brand-primary border-brand-primary' : 'bg-slate-700 border-slate-600'} ${disabled ? 'opacity-50' : ''}`}>
            {isChecked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <span className={`${disabled ? 'text-slate-500' : 'text-slate-300'}`}>{label}</span>
    </label>
);

// Helper to determine if a color is dark
const isColorDark = (hexColor: string): boolean => {
    if (!hexColor) return false;
    const color = hexColor.startsWith('#') ? hexColor.substring(1, 7) : hexColor;
    if (color.length < 6) return false;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // Using the luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
};


const GenerateMockups: React.FC<GenerateMockupsProps> = ({ workflowState, updateWorkflow, setCurrentView, addJob, updateJobStatus }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedMockups, setGeneratedMockups] = useState<MockupData[]>(workflowState?.mockups || []);
    const [progressMessage, setProgressMessage] = useState('');
    const [selectedImageForModal, setSelectedImageForModal] = useState<string | null>(null);
    const [videoSelectionIndex, setVideoSelectionIndex] = useState<number | null>(null);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    
    const [styles, setStyles] = useState({
      flatLay: true,
      folded: true,
      hanging: true,
      man: true,
      woman: true,
      kid: false,
    });

    const [numToGenerate, setNumToGenerate] = useState(8);
    const [theme, setTheme] = useState('');

    const selectedAsset = workflowState?.asset;
    const selectedProduct = workflowState?.selectedProduct;
    const selectedColors = workflowState?.selectedColors || [];

    const handleStyleChange = (style: keyof typeof styles) => {
        setStyles(prev => ({ ...prev, [style]: !prev[style] }));
    };
    
    const getSceneForStyle = (style: MockupStyle, productType: string): string => {
        switch (style) {
            case 'flatLay': return `A ${productType} laid flat on a complementary, textured surface like rustic wood planks, a clean concrete floor, or alongside relevant props that match the theme.`;
            case 'folded': return `A neatly folded ${productType} on a visually interesting surface like a wooden bench, a stack of books, or a cozy blanket.`;
            case 'hanging': return `A ${productType} on a simple hanger against an interesting, slightly blurred background like an exposed brick wall, a closet with other clothes, or an outdoor market stall.`;
            case 'man': return `A man wearing the ${productType} in a casual, realistic outdoor setting like a city street, a park, or a coffee shop patio.`;
            case 'woman': return `A woman wearing the ${productType} in a stylish, natural setting like an urban street with interesting architecture, a vibrant cafe, or a scenic park.`;
            case 'kid': return `A child wearing the ${productType}, playing happily in a well-lit, safe outdoor environment like a backyard or a playground.`;
            default: return `A photorealistic mockup of a ${productType}`;
        }
    };

    const handleGenerateMockups = useCallback(async () => {
        if (!selectedAsset || !selectedProduct || selectedColors.length === 0 || numToGenerate <= 0) {
            setError('Please select colors, styles, and set a number of mockups to generate.');
            return;
        }
        
        setIsLoading(true);
        setError(null);
        setGeneratedMockups([]);
        setVideoSelectionIndex(null);
        setSelectedIndices(new Set());
        setProgressMessage('Preparing to generate...');
        
        const activeStyles = (Object.keys(styles) as MockupStyle[]).filter(key => styles[key]);
        if (activeStyles.length === 0) {
            setError('Please select at least one mockup style.');
            setIsLoading(false);
            return;
        }

        let variantUrl = workflowState?.designVariantUrl;
        const colorOptions = selectedProduct.variants.find(v => v.name === 'Color')?.options || [];
        const hasDarkColor = selectedColors.some(colorName => {
            const hex = colorOptions.find(opt => opt.value === colorName)?.hex;
            return hex ? isColorDark(hex) : false; // Assume non-hex colors are light
        });

        if (hasDarkColor && !variantUrl) {
            const variantJobId = Date.now();
            addJob({ id: variantJobId, name: 'Generating dark-mode design variant', status: 'processing', progress: 50 });
            try {
                setProgressMessage('Generating a design variant for dark products...');
                variantUrl = await generateInverseDesignVariant(selectedAsset.imageUrl);
                updateWorkflow({ designVariantUrl: variantUrl });
                updateJobStatus(variantJobId, 'completed');
            } catch (e) {
                console.error("Failed to generate design variant", e);
                updateJobStatus(variantJobId, 'failed', undefined, 'Could not create variant.');
                setError('Failed to create a design variant for dark shirts. Mockups may be incorrect.');
            }
        }

        // Intelligent Job Creation
        const jobsToRun: { color: string; style: MockupStyle }[] = [];
        const jobKeys = new Set<string>();

        // 1. Guarantee one of each selected style with varied colors
        let colorIndex = 0;
        for (const style of activeStyles) {
            const color = selectedColors[colorIndex % selectedColors.length];
            const jobKey = `${style}-${color}`;
            if (!jobKeys.has(jobKey)) {
                jobsToRun.push({ color, style });
                jobKeys.add(jobKey);
            }
            colorIndex++;
        }

        // 2. Fill remaining slots with unique combinations, if possible
        while (jobsToRun.length < numToGenerate) {
            const randomStyle = activeStyles[Math.floor(Math.random() * activeStyles.length)];
            const randomColor = selectedColors[Math.floor(Math.random() * selectedColors.length)];
            const jobKey = `${randomStyle}-${randomColor}`;

            if (!jobKeys.has(jobKey)) {
                jobsToRun.push({ color: randomColor, style: randomStyle });
                jobKeys.add(jobKey);
            }
            
            // Break if all possible combinations have been added
            if (jobKeys.size >= activeStyles.length * selectedColors.length) break;
        }

        const finalJobsToRun = jobsToRun.slice(0, numToGenerate);
        const allGeneratedData: MockupData[] = [];

        for (let i = 0; i < finalJobsToRun.length; i++) {
            const { color, style } = finalJobsToRun[i];
            const jobId = Date.now() + Math.random();
            const jobName = `Mockup: ${style} (${color})`;
            setProgressMessage(`Generating mockup ${i + 1} of ${finalJobsToRun.length}...`);
            addJob({ id: jobId, name: jobName, status: 'processing', progress: 10 });
            try {
                const hex = colorOptions.find(opt => opt.value === color)?.hex;
                const useVariant = hex && isColorDark(hex) && variantUrl;
                const designImageUrl = useVariant ? variantUrl : selectedAsset.imageUrl;

                const scene = getSceneForStyle(style, selectedProduct.name);
                const mockupUrl = await generateMockupImage(designImageUrl, scene, color, selectedProduct.name, theme);
                
                const newMockupData: MockupData = { url: mockupUrl, params: { color, style }};
                allGeneratedData.push(newMockupData);
                setGeneratedMockups(prev => [...prev, newMockupData]);

                updateJobStatus(jobId, 'completed');
            } catch (e) {
                console.error(`Failed to generate mockup for ${color} - ${style}`, e);
                updateJobStatus(jobId, 'failed', undefined, `Failed for ${color} - ${style}`);
                setError((prev) => prev ? prev : `Failed to generate one or more mockups. Please try again.`);
            }
        }
        updateWorkflow({ mockups: allGeneratedData, mockupGenerationConfig: { theme } });
        setIsLoading(false);
        setProgressMessage('');
    }, [selectedAsset, selectedProduct, selectedColors, styles, addJob, updateJobStatus, updateWorkflow, numToGenerate, theme, workflowState?.designVariantUrl]);

    const handleGenerateVideo = useCallback(async () => {
        if (!selectedAsset || videoSelectionIndex === null) return;

        const selectedMockup = generatedMockups[videoSelectionIndex];
        if (!selectedMockup) return;

        setIsGeneratingVideo(true);
        const jobId = Date.now();
        addJob({ id: jobId, name: `Generating video ad for ${selectedAsset.name}`, status: 'processing', details: 'Starting video generation...' });

        try {
            const videoUrl = await generateVideoMockup(selectedMockup.url, selectedMockup.params.style);
            updateWorkflow({ videoUrl });
            updateJobStatus(jobId, 'completed', 100, 'Video ready');
        } catch (e) {
            console.error('Failed to generate video', e);
            setError('Video generation failed. This feature is experimental. Please try again later.');
            updateJobStatus(jobId, 'failed', undefined, 'Video generation failed.');
        } finally {
            setIsGeneratingVideo(false);
        }
    }, [selectedAsset, videoSelectionIndex, generatedMockups, addJob, updateJobStatus, updateWorkflow]);
    
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
        if (selectedIndices.size === 0 || !selectedAsset || !selectedProduct) return;
        
        setIsLoading(true);
        setError(null);
        setProgressMessage(`Re-generating ${selectedIndices.size} mockup(s)...`);
        
        const colorOptions = selectedProduct.variants.find(v => v.name === 'Color')?.options || [];
        const variantUrl = workflowState?.designVariantUrl;
        const newMockups = [...generatedMockups];

        for (const index of selectedIndices) {
            const { params } = generatedMockups[index];
            const jobId = Date.now() + Math.random();
            const jobName = `Re-gen Mockup: ${params.style} (${params.color})`;
            addJob({ id: jobId, name: jobName, status: 'processing' });
            try {
                const hex = colorOptions.find(opt => opt.value === params.color)?.hex;
                const useVariant = hex && isColorDark(hex) && variantUrl;
                const designImageUrl = useVariant ? variantUrl : selectedAsset.imageUrl;

                const scene = getSceneForStyle(params.style, selectedProduct.name);
                const newUrl = await generateMockupImage(designImageUrl, scene, params.color, selectedProduct.name, theme);
                
                newMockups[index] = { ...newMockups[index], url: newUrl };
                updateJobStatus(jobId, 'completed');
            } catch (e) {
                console.error(`Failed to re-generate mockup for ${params.color} - ${params.style}`, e);
                updateJobStatus(jobId, 'failed');
            }
        }
        
        setGeneratedMockups(newMockups);
        updateWorkflow({ mockups: newMockups });
        setSelectedIndices(new Set());
        setIsLoading(false);
        setProgressMessage('');

    }, [selectedIndices, generatedMockups, selectedAsset, selectedProduct, theme, workflowState?.designVariantUrl, addJob, updateJobStatus, updateWorkflow]);


    if (!workflowState || !workflowState.asset || !workflowState.selectedProduct) {
        return (
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Generate Mockups</h1>
                <p className="text-slate-400 mt-2">Please complete the previous steps first.</p>
            </div>
        );
    }
    
    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {selectedImageForModal && (
                <div 
                    className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in-down"
                    onClick={() => setSelectedImageForModal(null)}
                >
                    <div className="relative p-4" onClick={(e) => e.stopPropagation()}>
                        <img src={selectedImageForModal} className="max-h-[90vh] max-w-[90vw] rounded-lg" alt="Enlarged mockup" />
                        <button 
                            onClick={() => setSelectedImageForModal(null)}
                            className="absolute -top-2 -right-2 bg-white rounded-full p-1 text-slate-800 hover:bg-slate-200"
                        >
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            )}
            <h1 className="text-3xl font-bold text-white text-center">3. Generate Mockups</h1>
            
            <div className="bg-slate-800 p-6 rounded-lg space-y-6">
                <h2 className="text-xl font-semibold">Mockup Configuration</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                        <label className="block text-lg font-medium text-slate-300 mb-2">1. Number of Mockups</label>
                        <input
                            type="number"
                            value={numToGenerate}
                            onChange={(e) => setNumToGenerate(parseInt(e.target.value, 10) || 0)}
                            min="1"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                            disabled={isLoading}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-lg font-medium text-slate-300 mb-2">2. Theme (Optional)</label>
                        <input
                            type="text"
                            value={theme}
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="e.g., Christmas, birthday party, rustic coffee shop"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                            disabled={isLoading}
                        />
                    </div>
                </div>

                <div>
                    <h3 className="text-lg font-medium text-slate-300 mb-3 pt-4 border-t border-slate-700">3. Mockup Styles</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                        <StyleCheckbox label="Flat Lay" isChecked={styles.flatLay} onChange={() => handleStyleChange('flatLay')} disabled={isLoading} />
                        <StyleCheckbox label="Folded" isChecked={styles.folded} onChange={() => handleStyleChange('folded')} disabled={isLoading} />
                        <StyleCheckbox label="Hanging" isChecked={styles.hanging} onChange={() => handleStyleChange('hanging')} disabled={isLoading} />
                        <StyleCheckbox label="Man" isChecked={styles.man} onChange={() => handleStyleChange('man')} disabled={isLoading} />
                        <StyleCheckbox label="Woman" isChecked={styles.woman} onChange={() => handleStyleChange('woman')} disabled={isLoading} />
                        <StyleCheckbox label="Kid" isChecked={styles.kid} onChange={() => handleStyleChange('kid')} disabled={isLoading} />
                    </div>
                </div>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <h2 className="text-xl font-semibold">Generated Mockups</h2>
                    <div className="flex gap-2">
                        {selectedIndices.size > 0 && (
                            <button onClick={handleRegenerateSelected} disabled={isLoading} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-700 disabled:cursor-not-allowed">
                                <RefreshIcon />
                                <span className="ml-2">Re-generate Selected ({selectedIndices.size})</span>
                            </button>
                        )}
                        <button onClick={handleGenerateMockups} disabled={isLoading || numToGenerate <= 0 || selectedColors.length === 0} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-md flex items-center disabled:bg-slate-600 disabled:cursor-not-allowed">
                            {isLoading && progressMessage.startsWith('Generating') ? <SpinnerIcon /> : 'Generate Mockups'}
                        </button>
                    </div>
                </div>
                {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                
                {isLoading && (
                    <div className="text-center py-12">
                        <SpinnerIcon className="mx-auto h-10 w-10" />
                        <p className="mt-4 text-slate-400">{progressMessage || 'Preparing to generate mockups...'}</p>
                    </div>
                )}

                {generatedMockups.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {generatedMockups.map((mockup, index) => (
                             <div key={index} className="relative group aspect-square">
                                <img 
                                    src={mockup.url} 
                                    alt={`Mockup ${index + 1}`} 
                                    className="rounded-md w-full h-full object-cover bg-slate-700"
                                />
                                <div 
                                    className={`absolute inset-0 rounded-md transition-all duration-200 ${selectedIndices.has(index) ? 'ring-4 ring-brand-primary bg-slate-900/50' : 'cursor-pointer group-hover:bg-slate-900/30'}`}
                                    onClick={() => handleToggleSelection(index)}
                                >
                                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors bg-slate-800/80 ${selectedIndices.has(index) ? 'bg-brand-primary border-brand-primary' : 'border-slate-400'}`}>
                                        {selectedIndices.has(index) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setSelectedImageForModal(mockup.url)}
                                    className="absolute top-2 right-2 p-1.5 bg-slate-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-slate-800/80 transition-opacity"
                                    title="Enlarge image"
                                >
                                    <svg xmlns="http://www.w.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" /></svg>
                                </button>
                                {videoSelectionIndex === index && <div className="absolute inset-0 rounded-md ring-4 ring-brand-primary pointer-events-none"></div>}
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <button 
                                        onClick={() => setVideoSelectionIndex(index)}
                                        className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transform transition-transform hover:scale-110"
                                        title="Select for video generation"
                                    >
                                        <VideoIcon />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-slate-800 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-semibold">Generate Video Ad (Optional)</h2>
                        <p className="text-slate-400 mt-1">Select a mockup from the grid above, then click 'Create Video'.</p>
                    </div>
                    <div className="flex items-center gap-4 justify-self-start md:justify-self-end">
                        {videoSelectionIndex !== null && <img src={generatedMockups[videoSelectionIndex]?.url} className="w-20 h-20 rounded-md object-cover ring-2 ring-brand-primary"/>}
                        <button onClick={handleGenerateVideo} disabled={isGeneratingVideo || videoSelectionIndex === null} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-700 disabled:cursor-not-allowed">
                            {isGeneratingVideo ? <SpinnerIcon /> : <VideoIcon />}
                            <span className="ml-2">{isGeneratingVideo ? 'Generating...' : 'Create Video'}</span>
                        </button>
                    </div>
                </div>
                 {workflowState.videoUrl && (
                    <div className="mt-6">
                        <video src={workflowState.videoUrl} controls className="w-full max-w-md mx-auto rounded-md" />
                    </div>
                )}
            </div>
            
            <div className="flex justify-between items-center mt-8">
                <button 
                    onClick={() => setCurrentView('productSelection')}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Back
                </button>
                <button 
                    onClick={() => setCurrentView('marketingCopy')}
                    disabled={generatedMockups.length === 0 || isLoading}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Continue to Marketing
                </button>
            </div>
        </div>
    );
};

export default GenerateMockups;