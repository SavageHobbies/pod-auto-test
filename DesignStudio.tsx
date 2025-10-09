import React, { useState, useCallback } from 'react';
// FIX: Added .ts extension to fix module resolution error.
import { generateDesignImage, editDesignImage } from './services/geminiService.ts';
// FIX: Added .ts extension to fix module resolution error.
import { AppView, DesignAsset, Job } from './types.ts';
// FIX: Add .tsx extension to icon imports
import CreateIcon from './components/icons/CreateIcon.tsx';
// FIX: Add .tsx extension to icon imports
import SpinnerIcon from './components/icons/SpinnerIcon.tsx';
// FIX: Add .tsx extension to icon imports
import SparklesIcon from './components/icons/SparklesIcon.tsx';

interface DesignStudioProps {
  addAsset: (asset: DesignAsset) => void;
  setCurrentView: (view: AppView) => void;
  // FIX: Changed `addJob` signature to accept the full Job object to ensure correct job ID tracking.
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
}

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  // FIX: Wrapped the returned object in `inlineData` to match the expected type for the Gemini API service.
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const DesignStudio: React.FC<DesignStudioProps> = ({ addAsset, setCurrentView, addJob, updateJobStatus }) => {
  type Stage = 'prompting' | 'generating' | 'approving' | 'modifying';

  const [stage, setStage] = useState<Stage>('prompting');
  const [prompt, setPrompt] = useState('');
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReferenceImage(file);
      setReferenceImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() && !referenceImage) {
      setError('Please provide a prompt or a reference image.');
      return;
    }
    setError(null);
    setStage('generating');
    // FIX: Created job with a stable ID before updating its status.
    const jobId = Date.now();
    addJob({ id: jobId, name: "Generating AI Design", status: 'processing', progress: 50 });

    try {
      const imagePart = referenceImage ? await fileToGenerativePart(referenceImage) : undefined;
      const imageUrl = await generateDesignImage(prompt, imagePart);
      setGeneratedImageUrl(imageUrl);
      setStage('approving');
      updateJobStatus(jobId, 'completed');
    } catch (e) {
      console.error(e);
      setError('Failed to generate design. Please try again.');
      setStage('prompting');
      updateJobStatus(jobId, 'failed');
    }
  }, [prompt, referenceImage, addJob, updateJobStatus]);

  const handleModify = useCallback(async () => {
    if (!modificationPrompt.trim() || !generatedImageUrl) {
        setError("Please enter a modification instruction.");
        return;
    }
    setError(null);
    setStage('modifying');
    // FIX: Created job with a stable ID before updating its status.
    const jobId = Date.now();
    addJob({ id: jobId, name: `Modifying Design`, status: 'processing' });
    try {
        const editedImageUrl = await editDesignImage(generatedImageUrl, modificationPrompt);
        setGeneratedImageUrl(editedImageUrl);
        setModificationPrompt(''); // Clear prompt after use
        updateJobStatus(jobId, 'completed');
    } catch (e) {
        console.error("Failed to modify image:", e);
        setError("Sorry, the modification failed. Please try a different instruction.");
        updateJobStatus(jobId, 'failed');
    } finally {
        setStage('approving');
    }

  }, [generatedImageUrl, modificationPrompt, addJob, updateJobStatus]);


  const handleApprove = () => {
    if (!generatedImageUrl) return;

    const newAsset: DesignAsset = {
      id: Date.now(),
      name: prompt.substring(0, 30) || 'AI Generated Design',
      imageUrl: generatedImageUrl,
      tags: ['ai-generated', 'new'],
      resolution: { width: 1024, height: 1024 }, // Assuming 1024x1024 from Imagen
      isPrintReady: true,
    };
    addAsset(newAsset);
    // FIX: Changed view name from 'marketing' to 'marketingCopy' to match the valid `AppView` type.
    setCurrentView('marketingCopy');
  };

  const handleStartOver = () => {
    setStage('prompting');
    setGeneratedImageUrl(null);
    setPrompt('');
    setReferenceImage(null);
    setReferenceImagePreview(null);
  };

  const renderInitialPrompting = () => (
     <div className="bg-slate-800 p-6 rounded-lg space-y-6">
        <div>
        <label className="block text-lg font-medium text-slate-300 mb-2">1. Describe your design</label>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., 'A cute cartoon avocado doing yoga, flat illustration style'"
            className="w-full h-24 bg-slate-700 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none"
        />
        </div>

        <div>
        <label className="block text-lg font-medium text-slate-300 mb-2">2. (Optional) Add a reference image</label>
        <div className="flex items-center gap-4">
                <label htmlFor="file-upload" className="cursor-pointer bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md">
                Upload Image
            </label>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                {referenceImagePreview && <img src={referenceImagePreview} alt="Reference Preview" className="w-20 h-20 rounded-md object-cover" />}
        </div>
        </div>
        
        <button onClick={handleGenerate} className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 px-4 rounded-md flex items-center justify-center text-lg">
        Generate Design
        </button>
        {error && <p className="text-red-400 text-center pt-2">{error}</p>}
    </div>
  );

  const renderGenerating = () => (
    <div className="text-center py-16">
        <SpinnerIcon className="mx-auto h-12 w-12" />
        <p className="text-slate-400 mt-4 text-lg">The AI is creating your masterpiece... this can take up to a minute.</p>
    </div>
  );
  
  const renderApproving = () => (
    generatedImageUrl && (
        <div className="bg-slate-800 p-6 rounded-lg space-y-6">
            <h2 className="text-2xl font-bold text-center">Your Generated Design</h2>
            <div className="flex justify-center bg-slate-700 p-4 rounded-lg relative">
                 {stage === 'modifying' && (
                    <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center rounded-lg z-10">
                        <SpinnerIcon className="h-10 w-10"/>
                        <p className="mt-4 text-slate-300">Modifying your design...</p>
                    </div>
                )}
                <img src={generatedImageUrl} alt="Generated design" className="max-w-full max-h-96 rounded-md shadow-lg" />
            </div>
            {/* Modification UI */}
            <div className="space-y-2">
                <label className="block text-md font-medium text-slate-300">Modify Design</label>
                <div className="flex gap-2">
                    <input 
                        type="text"
                        value={modificationPrompt}
                        onChange={(e) => setModificationPrompt(e.target.value)}
                        placeholder="e.g., 'make the avocado wear a hat'"
                        className="flex-grow bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                        disabled={stage === 'modifying'}
                    />
                    <button onClick={handleModify} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center" disabled={stage === 'modifying'}>
                       <SparklesIcon className="w-4 h-4" /> <span className="ml-2">Modify</span>
                    </button>
                </div>
                 {error && <p className="text-red-400 text-sm pt-1">{error}</p>}
            </div>

            <div className="flex justify-center gap-4 pt-4 border-t border-slate-700">
                <button onClick={handleStartOver} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-6 rounded-md">
                    Start Over
                </button>
                <button onClick={handleApprove} className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-md">
                    Approve & Continue
                </button>
            </div>
        </div>
      )
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <CreateIcon className="mx-auto h-12 w-12 text-brand-primary" />
        <h1 className="text-3xl font-bold text-white mt-4">Design Studio</h1>
        <p className="text-slate-400 mt-2">Create a new print-on-demand design with AI.</p>
      </div>

      {(stage === 'prompting') && renderInitialPrompting()}
      {(stage === 'generating') && renderGenerating()}
      {/* FIX: Corrected syntax error from '--' to '&&' for conditional rendering */}
      {(stage === 'approving' || stage === 'modifying') && renderApproving()}

    </div>
  );
};

export default DesignStudio;