import React, { useState, useCallback } from 'react';
import { editDesignImage } from '../services/geminiService.ts';
import { Job } from '../types.ts';
import XIcon from './icons/XIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SparklesIcon from './icons/SparklesIcon.tsx';

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
    } catch (e) {
      console.error("Failed to modify image:", e);
      setError("Sorry, the modification failed. Please try a different instruction.");
      updateJobStatus(jobId, 'failed');
    } finally {
      setIsModifying(false);
    }
  }, [currentImageUrl, modificationPrompt, addJob, updateJobStatus]);
  
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
        
        <div className="space-y-2">
            <label htmlFor="modification-prompt" className="block text-md font-medium text-slate-300">Describe your change</label>
            <div className="flex gap-2">
                <input 
                    id="modification-prompt"
                    type="text" 
                    value={modificationPrompt} 
                    onChange={(e) => setModificationPrompt(e.target.value)} 
                    placeholder="e.g., 'make the lines thicker'" 
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
