
// components/ProductSelection.tsx

import React, { useState, useEffect } from 'react';
import { WorkflowState, ProductBlueprint, PrintProvider, AppView } from '../types.ts';
import { fetchPrintifyCatalog } from '../services/printifyService.ts';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SettingsIcon from './icons/SettingsIcon.tsx';

interface ProductSelectionProps {
  workflowState: WorkflowState | null;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  setCurrentView: (view: AppView) => void;
  printifyApiKey: string;
}

const CATEGORIES = ['T-Shirt', 'Hoodie', 'Mug', 'Home & Living', 'Accessory'];

// Helper to determine if a color is dark
const isColorDark = (hexColor: string): boolean => {
    if (!hexColor) return false;
    const color = hexColor.startsWith('#') ? hexColor.substring(1, 7) : hexColor;
    if (color.length < 6) return false;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    // Using the luminance formula
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
};

const BlueprintCard: React.FC<{ blueprint: ProductBlueprint, onSelect: () => void }> = ({ blueprint, onSelect }) => (
    <div 
        className="group bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-teal-500 hover:shadow-xl transition-all duration-300 cursor-pointer"
        onClick={onSelect}
    >
        <div className="h-48 bg-white relative p-4">
             <img src={blueprint.imageUrl} alt={blueprint.name} className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105" />
        </div>
        <div className="p-4">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{blueprint.brand}</span>
                <span className="text-xs bg-teal-500/10 text-teal-400 px-2 py-0.5 rounded font-medium">{blueprint.providers.length} Providers</span>
            </div>
            <h3 className="font-bold text-white mb-1 leading-tight truncate">{blueprint.name}</h3>
            <p className="text-xs text-slate-400 line-clamp-2 mb-3">{blueprint.description}</p>
            <div className="flex items-center text-xs text-slate-400">
                <span className="font-mono text-teal-400">From ${Math.min(...blueprint.providers.map(p => p.itemPrice)).toFixed(2)}</span>
            </div>
        </div>
    </div>
);

const ProviderRow: React.FC<{ 
    provider: PrintProvider, 
    isSelected: boolean, 
    onSelect: () => void 
}> = ({ provider, isSelected, onSelect }) => (
    <tr 
        onClick={onSelect} 
        className={`border-b border-slate-700 cursor-pointer transition-colors ${isSelected ? 'bg-teal-500/10' : 'hover:bg-slate-800'}`}
    >
        <td className="py-4 px-4">
            <div className="flex items-center">
                <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${isSelected ? 'border-teal-500' : 'border-slate-500'}`}>
                    {isSelected && <div className="w-2 h-2 rounded-full bg-teal-500"></div>}
                </div>
                <div>
                    <p className="font-bold text-white">{provider.name}</p>
                    <p className="text-xs text-slate-400">{provider.location}</p>
                </div>
            </div>
        </td>
        <td className="py-4 px-4 text-center">
            <div className="inline-flex items-center px-2 py-1 rounded bg-slate-700/50 text-yellow-400 text-xs font-bold">
                ★ {provider.rating}
            </div>
        </td>
        <td className="py-4 px-4 text-center text-slate-300 text-sm">{provider.avgProductionTime} days</td>
        <td className="py-4 px-4 text-right font-mono text-white">${provider.itemPrice.toFixed(2)}</td>
        <td className="py-4 px-4 text-right font-mono text-slate-400">${provider.shippingPrice.toFixed(2)}</td>
        <td className="py-4 px-4 text-right font-mono text-teal-400 font-bold">
            ${(provider.itemPrice + provider.shippingPrice).toFixed(2)}
        </td>
        <td className="py-4 px-4">
             <div className="flex justify-end -space-x-1">
                {provider.colors.slice(0, 5).map((c, i) => (
                    <div key={i} className="w-4 h-4 rounded-full border border-slate-600" style={{backgroundColor: c}}></div>
                ))}
                {provider.colors.length > 5 && <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[8px] text-white">+{provider.colors.length - 5}</div>}
             </div>
        </td>
    </tr>
);

const ProductSelection: React.FC<ProductSelectionProps> = ({ workflowState, updateWorkflow, setCurrentView, printifyApiKey }) => {
    const [catalog, setCatalog] = useState<ProductBlueprint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // UI State
    const [activeCategory, setActiveCategory] = useState('T-Shirt');
    const [view, setView] = useState<'blueprints' | 'providers'>('blueprints');
    
    // Selection State
    const activeBlueprint = workflowState?.selectedProduct;
    const activeProvider = workflowState?.selectedProvider;

    useEffect(() => {
        const loadCatalog = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // Force cast because mock service returns Blueprints now
                const products = await fetchPrintifyCatalog(printifyApiKey) as unknown as ProductBlueprint[];
                setCatalog(products);
            } catch (e: any) {
                setError(e.message || "An unknown error occurred.");
            } finally {
                setIsLoading(false);
            }
        };
        loadCatalog();
    }, [printifyApiKey]);

    const handleBlueprintSelect = (blueprint: ProductBlueprint) => {
        updateWorkflow({
            selectedProduct: blueprint,
            selectedProvider: null, // Reset provider when blueprint changes
            selectedColors: [],
            selectedLightColors: [],
            selectedDarkColors: [],
        });
        setView('providers');
    };

    const handleProviderSelect = (provider: PrintProvider) => {
        updateWorkflow({ selectedProvider: provider });
    };

    const handleColorToggle = (hex: string) => {
        if (!activeBlueprint || !activeProvider || !workflowState) return;

        const { selectedColors } = workflowState;
        const isDark = isColorDark(hex);
        
        // Find the variant name/color associated with this hex if needed, 
        // for now we just track hexes for simplicity in this demo
        const newColors = selectedColors.includes(hex)
            ? selectedColors.filter(c => c !== hex)
            : [...selectedColors, hex];

        const newLightColors = newColors.filter(c => !isColorDark(c));
        const newDarkColors = newColors.filter(c => isColorDark(c));

        updateWorkflow({ 
            selectedColors: newColors,
            selectedLightColors: newLightColors,
            selectedDarkColors: newDarkColors
        });
    };

    // Render Logic
    if (!workflowState || !workflowState.asset) {
        return (
            <div className="text-center py-20">
                <h1 className="text-3xl font-bold text-white">Product Selection</h1>
                <p className="text-slate-400 mt-2">Please start a workflow by creating or selecting a design first.</p>
            </div>
        );
    }

    if (isLoading) return <div className="text-center py-20"><SpinnerIcon className="mx-auto h-12 w-12 text-teal-500"/><p className="mt-4 text-slate-400">Connecting to Printify...</p></div>;
    if (error) return <div className="text-center p-10 border border-red-500/30 rounded-lg"><SettingsIcon className="mx-auto h-12 w-12 text-red-400"/><p className="mt-2 text-slate-400">{error}</p></div>;

    const filteredBlueprints = catalog.filter(p => p.category === activeCategory);

    return (
        <div className="max-w-7xl mx-auto space-y-6 pb-24">
            {/* Header & Breadcrumbs */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-white">Select Product</h1>
                    <div className="flex items-center text-sm text-slate-400 mt-1 space-x-2">
                         <span className={view === 'blueprints' ? 'text-teal-400 font-bold' : ''}>1. Category</span>
                         <span>&gt;</span>
                         <span className={view === 'providers' ? 'text-teal-400 font-bold' : ''}>2. Provider & Colors</span>
                    </div>
                </div>
                {view === 'providers' && (
                    <button onClick={() => setView('blueprints')} className="text-sm text-slate-400 hover:text-white underline">
                        Change Product
                    </button>
                )}
            </div>

            {/* View 1: Blueprints Catalog */}
            {view === 'blueprints' && (
                <div className="space-y-6 animate-fade-in-down">
                    {/* Category Tabs */}
                    <div className="flex overflow-x-auto space-x-2 pb-2 border-b border-slate-800">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveCategory(cat)}
                                className={`px-5 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-all ${activeCategory === cat ? 'bg-teal-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {filteredBlueprints.map(bp => (
                            <BlueprintCard key={bp.id} blueprint={bp} onSelect={() => handleBlueprintSelect(bp)} />
                        ))}
                    </div>
                </div>
            )}

            {/* View 2: Provider Selection & Details */}
            {view === 'providers' && activeBlueprint && (
                <div className="space-y-8 animate-fade-in-down">
                    <div className="flex gap-6 bg-slate-800 p-6 rounded-xl border border-slate-700">
                        <div className="w-32 h-32 bg-white rounded-lg p-2 shrink-0">
                             <img src={activeBlueprint.imageUrl} className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white">{activeBlueprint.name}</h2>
                            <p className="text-slate-400 mt-1 max-w-2xl">{activeBlueprint.description}</p>
                        </div>
                    </div>

                    <div className="glass-panel rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                            <h3 className="font-bold text-white">Select Print Provider</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="text-xs font-bold text-slate-500 uppercase bg-slate-900 border-b border-slate-700">
                                        <th className="py-3 px-4">Provider</th>
                                        <th className="py-3 px-4 text-center">Rating</th>
                                        <th className="py-3 px-4 text-center">Avg. Time</th>
                                        <th className="py-3 px-4 text-right">Item Price</th>
                                        <th className="py-3 px-4 text-right">Shipping</th>
                                        <th className="py-3 px-4 text-right">Total</th>
                                        <th className="py-3 px-4 text-right">Colors</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeBlueprint.providers.map(provider => (
                                        <ProviderRow 
                                            key={provider.id} 
                                            provider={provider} 
                                            isSelected={activeProvider?.id === provider.id}
                                            onSelect={() => handleProviderSelect(provider)}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Color Selection Area - Only show if provider selected */}
                    {activeProvider && (
                        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                            <h3 className="font-bold text-white mb-4">Select Colors from {activeProvider.name}</h3>
                            <div className="flex flex-wrap gap-3">
                                {activeProvider.colors.map(hex => (
                                    <button
                                        key={hex}
                                        onClick={() => handleColorToggle(hex)}
                                        className={`relative w-12 h-12 rounded-full border-2 transition-all shadow-sm ${workflowState.selectedColors.includes(hex) ? 'border-teal-500 scale-110 ring-2 ring-teal-500/50' : 'border-slate-600 hover:border-slate-400'}`}
                                        style={{ backgroundColor: hex }}
                                        title={hex}
                                    >
                                         {workflowState.selectedColors.includes(hex) && (
                                             <span className="absolute inset-0 flex items-center justify-center">
                                                  <svg className={`w-6 h-6 ${isColorDark(hex) ? 'text-white' : 'text-black'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                             </span>
                                         )}
                                    </button>
                                ))}
                            </div>
                            <div className="mt-4 flex gap-4 text-sm">
                                <div className="flex items-center text-slate-400"><span className="w-3 h-3 rounded-full bg-white mr-2 border border-slate-600"></span> Light: {workflowState.selectedLightColors.length}</div>
                                <div className="flex items-center text-slate-400"><span className="w-3 h-3 rounded-full bg-slate-900 mr-2 border border-slate-600"></span> Dark: {workflowState.selectedDarkColors.length}</div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Footer Controls */}
            {activeBlueprint && activeProvider && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-50 flex justify-between items-center px-8 lg:pl-80">
                     <div className="flex flex-col">
                        <span className="text-xs text-slate-400 uppercase font-bold">Selected</span>
                        <span className="text-white font-medium">{activeBlueprint.name} via {activeProvider.name}</span>
                     </div>
                     <button 
                        onClick={() => setCurrentView('generateMockups')}
                        disabled={workflowState.selectedColors.length === 0}
                        className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded-lg shadow-lg shadow-green-900/30 disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
                    >
                        Next: Generate Mockups →
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProductSelection;
