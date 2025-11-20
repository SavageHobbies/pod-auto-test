
// components/Mockups.tsx

import React, { useState, useCallback, useEffect } from 'react';
import { WorkflowState, Job, AppView, MockupStyle, MockupData, DesignAsset } from '../types.ts';
import { generateMockupImage, generateVideoMockup, generateInverseDesignVariant } from '../services/geminiService.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import VideoIcon from './icons/VideoIcon.tsx';
import XIcon from './icons/XIcon.tsx';
import RefreshIcon from './icons/RefreshIcon.tsx';
import MagicWandIcon from './icons/MagicWandIcon.tsx';

interface GenerateMockupsProps {
  workflowState: WorkflowState | null;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  setCurrentView: (view: AppView) => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
  addAsset: (asset: DesignAsset) => void;
}

const MOCKUP_STYLES: { id: MockupStyle; label: string; icon: string }[] = [
    { id: 'flatLay', label: 'Flat Lay', icon: '👕' },
    { id: 'folded', label: 'Folded', icon: '👔' },
    { id: 'hanging', label: 'Hanging', icon: '🧥' },
    { id: 'man', label: 'Model (Man)', icon: '👨' },
    { id: 'woman', label: 'Model (Woman)', icon: '👩' },
    { id: 'kid', label: 'Model (Kid)', icon: '🧒' },
];

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

const NumericStepper: React.FC<{ value: number, onChange: (val: number) => void, min: number, max: number }> = ({ value, onChange, min, max }) => (
    <div className="flex items-center bg-slate-700 rounded-md border border-slate-600">
        <button 
            onClick={() => onChange(Math.max(min, value - 1))} 
            className="px-3 py-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-l-md transition-colors disabled:opacity-50"
            disabled={value <= min}
        >
            -
        </button>
        <span className="px-3 py-1 text-white font-mono font-bold min-w-[2rem] text-center">{value}</span>
        <button 
            onClick={() => onChange(Math.min(max, value + 1))} 
            className="px-3 py-1 text-slate-300 hover:text-white hover:bg-slate-600 rounded-r-md transition-colors disabled:opacity-50"
            disabled={value >= max}
        >
            +
        </button>
    </div>
);

const GenerateMockups: React.FC<GenerateMockupsProps> = ({ workflowState, updateWorkflow, setCurrentView, addJob, updateJobStatus, addAsset }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingVideo, setIsGeneratingVideo] = useState<{light: boolean, dark: boolean}>({light: false, dark: false});
    const [error, setError] = useState<string | null>(null);
    const [progressMessage, setProgressMessage] = useState('');
    const [selectedImageForModal, setSelectedImageForModal] = useState<string | null>(null);
    
    // Configuration States
    const [styles, setStyles] = useState<Record<MockupStyle, boolean>>({ flatLay: true, folded: true, hanging: true, man: true, woman: true, kid: false });
    const [theme, setTheme] = useState('');

    // Quantity sliders
    const [numLight, setNumLight] = useState(3);
    const [numDark, setNumDark] = useState(3);

    // Local state for active colors (subset of workflow selected colors)
    const [activeLightColors, setActiveLightColors] = useState<string[]>([]);
    const [activeDarkColors, setActiveDarkColors] = useState<string[]>([]);

    // Initialize active colors from workflow state on mount
    useEffect(() => {
        if (workflowState?.selectedLightColors) {
            setActiveLightColors(workflowState.selectedLightColors);
        }
        if (workflowState?.selectedDarkColors) {
            setActiveDarkColors(workflowState.selectedDarkColors);
        }
    }, [workflowState?.selectedLightColors, workflowState?.selectedDarkColors]);
    
    const hasLightColors = (workflowState?.selectedLightColors?.length ?? 0) > 0;
    const hasDarkColors = (workflowState?.selectedDarkColors?.length ?? 0) > 0;

    const handleStyleToggle = (id: MockupStyle) => {
        setStyles(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const toggleActiveColor = (type: 'light' | 'dark', hex: string) => {
        if (type === 'light') {
            setActiveLightColors(prev => prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex]);
        } else {
            setActiveDarkColors(prev => prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex]);
        }
    };

    const handleGenerateAll = useCallback(async () => {
        if (!workflowState || !workflowState.asset || !workflowState.selectedProduct) return;
        
        setIsLoading(true);
        setError(null);
        
        const activeStyles = (Object.keys(styles) as MockupStyle[]).filter(key => styles[key]);
        if (activeStyles.length === 0) {
            setError('Please select at least one mockup style.');
            setIsLoading(false);
            return;
        }

        const generateBatch = async (type: 'light' | 'dark', colors: string[], quantity: number) => {
            if (colors.length === 0 || quantity <= 0) return;

            setProgressMessage(`Preparing ${type} mockups...`);
            
            // Reset previous for this batch
            updateWorkflow({ 
                mockups: { ...workflowState.mockups, [type]: [] },
                mockupGenerationConfig: { theme }
            });

            let designUrl = workflowState.asset.imageUrl;
            
            // Handle Dark Variant Logic
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
                        addAsset({
                            id: Date.now(),
                            name: `${workflowState.asset.name} (Dark Variant)`,
                            imageUrl: variantUrl,
                            tags: [...workflowState.asset.tags, 'variant', 'white-ink'],
                            resolution: workflowState.asset.resolution,
                            isPrintReady: true
                        });
                    } catch (e) {
                        updateJobStatus(variantJobId, 'failed');
                        console.error("Variant generation failed", e);
                        return; // Skip dark generation if variant fails
                    }
                }
                designUrl = variantUrl!;
            }

            const jobsToRun: { color: string; style: MockupStyle }[] = [];
            let colorIndex = 0;
            for (const style of activeStyles) {
                jobsToRun.push({ color: colors[colorIndex % colors.length], style });
                colorIndex++;
            }
            while (jobsToRun.length < quantity) {
                const randomStyle = activeStyles[Math.floor(Math.random() * activeStyles.length)];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                jobsToRun.push({ color: randomColor, style: randomStyle });
            }
            
            const finalJobs = jobsToRun.slice(0, quantity);
            const generatedData: MockupData[] = [];

            for (let i = 0; i < finalJobs.length; i++) {
                const { color, style } = finalJobs[i];
                const jobId = Date.now() + Math.random();
                setProgressMessage(`Generating ${type} mockup ${i + 1} of ${finalJobs.length}...`);
                addJob({ id: jobId, name: `Mockup: ${style} (${color})`, status: 'processing' });
                try {
                    const scene = getSceneForStyle(style, workflowState.selectedProduct!.name);
                    const mockupUrl = await generateMockupImage(designUrl, scene, color, workflowState.selectedProduct!.name, theme);
                    
                    const newData = { url: mockupUrl, params: { color, style }};
                    generatedData.push(newData);
                    
                    // Incrementally update state so user sees images appear
                    updateWorkflow({ 
                        mockups: { 
                            ...workflowState.mockups, 
                            [type]: [...generatedData] // Note: accessing current loop var, not state, to be safe in loop
                        } 
                    });
                    updateJobStatus(jobId, 'completed');
                } catch (e: any) {
                    updateJobStatus(jobId, 'failed');
                    if (e.message?.includes("Quota")) {
                         setError("Usage quota exceeded. Please try again later or use fewer mockups.");
                         break; // Stop generating if we hit quota
                    }
                }
            }
            // Final update to ensure sync
            return generatedData;
        };

        try {
            const newLightMockups = await generateBatch('light', activeLightColors, numLight);
            const newDarkMockups = await generateBatch('dark', activeDarkColors, numDark);

            updateWorkflow({
                mockups: {
                    light: newLightMockups || [],
                    dark: newDarkMockups || []
                }
            });
        } catch (e) {
            setError("An error occurred during generation. Check job status.");
        } finally {
            setIsLoading(false);
            setProgressMessage('');
        }

    }, [workflowState, styles, numLight, numDark, activeLightColors, activeDarkColors, theme, addJob, updateJobStatus, updateWorkflow, addAsset]);


    const handleGenerateVideo = useCallback(async (type: 'light' | 'dark', mockup: MockupData) => {
        setIsGeneratingVideo(prev => ({...prev, [type]: true}));
        const jobId = Date.now();
        addJob({ id: jobId, name: `Generating ${type} video ad`, status: 'processing' });
        try {
            const videoUrl = await generateVideoMockup(mockup.url, mockup.params.style);
            const currentUrls = workflowState?.videoUrls || { light: null, dark: null };
            updateWorkflow({ videoUrls: { ...currentUrls, [type]: videoUrl } });
            updateJobStatus(jobId, 'completed');
        } catch (e: any) {
            console.error(e);
            const msg = e.message?.includes("Quota") ? "Quota exceeded for video generation." : "Video generation failed.";
            setError(msg);
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsGeneratingVideo(prev => ({...prev, [type]: false}));
        }
    }, [workflowState, addJob, updateJobStatus, updateWorkflow]);


    if (!workflowState || !workflowState.asset || !workflowState.selectedProduct) {
        return <div className="text-center"><p>Please complete previous steps.</p></div>;
    }

    const MockupCard: React.FC<{ mockup: MockupData, type: 'light' | 'dark' }> = ({ mockup, type }) => (
        <div className="flex flex-col gap-2">
            <div className="group relative rounded-lg overflow-hidden bg-slate-800 shadow-lg aspect-square border border-slate-700">
                <img src={mockup.url} alt="Mockup" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"/>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-end p-2 gap-2">
                    <button onClick={() => setSelectedImageForModal(mockup.url)} className="p-2 bg-slate-900/80 rounded-full text-white hover:bg-teal-500 transition-colors" title="View Fullscreen">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v4m0 0h-4m4 0l-5-5" /></svg>
                    </button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1 flex justify-between items-center text-[10px] text-slate-300 backdrop-blur-sm">
                    <span className="px-2 capitalize">{mockup.params.style}</span>
                    <div className="w-3 h-3 rounded-full border border-white/20 mr-2" style={{backgroundColor: mockup.params.color}}></div>
                </div>
            </div>
            <button 
                onClick={() => handleGenerateVideo(type, mockup)}
                disabled={isGeneratingVideo[type]}
                className="w-full py-2 bg-slate-800 hover:bg-purple-600/90 hover:text-white border border-slate-700 hover:border-purple-500 rounded-md text-xs font-bold text-slate-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
               {isGeneratingVideo[type] ? <SpinnerIcon className="w-3 h-3"/> : <VideoIcon className="w-3 h-3" />}
               {isGeneratingVideo[type] ? 'Creating Video...' : 'Create Video Ad'}
            </button>
        </div>
    );

    return (
        <div className="h-[calc(100vh-120px)] flex flex-col lg:flex-row gap-6">
            {/* Fullscreen Modal */}
            {selectedImageForModal && (
                <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center backdrop-blur-sm p-8" onClick={() => setSelectedImageForModal(null)}>
                    <img src={selectedImageForModal} className="max-h-full max-w-full rounded-lg shadow-2xl" alt="Enlarged mockup" />
                    <button className="absolute top-6 right-6 p-2 bg-slate-800 rounded-full text-white hover:bg-slate-700"><XIcon className="w-8 h-8" /></button>
                </div>
            )}

            {/* Left Sidebar: Controls */}
            <aside className="lg:w-80 flex-shrink-0 space-y-6 overflow-y-auto custom-scrollbar pb-20">
                <div className="glass-panel p-6 rounded-xl space-y-6">
                    <div className="flex items-center gap-2 text-white font-bold text-lg">
                        <MagicWandIcon className="w-5 h-5 text-teal-400"/>
                        <h2>Mockup Studio</h2>
                    </div>
                    
                    {/* Theme */}
                    <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Context / Theme</label>
                            <input 
                            type="text" 
                            value={theme} 
                            onChange={(e) => setTheme(e.target.value)}
                            placeholder="e.g., Summer Beach, Urban City"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-1 focus:ring-teal-500 outline-none"
                            disabled={isLoading}
                        />
                    </div>

                    <hr className="border-slate-700" />

                    {/* Light Settings */}
                    {hasLightColors && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-400 uppercase">Light Package</label>
                                <NumericStepper value={numLight} onChange={setNumLight} min={0} max={6} />
                            </div>
                            <div className="flex flex-wrap gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                <span className="text-[10px] text-slate-500 w-full">Use Colors:</span>
                                {workflowState.selectedLightColors.map(hex => (
                                    <button
                                        key={hex}
                                        onClick={() => toggleActiveColor('light', hex)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${activeLightColors.includes(hex) ? 'border-teal-500 scale-110' : 'border-slate-600 opacity-50'}`}
                                        style={{backgroundColor: hex}}
                                        title={hex}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Dark Settings */}
                        {hasDarkColors && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-bold text-slate-400 uppercase">Dark Package</label>
                                <NumericStepper value={numDark} onChange={setNumDark} min={0} max={6} />
                            </div>
                            <div className="flex flex-wrap gap-2 p-2 bg-slate-900/50 rounded-lg border border-slate-700/50">
                                <span className="text-[10px] text-slate-500 w-full">Use Colors:</span>
                                {workflowState.selectedDarkColors.map(hex => (
                                    <button
                                        key={hex}
                                        onClick={() => toggleActiveColor('dark', hex)}
                                        className={`w-6 h-6 rounded-full border-2 transition-all ${activeDarkColors.includes(hex) ? 'border-teal-500 scale-110' : 'border-slate-600 opacity-50'}`}
                                        style={{backgroundColor: hex}}
                                        title={hex}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Styles */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-3">Allowed Styles</label>
                        <div className="grid grid-cols-2 gap-2">
                            {MOCKUP_STYLES.map(style => (
                                <button
                                    key={style.id}
                                    onClick={() => handleStyleToggle(style.id)}
                                    className={`flex items-center gap-2 px-2 py-2 rounded-md text-[11px] font-medium transition-all border ${styles[style.id] ? 'bg-teal-500/20 border-teal-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}
                                >
                                    <span className="text-sm">{style.icon}</span> {style.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Main Action Button */}
                    <button 
                        onClick={handleGenerateAll}
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-teal-900/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transform transition-transform active:scale-95"
                    >
                        {isLoading ? <SpinnerIcon /> : <RefreshIcon />}
                        <span>{isLoading ? 'Generating...' : 'Generate All Mockups'}</span>
                    </button>
                    
                    {error && <div className="p-3 rounded-lg bg-red-500/10 text-red-400 text-xs border border-red-500/30">{error}</div>}
                </div>
            </aside>

            {/* Main Area: Gallery */}
            <main className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-20">
                <div className="space-y-8">
                     {/* Light Section */}
                     {hasLightColors && (
                         <div>
                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                 <span className="w-2 h-6 bg-white rounded-full"></span>
                                 Light Garment Package
                                 <span className="text-xs font-normal text-slate-400 ml-2">({workflowState.mockups.light.length} items)</span>
                             </h3>
                             {workflowState.mockups.light.length === 0 ? (
                                 <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/30">
                                     <p className="text-slate-500 text-sm">No light mockups generated. Adjust settings and click Generate.</p>
                                 </div>
                             ) : (
                                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                     {workflowState.mockups.light.map((m, i) => (
                                         <MockupCard key={i} mockup={m} type="light" />
                                     ))}
                                     {/* Light Video Section */}
                                     <div className="bg-slate-900 rounded-lg border border-purple-500/30 flex flex-col">
                                          <div className="p-2 border-b border-slate-800 bg-slate-800/50 text-center">
                                              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Video Ad</span>
                                          </div>
                                          <div className="flex-1 flex items-center justify-center p-2">
                                              {workflowState.videoUrls.light ? (
                                                  <video src={workflowState.videoUrls.light} controls className="w-full h-full object-cover rounded" />
                                              ) : (
                                                  <div className="text-center px-4">
                                                      <VideoIcon className="w-8 h-8 text-purple-500/50 mx-auto mb-2"/>
                                                      <p className="text-[10px] text-slate-500">Select a mockup to create a video</p>
                                                  </div>
                                              )}
                                          </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                     )}
                     
                     {/* Dark Section */}
                     {hasDarkColors && (
                         <div>
                             <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                 <span className="w-2 h-6 bg-slate-600 rounded-full"></span>
                                 Dark Garment Package
                                 <span className="text-xs font-normal text-slate-400 ml-2">({workflowState.mockups.dark.length} items)</span>
                             </h3>
                             {workflowState.mockups.dark.length === 0 ? (
                                 <div className="border border-dashed border-slate-700 rounded-xl p-8 text-center bg-slate-800/30">
                                     <p className="text-slate-500 text-sm">No dark mockups generated. Adjust settings and click Generate.</p>
                                 </div>
                             ) : (
                                 <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                     {workflowState.mockups.dark.map((m, i) => (
                                         <MockupCard key={i} mockup={m} type="dark" />
                                     ))}
                                      {/* Dark Video Section */}
                                     <div className="bg-slate-900 rounded-lg border border-purple-500/30 flex flex-col">
                                          <div className="p-2 border-b border-slate-800 bg-slate-800/50 text-center">
                                              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">Video Ad</span>
                                          </div>
                                          <div className="flex-1 flex items-center justify-center p-2">
                                              {workflowState.videoUrls.dark ? (
                                                  <video src={workflowState.videoUrls.dark} controls className="w-full h-full object-cover rounded" />
                                              ) : (
                                                  <div className="text-center px-4">
                                                      <VideoIcon className="w-8 h-8 text-purple-500/50 mx-auto mb-2"/>
                                                      <p className="text-[10px] text-slate-500">Select a mockup to create a video</p>
                                                  </div>
                                              )}
                                          </div>
                                     </div>
                                 </div>
                             )}
                         </div>
                     )}

                     {!hasLightColors && !hasDarkColors && (
                         <div className="text-center py-20 text-slate-500">
                             <p>No colors selected. Please go back and select product colors.</p>
                         </div>
                     )}
                </div>
            </main>

            {/* Bottom Bar */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-50 flex justify-between items-center px-8 lg:pl-80">
                 <button onClick={() => setCurrentView('productSelection')} className="text-slate-400 hover:text-white font-medium">
                     ← Back to Product
                 </button>
                 <button 
                    onClick={() => setCurrentView('marketingCopy')}
                    className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-green-900/30 transition-transform transform hover:scale-105"
                >
                    Continue to Marketing Copy →
                </button>
            </div>
        </div>
    );
};

export default GenerateMockups;
