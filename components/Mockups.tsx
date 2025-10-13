
// components/Mockups.tsx

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

const MockupGrid: React.FC<{
    mockups: MockupData[];
    onToggleSelection: (index: number) => void;
    onEnlarge: (url: string) => void;
    onSelectForVideo: (index: number) => void;
    selectedIndices: Set<number>;
    videoSelectionIndex: number | null;
}> = ({ mockups, onToggleSelection, onEnlarge, onSelectForVideo, selectedIndices, videoSelectionIndex }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mockups.map((mockup, index) => (
             <div key={index} className="relative group aspect-square">
                <img src={mockup.url} alt={`Mockup ${index + 1}`} className="rounded-md w-full h-full object-cover bg-slate-700"/>
                <div className={`absolute inset-0 rounded-md transition-all duration-200 ${selectedIndices.has(index) ? 'ring-4 ring-brand-primary bg-slate-900/50' : 'cursor-pointer group-hover:bg-slate-900/30'}`} onClick={() => onToggleSelection(index)}>
                    <div className={`absolute top-2 left-2 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors bg-slate-800/80 ${selectedIndices.has(index) ? 'bg-brand-primary border-brand-primary' : 'border-slate-400'}`}>
                        {selectedIndices.has(index) && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                </div>
                <button onClick={() => onEnlarge(mockup.url)} className="absolute top-2 right-2 p-1.5 bg-slate-800/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-slate-800/80 transition-opacity" title="Enlarge image">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" /></svg>
                </button>
                {videoSelectionIndex === index && <div className="absolute inset-0 rounded-md ring-4 ring-green-500 pointer-events-none"></div>}
                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button onClick={() => onSelectForVideo(index)} className="bg-white/20 hover:bg-white/40 text-white rounded-full p-2 transform transition-transform hover:scale-110" title="Select for video generation">
                        <VideoIcon />
                    </button>
                </div>
            </div>
        ))}
    </div>
);

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

const GenerateMockups: React.FC<GenerateMockupsProps> = ({ workflowState, updateWorkflow, setCurrentView, addJob, updateJobStatus }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<{light: boolean, dark: boolean}>({light: false, dark: false});
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [selectedImageForModal, setSelectedImageForModal] = useState<string | null>(null);
    const [videoSelection, setVideoSelection] = useState<{type: 'light' | 'dark', index: number} | null>(null);
    
    const [lightMockups, setLightMockups] = useState<MockupData[]>(workflowState?.mockups.light || []);
    const [selectedLightIndices, setSelectedLightIndices] = useState<Set<number>>(new Set());
    
    const [darkMockups, setDarkMockups] = useState<MockupData[]>(workflowState?.mockups.dark || []);
    const [selectedDarkIndices, setSelectedDarkIndices] = useState<Set<number>>(new Set());
    
    const [styles, setStyles] = useState({ flatLay: true, folded: true, hanging: true, man: true, woman: true, kid: false });
    const [numToGenerate, setNumToGenerate] = useState(4);
    const [theme, setTheme] = useState('');
    
    const hasLightColors = (workflowState?.selectedLightColors?.length ?? 0) > 0;
    const hasDarkColors = (workflowState?.selectedDarkColors?.length ?? 0) > 0;

    const handleGenerateMockups = useCallback(async (type: 'light' | 'dark') => {
        if (!workflowState || !workflowState.asset || !workflowState.selectedProduct) return;
        
        const colors = type === 'light' ? workflowState.selectedLightColors : workflowState.selectedDarkColors;
        if (colors.length === 0) return;

        setIsLoading(true);
        setError(null);
        type === 'light' ? setLightMockups([]) : setDarkMockups([]);
        type === 'light' ? setSelectedLightIndices(new Set()) : setSelectedDarkIndices(new Set());
        setVideoSelection(null);
        setProgressMessage(`Preparing ${type} mockups...`);

        const activeStyles = (Object.keys(styles) as MockupStyle[]).filter(key => styles[key]);
        if (activeStyles.length === 0) {
            setError('Please select at least one mockup style.');
            setIsLoading(false);
            return;
        }
        
        let designUrl = workflowState.asset.imageUrl;
        if (type === 'dark') {
            let variantUrl = workflowState.designVariantUrl;
            if (!variantUrl) {
                const variantJobId = Date.now();
                addJob({ id: variantJobId, name: 'Generating light design variant', status: 'processing' });
                try {
                    setProgressMessage('Generating a design variant for dark products...');
                    variantUrl = await generateInverseDesignVariant(workflowState.asset.imageUrl);
                    updateWorkflow({ designVariantUrl: variantUrl });
                    updateJobStatus(variantJobId, 'completed');
                } catch (e) {
                    updateJobStatus(variantJobId, 'failed');
                    setError('Failed to create design variant. Cannot generate mockups for dark products.');
                    setIsLoading(false);
                    return;
                }
            }
            designUrl = variantUrl;
        }

        const jobsToRun: { color: string; style: MockupStyle }[] = [];
        let colorIndex = 0;
        for (const style of activeStyles) {
            jobsToRun.push({ color: colors[colorIndex % colors.length], style });
            colorIndex++;
        }
        while (jobsToRun.length < numToGenerate) {
            const randomStyle = activeStyles[Math.floor(Math.random() * activeStyles.length)];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            jobsToRun.push({ color: randomColor, style: randomStyle });
        }
        
        const finalJobs = jobsToRun.slice(0, numToGenerate);
        const generatedData: MockupData[] = [];
        for (let i = 0; i < finalJobs.length; i++) {
            const { color, style } = finalJobs[i];
            const jobId = Date.now() + Math.random();
            setProgressMessage(`Generating ${type} mockup ${i + 1} of ${finalJobs.length}...`);
            addJob({ id: jobId, name: `Mockup: ${style} (${color})`, status: 'processing' });
            try {
                const scene = getSceneForStyle(style, workflowState.selectedProduct.name);
                const mockupUrl = await generateMockupImage(designUrl, scene, color, workflowState.selectedProduct.name, theme);
                generatedData.push({ url: mockupUrl, params: { color, style }});
                type === 'light' ? setLightMockups(prev => [...prev, generatedData[generatedData.length-1]]) : setDarkMockups(prev => [...prev, generatedData[generatedData.length-1]]);
                updateJobStatus(jobId, 'completed');
            } catch (e) {
                updateJobStatus(jobId, 'failed');
            }
        }
        
        updateWorkflow({ mockups: { ...workflowState.mockups, [type]: generatedData }, mockupGenerationConfig: { theme } });
        setIsLoading(false);
        setProgressMessage('');

    }, [workflowState, styles, numToGenerate, theme, addJob, updateJobStatus, updateWorkflow]);

    const handleGenerateVideo = useCallback(async (type: 'light' | 'dark') => {
        if (!workflowState?.asset || !videoSelection || videoSelection.type !== type) return;

        const { index } = videoSelection;
        const selectedMockup = type === 'light' ? lightMockups[index] : darkMockups[index];
        if (!selectedMockup) return;

        setIsGeneratingVideo(prev => ({...prev, [type]: true}));
        const jobId = Date.now();
        addJob({ id: jobId, name: `Generating ${type} video ad`, status: 'processing' });
        try {
            const videoUrl = await generateVideoMockup(selectedMockup.url, selectedMockup.params.style);
            const currentUrls = workflowState.videoUrls || { light: null, dark: null };
            updateWorkflow({ videoUrls: { ...currentUrls, [type]: videoUrl } });
            updateJobStatus(jobId, 'completed');
        } catch (e) {
            setError(`Video generation failed for ${type} package.`);
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsGeneratingVideo(prev => ({...prev, [type]: false}));
        }
    }, [workflowState, videoSelection, lightMockups, darkMockups, addJob, updateJobStatus, updateWorkflow]);


    if (!workflowState || !workflowState.asset || !workflowState.selectedProduct) {
        return <div className="text-center"><p>Please complete previous steps.</p></div>;
    }

    const VideoGenerationSection: React.FC<{ type: 'light' | 'dark' }> = ({ type }) => {
        const mockups = type === 'light' ? lightMockups : darkMockups;
        const videoUrl = workflowState.videoUrls ? workflowState.videoUrls[type] : null;
        const isGenerating = isGeneratingVideo[type];
        const isSelected = videoSelection?.type === type;

        return (
            <div className="bg-slate-800 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div className="md:col-span-2">
                        <h2 className="text-xl font-semibold">Generate Video Ad ({type === 'light' ? 'Light Pkg' : 'Dark Pkg'})</h2>
                        <p className="text-slate-400 mt-1">Select a mockup from the grid above, then click 'Create Video'.</p>
                    </div>
                    <div className="flex items-center gap-4 justify-self-start md:justify-self-end">
                        {isSelected && <img src={mockups[videoSelection!.index].url} className="w-20 h-20 rounded-md object-cover ring-2 ring-green-500"/>}
                        <button onClick={() => handleGenerateVideo(type)} disabled={isGenerating || !isSelected} className="bg-slate-600 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-700">
                            {isGenerating ? <SpinnerIcon /> : <VideoIcon />}<span className="ml-2">{isGenerating ? 'Generating...' : 'Create Video'}</span>
                        </button>
                    </div>
                </div>
                {videoUrl && <div className="mt-6"><video src={videoUrl} controls className="w-full max-w-md mx-auto rounded-md" /></div>}
            </div>
        )
    };

    const MockupSection: React.FC<{ type: 'light' | 'dark'; title: string; description: string; }> = ({ type, title, description }) => {
        const mockups = type === 'light' ? lightMockups : darkMockups;
        const selectedIndices = type === 'light' ? selectedLightIndices : selectedDarkIndices;
        const setSelectedIndices = type === 'light' ? setSelectedLightIndices : setSelectedDarkIndices;

        const handleToggleSelection = (index: number) => {
            const newSelection = new Set(selectedIndices);
            newSelection.has(index) ? newSelection.delete(index) : newSelection.add(index);
            setSelectedIndices(newSelection);
        };

        return (
            <div className="bg-slate-800 p-6 rounded-lg">
                <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-semibold">{title}</h2>
                        <p className="text-sm text-slate-400">{description}</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => handleGenerateMockups(type)} disabled={isLoading} className="bg-brand-primary text-white font-bold py-2 px-6 rounded-md flex items-center disabled:bg-slate-600">
                            {isLoading && progressMessage.includes(type) ? <SpinnerIcon /> : `Generate`}
                        </button>
                    </div>
                </div>
                 {mockups.length > 0 ? (
                    <MockupGrid 
                        mockups={mockups}
                        onToggleSelection={handleToggleSelection}
                        onEnlarge={setSelectedImageForModal}
                        onSelectForVideo={(index) => setVideoSelection({ type, index })}
                        selectedIndices={selectedIndices}
                        videoSelectionIndex={videoSelection?.type === type ? videoSelection.index : null}
                    />
                ) : (
                    <div className="h-40 flex items-center justify-center text-slate-500">
                        {isLoading && progressMessage.includes(type) ? 'Generating...' : 'Click "Generate" to create mockups for these colors.'}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            {selectedImageForModal && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in-down" onClick={() => setSelectedImageForModal(null)}>
                    <img src={selectedImageForModal} className="max-h-[90vh] max-w-[90vw] rounded-lg" alt="Enlarged mockup" />
                </div>
            )}
            <h1 className="text-3xl font-bold text-white text-center">3. Generate Mockups</h1>
            
            <div className="bg-slate-800 p-6 rounded-lg space-y-6">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div>
                        <label className="block text-lg font-medium text-slate-300 mb-2">1. Mockups per Set</label>
                        <input type="number" value={numToGenerate} onChange={(e) => setNumToGenerate(parseInt(e.target.value, 10) || 0)} min="1" className="w-full bg-slate-700 rounded-md px-3 py-2" disabled={isLoading} />
                    </div>
                    <div className="lg:col-span-2">
                        <label className="block text-lg font-medium text-slate-300 mb-2">2. Theme (Optional)</label>
                        <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="e.g., Christmas, birthday party" className="w-full bg-slate-700 rounded-md px-3 py-2" disabled={isLoading}/>
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-medium text-slate-300 mb-3 pt-4 border-t border-slate-700">3. Mockup Styles</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-4">
                        <StyleCheckbox label="Flat Lay" isChecked={styles.flatLay} onChange={() => setStyles(p => ({...p, flatLay: !p.flatLay}))} disabled={isLoading} />
                        <StyleCheckbox label="Folded" isChecked={styles.folded} onChange={() => setStyles(p => ({...p, folded: !p.folded}))} disabled={isLoading} />
                        <StyleCheckbox label="Hanging" isChecked={styles.hanging} onChange={() => setStyles(p => ({...p, hanging: !p.hanging}))} disabled={isLoading} />
                        <StyleCheckbox label="Man" isChecked={styles.man} onChange={() => setStyles(p => ({...p, man: !p.man}))} disabled={isLoading} />
                        <StyleCheckbox label="Woman" isChecked={styles.woman} onChange={() => setStyles(p => ({...p, woman: !p.woman}))} disabled={isLoading} />
                        <StyleCheckbox label="Kid" isChecked={styles.kid} onChange={() => setStyles(p => ({...p, kid: !p.kid}))} disabled={isLoading} />
                    </div>
                </div>
            </div>

            {error && <p className="text-red-400 text-center mb-4">{error}</p>}
            
            {hasLightColors && <MockupSection type="light" title="Package 1: Original Design on Light Garments" description={`Using colors: ${workflowState.selectedLightColors.join(', ')}`} />}
            {hasLightColors && <VideoGenerationSection type="light" />}

            {hasDarkColors && <MockupSection type="dark" title="Package 2: Light Variant on Dark Garments" description={`Using colors: ${workflowState.selectedDarkColors.join(', ')}`} />}
            {hasDarkColors && <VideoGenerationSection type="dark" />}
            
            <div className="flex justify-between items-center mt-8">
                <button onClick={() => setCurrentView('productSelection')} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-lg">Back</button>
                <button onClick={() => setCurrentView('marketingCopy')} disabled={(lightMockups.length + darkMockups.length) === 0 || isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg disabled:bg-slate-600">Continue to Marketing</button>
            </div>
        </div>
    );
};

export default GenerateMockups;
