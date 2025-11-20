
import React, { useState, useCallback } from 'react';
import { editDesignImage } from '../services/geminiService.ts';
import { Job } from '../types.ts';
import XIcon from './icons/XIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SparklesIcon from './icons/SparklesIcon.tsx';
import RefreshIcon from './icons/RefreshIcon.tsx'; // Using Refresh icon for "invert" metaphor

interface EditDesignModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (newImageUrl: string) => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
}

const EditDesignModal: React.FC<EditDesignModalProps> = ({ isOpen, onClose, imageUrl, onSave, addJob, updateJobStatus }) => {
  const [modificationPrompt, setModificationPrompt] = useState('');
  const [isModifying, setIsModifying] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState(imageUrl);
  const [error, setError] = useState<string | null>(null);

  const handleModify = useCallback(async () => {
    if (!modificationPrompt.trim()) {
      setError("Please enter a modification instruction.");
      return;
    }
    setError(null);
    setIsModifying(true);
    const jobId = Date.now();
    addJob({ id: jobId, name: `Modifying design`, status: 'processing' });
    try {
      const editedImageUrl = await editDesignImage(currentImageUrl, modificationPrompt);
      setCurrentImageUrl(editedImageUrl);
      setModificationPrompt(''); // Clear prompt after successful modification
      updateJobStatus(jobId, 'completed');
    } catch (e: any) {
      console.error("Failed to modify image:", e);
      setError(e.message || "Sorry, the modification failed. Please try a different instruction.");
      updateJobStatus(jobId, 'failed');
    } finally {
      setIsModifying(false);
    }
  }, [currentImageUrl, modificationPrompt, addJob, updateJobStatus]);
  
  const handleInvertColors = useCallback(() => {
      setIsModifying(true);
      setError(null);
      // Client-side color inversion using Canvas to save AI Quota
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const data = imageData.data;
              
              for (let i = 0; i < data.length; i += 4) {
                  // Simple inversion: 255 - r, 255 - g, 255 - b
                  // Preserving alpha channel (data[i+3])
                  data[i] = 255 - data[i];     // r
                  data[i + 1] = 255 - data[i + 1]; // g
                  data[i + 2] = 255 - data[i + 2]; // b
              }
              ctx.putImageData(imageData, 0, 0);
              setCurrentImageUrl(canvas.toDataURL());
              setIsModifying(false);
          }
      };
      img.onerror = () => {
          setError("Could not load image for inversion.");
          setIsModifying(false);
      }
      img.src = currentImageUrl;
  }, [currentImageUrl]);

  const handleSave = () => {
      onSave(currentImageUrl);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center animate-fade-in-down"
      onClick={onClose}
    >
      <div className="bg-slate-800 w-full max-w-2xl rounded-lg shadow-xl p-6 space-y-4 border border-slate-700" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Edit Design</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700">
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="bg-slate-700 p-4 rounded-lg relative min-h-[300px] flex items-center justify-center">
            {isModifying && (
                <div className="absolute inset-0 bg-slate-900/80 flex flex-col items-center justify-center rounded-lg z-10">
                    <SpinnerIcon className="h-10 w-10" />
                    <p className="mt-4 text-slate-300">Applying your changes...</p>
                </div>
            )}
            <img src={currentImageUrl} alt="Design to be edited" className="max-w-full max-h-96 rounded-md shadow-lg" />
        </div>
        
        <div className="space-y-4">
             {/* Quick Actions */}
             <div className="flex gap-3 pb-4 border-b border-slate-700">
                 <button 
                    onClick={handleInvertColors}
                    className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm font-medium text-white border border-slate-600 transition-colors"
                    title="Invert colors (e.g., make black text white) without using AI credits."
                 >
                     <RefreshIcon className="w-4 h-4 mr-2" />
                     Invert Colors (No AI Cost)
                 </button>
             </div>

            <label htmlFor="modification-prompt" className="block text-md font-medium text-slate-300">Describe your change (AI)</label>
            <div className="flex gap-2">
                <input 
                    id="modification-prompt"
                    type="text" 
                    value={modificationPrompt} 
                    onChange={(e) => setModificationPrompt(e.target.value)} 
                    placeholder="e.g., 'make the lines thicker' (Uses AI Quota)" 
                    className="flex-grow bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none" 
                    disabled={isModifying}
                />
                <button 
                    onClick={handleModify} 
                    className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded-md flex items-center" 
                    disabled={isModifying}
                >
                    <SparklesIcon className="w-4 h-4" /> 
                    <span className="ml-2">Modify</span>
                </button>
            </div>
            {error && <p className="text-red-400 text-sm pt-1">{error}</p>}
        </div>
        
        <div className="flex justify-end gap-4 pt-4 border-t border-slate-700">
            <button onClick={onClose} className="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-md">Cancel</button>
            <button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-md">Save Changes</button>
        </div>
      </div>
    </div>
  );
};

export default EditDesignModal;
