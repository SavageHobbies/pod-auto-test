
import React, { useState, useCallback, useRef } from 'react';
// FIX: Added .ts extension to fix module resolution error.
import { DesignAsset, Job } from '../types.ts';
import UploadIcon from './icons/UploadIcon.tsx';

interface AssetLibraryProps {
  assets: DesignAsset[];
  addAsset: (asset: DesignAsset) => void;
  // FIX: Changed `addJob` signature to accept the full Job object to ensure correct job ID tracking.
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number) => void;
  onAssetSelect: (asset: DesignAsset) => void;
}

const DesignCard: React.FC<{ asset: DesignAsset, onSelect: () => void }> = ({ asset, onSelect }) => (
    <div className="bg-slate-800 rounded-lg overflow-hidden group cursor-pointer" onClick={onSelect}>
        <div className="relative aspect-square">
            <img src={asset.imageUrl} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <span className="text-white font-bold">Generate Assets</span>
            </div>
        </div>
        <div className="p-4">
            <h3 className="font-semibold text-white truncate">{asset.name}</h3>
            <div className="flex flex-wrap gap-2 mt-2">
                {asset.tags.map(tag => (
                     <span key={tag} className="text-xs bg-brand-secondary text-brand-primary font-semibold px-2 py-0.5 rounded-full">{tag}</span>
                ))}
            </div>
        </div>
    </div>
);


const AssetLibrary: React.FC<AssetLibraryProps> = ({ assets, addAsset, addJob, updateJobStatus, onAssetSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleFileProcessing = useCallback(async (file: File) => {
        // FIX: Created job with a stable ID before updating its status.
        const jobId = Date.now();
        addJob({ id: jobId, name: `Processing ${file.name}`, status: 'queued', details: 'Starting up...' });

        // Simulate Transparency Check
        updateJobStatus(jobId, 'processing', 10);
        await new Promise(res => setTimeout(res, 1000));

        // Simulate Background Removal
        updateJobStatus(jobId, 'processing', 30);
        await new Promise(res => setTimeout(res, 1500));

        // Simulate Vectorization
        updateJobStatus(jobId, 'processing', 60);
        await new Promise(res => setTimeout(res, 2000));
        
        // Simulate Resizing
        updateJobStatus(jobId, 'processing', 80);
        await new Promise(res => setTimeout(res, 1000));

        // Quality Gate Check
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const lowQuality = img.width < 1000 || img.height < 1000;
            if (lowQuality) {
                updateJobStatus(jobId, 'warning', 100);
                addJob({id: Date.now() + 1, name: `Quality Warning`, status: 'warning', details: `${file.name} has low resolution.`})
            } else {
                updateJobStatus(jobId, 'completed', 100);
            }

            const newAsset: DesignAsset = {
                id: Date.now(),
                name: file.name.replace(/\.[^/.]+$/, ""),
                imageUrl: imageUrl,
                tags: ['new', 'untagged'],
                resolution: { width: img.width, height: img.height },
                isPrintReady: true,
            };
            addAsset(newAsset);
        };
        img.src = imageUrl;
    }, [addAsset, addJob, updateJobStatus]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            handleFileProcessing(files[0]);
        }
    };
    
    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            handleFileProcessing(files[0]);
        }
    };

    const triggerFileSelect = () => fileInputRef.current?.click();

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Asset Library</h1>

            <div 
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors duration-300 ${isDragging ? 'border-brand-primary bg-slate-800' : 'border-slate-600 hover:border-brand-secondary'}`}
                onClick={triggerFileSelect}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    accept="image/png, image/jpeg"
                />
                <div className="flex flex-col items-center justify-center text-slate-400">
                    <UploadIcon className="w-12 h-12 mb-4" />
                    <p className="font-semibold">Drag & drop your design here</p>
                    <p className="text-sm">or click to browse files</p>
                    <p className="text-xs mt-2">(PNG or JPG supported)</p>
                </div>
            </div>

            {assets.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {assets.map(asset => (
                        <DesignCard key={asset.id} asset={asset} onSelect={() => onAssetSelect(asset)} />
                    ))}
                </div>
            ) : (
                 <div className="text-center py-16">
                    <p className="text-slate-500">Your uploaded designs will appear here.</p>
                </div>
            )}
        </div>
    );
};

export default AssetLibrary;
