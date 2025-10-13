import React, { useState, useCallback } from 'react';
// FIX: Added .ts extension to fix module resolution error.
import { DesignAsset, Job } from './types.ts';
// FIX: Added .ts extension to fix module resolution error.
import { generateMockupImage } from './services/geminiService.ts';
// FIX: Add .tsx extension to icon imports
import SpinnerIcon from './components/icons/SpinnerIcon.tsx';
// FIX: Add .tsx extension to icon imports
import MockupIcon from './components/icons/MockupIcon.tsx';

interface MockupsProps {
  selectedAsset: DesignAsset | null;
  // FIX: Changed `addJob` signature to accept the full Job object to ensure correct job ID tracking.
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number) => void;
  addAsset: (asset: DesignAsset) => void;
}

const Mockups: React.FC<MockupsProps> = ({ selectedAsset, addJob, updateJobStatus, addAsset }) => {
  // FIX: Replaced single description state with structured states to match service signature.
  const [scene, setScene] = useState('worn by a person in a city setting');
  const [color, setColor] = useState('black');
  const [productType, setProductType] = useState('t-shirt');
  const [generatedMockupUrl, setGeneratedMockupUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateMockup = useCallback(async () => {
    if (!selectedAsset) {
      setError('Please select an asset first from the Asset Library.');
      return;
    }
    if (!scene.trim() || !color.trim() || !productType.trim()) {
        setError('Please provide product type, color, and scene details.');
        return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedMockupUrl(null);
    // FIX: Created job with a stable ID before updating its status.
    const jobId = Date.now();
    addJob({ id: jobId, name: `Generating mockup for ${selectedAsset.name}`, status: 'processing', progress: 50 });

    try {
      // FIX: Called generateMockupImage with the correct 4 arguments.
      const mockupUrl = await generateMockupImage(selectedAsset.imageUrl, scene, color, productType);
      setGeneratedMockupUrl(mockupUrl);
      updateJobStatus(jobId, 'completed');
    } catch (e) {
      console.error(e);
      setError('Failed to generate mockup. The AI might be busy. Please try again.');
      updateJobStatus(jobId, 'failed');
    } finally {
      setIsLoading(false);
    }
  }, [selectedAsset, scene, color, productType, addJob, updateJobStatus]);

  const handleSaveMockup = () => {
    if (!generatedMockupUrl || !selectedAsset) return;
    const newAsset: DesignAsset = {
        id: Date.now(),
        name: `${selectedAsset.name} Mockup`,
        imageUrl: generatedMockupUrl,
        tags: ['mockup', selectedAsset.tags[0] || 'ai-generated'],
        resolution: { width: 1024, height: 1024 }, // Placeholder resolution
        isPrintReady: false,
    };
    addAsset(newAsset);
    // Maybe show a notification? For now, just add it.
    setGeneratedMockupUrl(null); // Clear after saving
  };


  if (!selectedAsset) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <MockupIcon className="w-16 h-16 text-slate-500 mb-4" />
        <h2 className="text-2xl font-bold text-white">Mockup Generator</h2>
        <p className="text-slate-400 mt-2 max-w-md">Please select a design from the Asset Library to start creating mockups.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="text-center">
        <MockupIcon className="mx-auto h-12 w-12 text-brand-primary" />
        <h1 className="text-3xl font-bold text-white mt-4">Generate Product Mockups</h1>
        <p className="text-slate-400 mt-2">Bring your design to life with realistic, AI-generated mockups.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        <div className="bg-slate-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">1. Your Design</h2>
          <img src={selectedAsset.imageUrl} alt={selectedAsset.name} className="w-full rounded-md bg-slate-700" />
          <h3 className="text-lg font-medium pt-2">{selectedAsset.name}</h3>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">2. Mockup Settings</h2>
          {/* FIX: Replaced single textarea with separate inputs for structured data. */}
          <div className="space-y-3">
            <div>
                <label htmlFor="product-type" className="block text-sm font-medium text-slate-300 mb-1">
                    Product Type
                </label>
                <input
                    id="product-type"
                    type="text"
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    placeholder="e.g., t-shirt, hoodie, mug"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                    disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="product-color" className="block text-sm font-medium text-slate-300 mb-1">
                    Product Color
                </label>
                <input
                    id="product-color"
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="e.g., black, white, navy blue"
                    className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                    disabled={isLoading}
                />
            </div>
            <div>
                <label htmlFor="product-scene" className="block text-sm font-medium text-slate-300 mb-1">
                    Scene Description
                </label>
                <textarea
                    id="product-scene"
                    value={scene}
                    onChange={(e) => setScene(e.target.value)}
                    placeholder="e.g., on a hanger, worn by a person in a city setting"
                    className="w-full h-24 bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                    disabled={isLoading}
                />
            </div>
          </div>
          <button
            onClick={handleGenerateMockup}
            disabled={isLoading}
            className="w-full bg-brand-primary hover:bg-brand-secondary text-white font-bold py-3 rounded-md flex items-center justify-center disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            {isLoading ? <SpinnerIcon /> : 'Generate Mockup'}
          </button>
           {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      </div>
       {isLoading && (
        <div className="text-center py-8">
             <SpinnerIcon className="mx-auto h-8 w-8" />
            <p className="text-slate-400 mt-2">Generating mockup... this may take a moment.</p>
        </div>
      )}
      {generatedMockupUrl && !isLoading && (
        <div className="bg-slate-800 p-6 rounded-lg space-y-4">
          <h2 className="text-xl font-semibold">3. Your New Mockup</h2>
          <img src={generatedMockupUrl} alt="Generated mockup" className="w-full max-w-lg mx-auto rounded-md" />
          <div className="flex justify-center gap-4 pt-4">
            <button onClick={() => setGeneratedMockupUrl(null)} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-md">
                Discard
            </button>
            <button onClick={handleSaveMockup} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md">
                Save to Library
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Mockups;
