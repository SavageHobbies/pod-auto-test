// components/ReviewAndPublish.tsx

import React, { useState } from 'react';
import JSZip from 'jszip';
import { WorkflowState, AppView, Job, MockupData, StagedProduct } from '../types.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import DownloadIcon from './icons/DownloadIcon.tsx';
import PencilIcon from './icons/PencilIcon.tsx';
import EditDesignModal from './EditDesignModal.tsx';

interface ReviewAndPublishProps {
  workflowState: WorkflowState | null;
  onStageProducts: (products: StagedProduct[]) => void;
  setCurrentView: (view: AppView) => void;
  showNotification: (message: string, type: 'success' | 'error') => void;
  addJob: (job: Job) => void;
  updateJobStatus: (jobId: number, status: Job['status'], progress?: number, details?: string) => void;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
}

const ProductPackage: React.FC<{
    title: string;
    design: { name: string; url: string; };
    onEdit: () => void;
    productName?: string;
    providerName?: string;
    colors: string[];
    basePrice: number;
        shipping?: any;
    mockups: MockupData[];
    videoUrl: string | null;
    sellingPrice: number;
    onSellingPriceChange: (price: number) => void;
}> = ({ title, design, onEdit, productName, providerName, colors, basePrice, mockups, videoUrl, sellingPrice, onSellingPriceChange }) => {
    const shippingCost = shipping?.price ?? shipping?.cost ?? shipping?.estimate ?? 0;
    const totalCost = (basePrice || 0) + (shippingCost || 0);
    const profit = sellingPrice > 0 ? sellingPrice - totalCost : 0;
    
    return (
        <div className="bg-slate-800 p-6 rounded-lg space-y-6 flex flex-col">
            <h2 className="text-2xl font-semibold text-brand-primary">{title}</h2>
            
            {/* Core Design */}
            <div>
                <h3 className="font-semibold text-slate-300 mb-2">Core Design</h3>
                <div className="checkerboard-bg p-2 rounded-md aspect-square flex items-center justify-center relative group">
                    <img src={design.url} alt={design.name} className="max-w-full max-h-full"/>
                    <button onClick={onEdit} className="absolute top-2 right-2 bg-slate-800/80 hover:bg-brand-primary p-2 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <PencilIcon />
                    </button>
                </div>
            </div>

            {/* Product Info */}
            <div className="space-y-3">
                 <div className="space-y-1 text-sm">
                    <p><span className="font-semibold text-slate-400">Product:</span> {productName}</p>
                    <p><span className="font-semibold text-slate-400">Provider:</span> {providerName}</p>
                    <p><span className="font-semibold text-slate-400">Colors:</span> {colors.join(', ')}</p>
                </div>
                 {/* Pricing */}
                <div className="bg-slate-700 p-4 rounded-md space-y-3">
                    <h4 className="font-semibold text-white">Pricing & Profit</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm items-center">
                        <span className="text-slate-400">Product Cost:</span>
                        <span className="text-white font-mono text-base col-span-2">${basePrice.toFixed(2)}</span>

                        <span className="text-slate-400">Shipping:</span>
                        <span className="text-white font-mono text-base col-span-2">${Number(shippingCost || 0).toFixed(2)}</span>

                        <span className="text-slate-400">Total Cost:</span>
                        <span className="text-white font-mono text-base col-span-2">${Number(totalCost || 0).toFixed(2)}</span>
                        
                        <label htmlFor="selling-price" className="text-slate-400">Selling Price:</label>
                        <div className="relative col-span-2">
                           <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                           <input 
                             type="number"
                             id="selling-price"
                             value={sellingPrice || ''}
                             onChange={e => onSellingPriceChange(parseFloat(e.target.value))}
                             className="w-full bg-slate-800 border border-slate-600 rounded-md pl-6 pr-2 py-1.5 font-mono"
                             placeholder="24.99"
                           />
                        </div>

                        <span className="text-slate-400 font-bold">Est. Profit:</span>
                        <span className={`font-mono text-lg col-span-2 font-bold ${profit > 0 ? 'text-green-400' : 'text-slate-400'}`}>
                           ${profit.toFixed(2)}
                        </span>
                    </div>
                    <p className="text-xs text-slate-500 text-center pt-2">(Profit does not include shipping or platform fees)</p>
                </div>
            </div>
            
            {/* Mockups & Video */}
            <div className="flex-grow">
                <h3 className="font-semibold text-slate-300 mb-2">Generated Assets</h3>
                 <div className="grid grid-cols-3 gap-2">
                    {mockups.map((mockup, i) => (
                        <div key={i} className="relative group aspect-square">
                            <img src={mockup.url} alt={`Mockup ${i+1}`} className="rounded-md w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
                 {videoUrl && (
                    <div className="mt-4">
                        <video src={videoUrl} controls className="w-full rounded-md" />
                    </div>
                )}
            </div>
        </div>
    );
};

const ReviewAndPublish: React.FC<ReviewAndPublishProps> = ({ workflowState, onStageProducts, setCurrentView, showNotification, addJob, updateJobStatus, updateWorkflow }) => {
    const [isStaging, setIsStaging] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [imageToEdit, setImageToEdit] = useState<{url: string; type: 'original' | 'variant'} | null>(null);
    const [sellingPrice, setSellingPrice] = useState(24.99);

    const handleStageProducts = () => {
        if (!workflowState) return;
        setIsStaging(true);
        
        const productsToStage: StagedProduct[] = [];

        const provider = workflowState.selectedProvider;
        const variant = workflowState.selectedVariant;

        const providerId = provider?.id;
        const providerName = provider?.name || 'Unknown Provider';
        const defaultBasePrice = provider?.price ?? (variant?.price ?? 0);

        if (hasLightPackage && workflowState.marketingCopy) {
            productsToStage.push({
                id: Date.now(),
                designImageUrl: workflowState.asset.imageUrl,
                productName: workflowState.selectedProduct?.name || 'Unknown Product',
                providerId,
                providerName,
                variantId: variant?.id,
                variantName: variant?.name,
                basePrice: variant?.price ?? defaultBasePrice,
                shipping: (workflowState as any).shipping || undefined,
                sellingPrice,
                totalCost: (variant?.price ?? defaultBasePrice) + ((workflowState as any).shipping?.price ?? (workflowState as any).shipping?.cost ?? (workflowState as any).shipping?.estimate ?? 0),
                colors: workflowState.selectedLightColors,
                marketingCopy: workflowState.marketingCopy,
                mockups: workflowState.mockups.light,
                videoUrl: workflowState.videoUrls.light
            });
        }
        if (hasDarkPackage && workflowState.designVariantUrl && workflowState.marketingCopy) {
            productsToStage.push({
                id: Date.now() + 1,
                designImageUrl: workflowState.designVariantUrl,
                productName: workflowState.selectedProduct?.name || 'Unknown Product',
                providerId,
                providerName,
                variantId: variant?.id,
                variantName: variant?.name,
                basePrice: variant?.price ?? defaultBasePrice,
                shipping: (workflowState as any).shipping || undefined,
                sellingPrice,
                totalCost: (variant?.price ?? defaultBasePrice) + ((workflowState as any).shipping?.price ?? (workflowState as any).shipping?.cost ?? (workflowState as any).shipping?.estimate ?? 0),
                colors: workflowState.selectedDarkColors,
                marketingCopy: workflowState.marketingCopy,
                mockups: workflowState.mockups.dark,
                videoUrl: workflowState.videoUrls.dark
            });
        }
        
        const jobId = Date.now();
        addJob({ id: jobId, name: `Sending ${productsToStage.length} products to staging`, status: 'processing' });
        setTimeout(() => {
            updateJobStatus(jobId, 'completed');
            setIsStaging(false);
            onStageProducts(productsToStage);
        }, 1500);
    };

    const handleEditClick = (url: string, type: 'original' | 'variant') => {
        setImageToEdit({ url, type });
        setIsEditModalOpen(true);
    };

    const handleSaveEdit = (newUrl: string) => {
        if (!imageToEdit || !workflowState) return;
        const newAsset = { ...workflowState.asset, imageUrl: imageToEdit.type === 'original' ? newUrl : workflowState.asset.imageUrl };
        updateWorkflow({ 
            asset: newAsset,
            designVariantUrl: imageToEdit.type === 'variant' ? newUrl : workflowState.designVariantUrl
        });
        setIsEditModalOpen(false);
        setImageToEdit(null);
        showNotification('Design updated. Re-generate mockups to see changes.', 'success');
    };

    const handleDownloadAll = async () => {
        if (!workflowState) return;
        setIsZipping(true);
        const jobId = Date.now();
        addJob({ id: jobId, name: `Zipping assets`, status: 'processing' });
        try {
            const zip = new JSZip();
            const fetchAndAdd = async (url: string, name: string) => zip.file(name, fetch(url).then(r => r.blob()));

            const marketingContent = `Title: ${workflowState.marketingCopy?.title}\n\nDescription: ${workflowState.marketingCopy?.description}\n\nTags: ${workflowState.marketingCopy?.tags.join(', ')}`;
            zip.file('marketing.txt', marketingContent);

            if (workflowState.mockups.light.length > 0) {
                const lightFolder = zip.folder('light_garment_assets')!;
                await fetchAndAdd(workflowState.asset.imageUrl, 'light_garment_assets/design_original.png');
                for (let i = 0; i < workflowState.mockups.light.length; i++) {
                    await fetchAndAdd(workflowState.mockups.light[i].url, `light_garment_assets/mockup_${i + 1}.png`);
                }
                if (workflowState.videoUrls.light) await fetchAndAdd(workflowState.videoUrls.light, `light_garment_assets/video_ad.mp4`);
            }
            if (workflowState.mockups.dark.length > 0 && workflowState.designVariantUrl) {
                const darkFolder = zip.folder('dark_garment_assets')!;
                await fetchAndAdd(workflowState.designVariantUrl, 'dark_garment_assets/design_light_variant.png');
                for (let i = 0; i < workflowState.mockups.dark.length; i++) {
                    await fetchAndAdd(workflowState.mockups.dark[i].url, `dark_garment_assets/mockup_${i + 1}.png`);
                }
                if (workflowState.videoUrls.dark) await fetchAndAdd(workflowState.videoUrls.dark, `dark_garment_assets/video_ad.mp4`);
            }
            
            const content = await zip.generateAsync({ type: 'blob' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${workflowState.asset.name}_assets.zip`;
            link.click();
            URL.revokeObjectURL(link.href);
            updateJobStatus(jobId, 'completed');
            showNotification('Assets zipped and downloaded!', 'success');
        } catch (error) {
            showNotification('Failed to download assets.', 'error');
            updateJobStatus(jobId, 'failed');
        } finally {
            setIsZipping(false);
        }
    };

    if (!workflowState || !workflowState.marketingCopy) {
        return <div className="text-center"><p>Complete previous steps to review.</p></div>;
    }
    
    const hasLightPackage = workflowState.mockups.light.length > 0;
    const hasDarkPackage = workflowState.mockups.dark.length > 0;
    const basePrice = workflowState.selectedProvider?.price ?? 0;
    const shippingInfo = (workflowState as any).shipping;

    return (
        <>
        {isEditModalOpen && imageToEdit && (
            <EditDesignModal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} imageUrl={imageToEdit.url} onSave={handleSaveEdit} addJob={addJob} updateJobStatus={updateJobStatus}/>
        )}
        <div className="max-w-7xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white text-center">5. Review & Publish</h1>
            
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                 {hasLightPackage && (
                     <ProductPackage 
                         title="Package 1: Light Garments"
                         design={{ name: "Original Design", url: workflowState.asset.imageUrl }}
                         onEdit={() => handleEditClick(workflowState.asset.imageUrl, 'original')}
                         productName={workflowState.selectedProduct?.name}
                         providerName={workflowState.selectedProvider?.name}
                         colors={workflowState.selectedLightColors}
                         basePrice={basePrice}
                            mockups={workflowState.mockups.light}
                            shipping={shippingInfo}
                         videoUrl={workflowState.videoUrls.light}
                         sellingPrice={sellingPrice}
                         onSellingPriceChange={setSellingPrice}
                     />
                 )}
                 {hasDarkPackage && workflowState.designVariantUrl && (
                      <ProductPackage 
                         title="Package 2: Dark Garments"
                         design={{ name: "Light Variant", url: workflowState.designVariantUrl }}
                         onEdit={() => handleEditClick(workflowState.designVariantUrl!, 'variant')}
                         productName={workflowState.selectedProduct?.name}
                         providerName={workflowState.selectedProvider?.name}
                         colors={workflowState.selectedDarkColors}
                         basePrice={basePrice}
                            mockups={workflowState.mockups.dark}
                            shipping={shippingInfo}
                         videoUrl={workflowState.videoUrls.dark}
                         sellingPrice={sellingPrice}
                         onSellingPriceChange={setSellingPrice}
                     />
                 )}
            </div>
            
            <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                 <h2 className="text-2xl font-semibold">Shared Marketing & Final Actions</h2>
                 <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white">{workflowState.marketingCopy.title}</h4>
                    <p className="text-slate-400">{workflowState.marketingCopy.description}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                        {workflowState.marketingCopy.tags.map(tag => (
                            <span key={tag} className="text-xs bg-slate-700 px-2 py-1 rounded">{tag}</span>
                        ))}
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-700">
                     <button onClick={handleDownloadAll} disabled={isZipping} className="w-full max-w-sm mx-auto bg-slate-600 hover:bg-slate-500 font-bold py-2 px-4 rounded-md flex items-center justify-center disabled:bg-slate-700">
                         {isZipping ? <SpinnerIcon/> : <DownloadIcon/>} <span className="ml-2">Download All Assets (.zip)</span>
                    </button>
                </div>
            </div>
            
             <div className="flex justify-between items-center mt-8">
                 <button onClick={() => setCurrentView('marketingCopy')} className="bg-slate-600 hover:bg-slate-700 font-bold py-3 px-8 rounded-lg text-lg">Back</button>
                <button onClick={handleStageProducts} disabled={isStaging} className="bg-brand-primary hover:bg-brand-secondary font-bold py-4 px-10 rounded-lg text-xl disabled:bg-slate-600">
                    {isStaging ? <SpinnerIcon /> : 'Send to Staging'}
                </button>
            </div>
        </div>
        </>
    );
};

export default ReviewAndPublish;
