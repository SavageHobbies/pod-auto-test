
import React, { useState, useCallback, useEffect } from 'react';
import { generateDesignImage, editDesignImage, removeImageBackground } from '../services/geminiService.ts';
import { DesignAsset, Job } from '../types.ts';
import CreateIcon from './icons/CreateIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SparklesIcon from './icons/SparklesIcon.tsx';
import MagicWandIcon from './icons/MagicWandIcon.tsx';
import UndoIcon from './icons/UndoIcon.tsx';

interface DesignStudioProps {
  startWorkflow: (asset: DesignAsset) => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
  initialPrompt?: string;
}

const STYLE_PRESETS = [
    { id: 'none', label: 'None', prompt: '' },
    { id: 'sticker', label: 'Sticker Art', prompt: 'die-cut sticker design, white border, vector art, flat color, simple shapes' },
    { id: 'vintage', label: 'Vintage', prompt: 'vintage retro style, distressed texture, 70s vibe, warm colors' },
    { id: 'watercolor', label: 'Watercolor', prompt: 'watercolor painting style, soft edges, artistic, dreamy, pastel colors' },
    { id: 'neon', label: 'Neon Cyber', prompt: 'cyberpunk neon style, glowing lines, dark background contrast, futuristic' },
    { id: 'pixel', label: 'Pixel Art', prompt: '8-bit pixel art, retro game style, blocky, limited palette' },
    { id: 'lineart', label: 'Line Art', prompt: 'minimalist line art, black and white, continuous line, sophisticated' },
];

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const DesignStudio: React.FC<DesignStudioProps> = ({ startWorkflow, addJob, updateJobStatus, initialPrompt }) => {
  type Stage = 'idle' | 'generating' | 'processing';

  const [stage, setStage] = useState<Stage>('idle');
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(STYLE_PRESETS[0]);
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]); 
  const [error, setError] = useState<string | null>(null);

  // Load initial prompt if provided (from Trend Research)
  useEffect(() => {
      if (initialPrompt) {
          setPrompt(initialPrompt);
      }
  }, [initialPrompt]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      setReferenceImagePreview(URL.createObjectURL(file));
    }
  };

  const addToHistory = (url: string) => {
      setHistory(prev => [...prev, url]);
  };
  
  const handleUndo = () => {
      if (history.length > 1) {
          const newHistory = [...history];
          newHistory.pop(); 
          const previous = newHistory[newHistory.length - 1];
          setGeneratedImageUrl(previous);
          setHistory(newHistory);
      } else if (history.length === 1) {
          setGeneratedImageUrl(null);
          setHistory([]);
      }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && !referenceImage) {
      setError('Please provide a prompt or a reference image.');
      return;
    }
    setError(null);
    setStage('generating');
    const jobId = Date.now();
    addJob({ id: jobId, name: "Generating AI Design", status: 'processing', progress: 50 });

    try {
      const imagePart = referenceImage ? await fileToGenerativePart(referenceImage) : undefined;
      const fullPrompt = selectedStyle.id !== 'none' ? `${prompt}, ${selectedStyle.prompt}` : prompt;
      const imageUrl = await generateDesignImage(fullPrompt, imagePart);
      
      setGeneratedImageUrl(imageUrl);
      addToHistory(imageUrl);
      setStage('idle');
      updateJobStatus(jobId, 'completed');
    } catch (e) {
      console.error(e);
      setError('Failed to generate design. Please try again.');
      setStage('idle');
      updateJobStatus(jobId, 'failed');
    }
  }, [prompt, selectedStyle, referenceImage, addJob, updateJobStatus]);

  const handleModify = useCallback(async () => {
    if (!modificationPrompt.trim() || !generatedImageUrl) return;
    
    setError(null);
    setStage('processing');
    const jobId = Date.now();
    addJob({ id: jobId, name: `Modifying Design`, status: 'processing' });
    try {
        const editedImageUrl = await editDesignImage(generatedImageUrl, modificationPrompt);
        setGeneratedImageUrl(editedImageUrl);
        addToHistory(editedImageUrl);
        setModificationPrompt('');
        updateJobStatus(jobId, 'completed');
    } catch (e) {
        console.error("Failed to modify image:", e);
        setError("Modification failed. Try a different prompt.");
        updateJobStatus(jobId, 'failed');
    } finally {
        setStage('idle');
    }
  }, [generatedImageUrl, modificationPrompt, addJob, updateJobStatus]);

  const handleRemoveBackground = useCallback(async () => {
      if (!generatedImageUrl) return;
      setError(null);
      setStage('processing');
      const jobId = Date.now();
      addJob({ id: jobId, name: "Removing Background", status: 'processing' });
      try {
          const cleanImageUrl = await removeImageBackground(generatedImageUrl);
          setGeneratedImageUrl(cleanImageUrl);
          addToHistory(cleanImageUrl);
          updateJobStatus(jobId, 'completed');
      } catch (e) {
          console.error("Failed to remove background:", e);
          setError("Failed to remove background.");
          updateJobStatus(jobId, 'failed');
      } finally {
          setStage('idle');
      }
  }, [generatedImageUrl, addJob, updateJobStatus]);

  const handleApprove = () => {
    if (!generatedImageUrl) return;
    const newAsset: DesignAsset = {
      id: Date.now(),
      name: prompt.substring(0, 30) || 'AI Generated Design',
      imageUrl: generatedImageUrl,
      tags: ['ai-generated', selectedStyle.id],
      resolution: { width: 1024, height: 1024 }, 
      isPrintReady: true,
    };
    startWorkflow(newAsset);
  };

  const isBusy = stage !== 'idle';

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Design Studio</h1>
        <p className="text-slate-400">Create unique, print-ready designs powered by AI.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
          {/* Left Column: Controls */}
          <div className="lg:col-span-4 space-y-6">
             <div className="glass-panel p-6 rounded-xl space-y-6">
                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">1. What to Create</label>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., A cute cartoon avocado doing yoga"
                        className="w-full h-32 bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:outline-none text-white resize-none"
                        disabled={isBusy}
                    />
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">2. Choose a Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {STYLE_PRESETS.map(style => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all border ${selectedStyle.id === style.id ? 'bg-teal-500/20 border-teal-500 text-teal-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                                disabled={isBusy}
                            >
                                {style.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-300 mb-2 uppercase tracking-wider">3. Reference (Optional)</label>
                    <div className="flex items-center gap-3">
                        <label className={`flex-grow cursor-pointer bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-medium py-2 px-4 rounded-lg text-center transition-colors ${isBusy ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <span>{referenceImage ? 'Change Image' : 'Upload Image'}</span>
                            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" disabled={isBusy} />
                        </label>
                        {referenceImagePreview && (
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-600">
                                <img src={referenceImagePreview} alt="Ref" className="w-full h-full object-cover" />
                            </div>
                        )}
                    </div>
                </div>
                
                <button 
                    onClick={handleGenerate} 
                    disabled={isBusy || (!prompt && !referenceImage)}
                    className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-teal-900/20 transform transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                   {stage === 'generating' ? <SpinnerIcon /> : <CreateIcon />}
                   <span className="ml-2">{stage === 'generating' ? 'Dreaming...' : 'Generate Design'}</span>
                </button>
                {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{error}</p>}
             </div>
          </div>

          {/* Right Column: Canvas/Preview */}
          <div className="lg:col-span-8">
              <div className="glass-panel p-1 rounded-xl h-full flex flex-col min-h-[600px]">
                  <div className="flex-grow bg-slate-900/50 rounded-lg relative overflow-hidden flex items-center justify-center checkerboard-bg">
                      {isBusy && (
                          <div className="absolute inset-0 bg-slate-900/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm">
                              <SpinnerIcon className="w-12 h-12 text-teal-500 mb-4" />
                              <p className="text-teal-400 font-medium animate-pulse">AI is working its magic...</p>
                          </div>
                      )}
                      
                      {generatedImageUrl ? (
                          <img src={generatedImageUrl} alt="Generated Design" className="max-w-full max-h-[600px] object-contain drop-shadow-2xl" />
                      ) : (
                          <div className="text-center text-slate-500">
                              <SparklesIcon className="w-16 h-16 mx-auto mb-4 opacity-20" />
                              <p className="text-lg">Your design will appear here.</p>
                          </div>
                      )}

                      {/* Floating Toolbar for Image Actions */}
                      {generatedImageUrl && !isBusy && (
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 bg-slate-800/90 backdrop-blur-md p-2 rounded-full border border-slate-700 shadow-xl">
                                <button onClick={handleUndo} disabled={history.length <= 1} className="p-2 text-slate-400 hover:text-white disabled:opacity-30" title="Undo">
                                    <UndoIcon />
                                </button>
                                <div className="w-px bg-slate-600 mx-1"></div>
                                <button onClick={handleRemoveBackground} className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-white text-sm transition-colors font-medium">
                                    <MagicWandIcon className="w-4 h-4 text-purple-400" /> Remove BG
                                </button>
                          </div>
                      )}
                  </div>

                  {/* Modification Bar */}
                  {generatedImageUrl && (
                      <div className="p-4 border-t border-slate-800 space-y-4 bg-slate-900/30">
                           <div className="flex gap-2">
                                <input 
                                    type="text"
                                    value={modificationPrompt}
                                    onChange={(e) => setModificationPrompt(e.target.value)}
                                    placeholder="Type to edit (e.g., 'change the hat to red')"
                                    className="flex-grow bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none text-white"
                                    disabled={isBusy}
                                />
                                <button 
                                    onClick={handleModify} 
                                    disabled={isBusy || !modificationPrompt}
                                    className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg flex items-center disabled:opacity-50"
                                >
                                <SparklesIcon className="w-4 h-4" /> <span className="ml-2">Edit</span>
                                </button>
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    onClick={handleApprove} 
                                    className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-green-900/20 transition-transform transform hover:scale-105"
                                >
                                    Approve & Next Step →
                                </button>
                            </div>
                      </div>
                  )}
              </div>
          </div>
      </div>
    </div>
  );
};

export default DesignStudio;
