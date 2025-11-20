
// components/Staging.tsx

import React, { useState } from 'react';
import { StagedProduct } from '../types.ts';
import OutboxIcon from './icons/OutboxIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import CreateIcon from './icons/CreateIcon.tsx';

interface StagingProps {
  stagedProducts: StagedProduct[];
  showNotification: (message: string, type: 'success' | 'error') => void;
  onStartNew: () => void;
  onBackToWorkflow: () => void;
}

const StagedProductCard: React.FC<{
    product: StagedProduct;
    isSelected: boolean;
    onToggleSelect: () => void;
}> = ({ product, isSelected, onToggleSelect }) => (
    <div className={`bg-slate-800 rounded-lg overflow-hidden border-2 ${isSelected ? 'border-brand-primary' : 'border-slate-700'}`}>
        <div className="relative">
            <img 
                src={product.mockups[0]?.url || product.designImageUrl} 
                alt={product.marketingCopy.title}
                className="w-full h-48 object-cover"
            />
            <div 
                className="absolute inset-0 bg-black/50 cursor-pointer"
                onClick={onToggleSelect}
            >
                <div className={`absolute top-3 left-3 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors bg-slate-900/50 ${isSelected ? 'bg-brand-primary border-brand-primary' : 'border-slate-400'}`}>
                    {isSelected && <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
            </div>
        </div>
        <div className="p-4">
            <h3 className="font-semibold text-white truncate">{product.marketingCopy.title}</h3>
            <p className="text-sm text-slate-400">{product.productName}</p>
            <div className="flex flex-wrap gap-2 mt-2">
                {product.colors.slice(0, 3).map(color => (
                     <span key={color} className="text-xs bg-slate-700 text-slate-300 font-medium px-2 py-1 rounded">{color}</span>
                ))}
                {product.colors.length > 3 && <span className="text-xs bg-slate-700 text-slate-300 font-medium px-2 py-1 rounded">+{product.colors.length - 3} more</span>}
            </div>
        </div>
    </div>
);

const Staging: React.FC<StagingProps> = ({ stagedProducts, showNotification, onStartNew, onBackToWorkflow }) => {
    const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());
    const [isPublishing, setIsPublishing] = useState(false);

    const handleToggleSelect = (id: number) => {
        const newSelection = new Set(selectedProducts);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedProducts(newSelection);
    };

    const handlePublish = (platform: 'Printify' | 'Etsy') => {
        if (selectedProducts.size === 0) {
            showNotification('Please select products to publish.', 'error');
            return;
        }
        setIsPublishing(true);
        showNotification(`Publishing ${selectedProducts.size} products to ${platform}... (Mock Action)`, 'success');
        setTimeout(() => {
            setIsPublishing(false);
            showNotification('Publishing complete!', 'success');
            // Here you would typically remove the published products from the staged list
        }, 2000);
    };

    return (
        <div className="space-y-8 pb-20">
             <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <OutboxIcon className="h-10 w-10 text-brand-primary" />
                    <h1 className="text-3xl font-bold text-white">Staging Area</h1>
                </div>
                <div className="flex gap-4">
                     <button 
                        onClick={onBackToWorkflow}
                        className="text-slate-400 hover:text-white font-medium px-4 py-2"
                     >
                         Back to Edit Workflow
                     </button>
                     <button 
                        onClick={onStartNew}
                        className="bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white font-bold py-2 px-6 rounded-md flex items-center shadow-lg shadow-teal-900/50"
                     >
                         <CreateIcon className="w-5 h-5 mr-2" />
                         Start New Design
                     </button>
                </div>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-lg flex items-center justify-between sticky top-0 z-10 border-b border-slate-700 mb-4 shadow-md">
                <p className="font-semibold">{selectedProducts.size} of {stagedProducts.length} selected</p>
                <div className="flex gap-4">
                     <button 
                        onClick={() => handlePublish('Printify')}
                        disabled={isPublishing || selectedProducts.size === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-600 disabled:opacity-50"
                    >
                         {isPublishing ? <SpinnerIcon /> : 'Publish to Printify'}
                    </button>
                    <button
                        onClick={() => handlePublish('Etsy')}
                        disabled={isPublishing || selectedProducts.size === 0}
                        className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:bg-slate-600 disabled:opacity-50"
                    >
                        {isPublishing ? <SpinnerIcon /> : 'Publish to Etsy'}
                    </button>
                </div>
            </div>

            {stagedProducts.length > 0 ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {stagedProducts.map(product => (
                        <StagedProductCard 
                            key={product.id} 
                            product={product}
                            isSelected={selectedProducts.has(product.id)}
                            onToggleSelect={() => handleToggleSelect(product.id)}
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700">
                    <OutboxIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-400">Your Staging Area is Empty</h2>
                    <p className="text-slate-500 mt-2">Complete a product workflow to send items here, ready for publishing.</p>
                    <button 
                        onClick={onStartNew}
                        className="mt-6 text-teal-400 font-bold hover:underline"
                    >
                        Start a new workflow
                    </button>
                </div>
            )}
        </div>
    );
};

export default Staging;
