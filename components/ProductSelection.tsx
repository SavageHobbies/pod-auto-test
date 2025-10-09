import React from 'react';
import { WorkflowState, Product, AppView } from '../types.ts';
import { productCatalog } from '../data/catalog.ts';

interface ProductSelectionProps {
  workflowState: WorkflowState | null;
  updateWorkflow: (updates: Partial<WorkflowState>) => void;
  setCurrentView: (view: AppView) => void;
}

const ProductCard: React.FC<{ product: Product, onSelect: () => void, isSelected: boolean }> = ({ product, onSelect, isSelected }) => (
    <div 
        className={`bg-slate-800 rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer ${isSelected ? 'border-brand-primary ring-2 ring-brand-primary' : 'border-slate-700 hover:border-slate-600'}`}
        onClick={onSelect}
    >
        <img src={product.imageUrl} alt={product.name} className="w-full h-48 object-cover rounded-md bg-white" />
        <h3 className="font-bold text-lg mt-3 text-white">{product.name}</h3>
        <p className="text-sm text-slate-400">{product.description}</p>
    </div>
);

const ProductSelection: React.FC<ProductSelectionProps> = ({ workflowState, updateWorkflow, setCurrentView }) => {
    const selectedProduct = workflowState?.selectedProduct;

    const handleProductSelect = (product: Product) => {
        const defaultProvider = product.providers[0];
        updateWorkflow({
            selectedProduct: product,
            selectedProvider: defaultProvider,
            selectedColors: [],
        });
    };
    
    const handleColorToggle = (colorValue: string) => {
        if (!selectedProduct) return;
        const currentColors = workflowState?.selectedColors || [];
        const newColors = currentColors.includes(colorValue)
            ? currentColors.filter(c => c !== colorValue)
            : [...currentColors, colorValue];
        updateWorkflow({ selectedColors: newColors });
    };

    if (!workflowState || !workflowState.asset) {
        return (
            <div className="text-center">
                <h1 className="text-3xl font-bold text-white">Product Selection</h1>
                <p className="text-slate-400 mt-2">Please start a workflow by creating or selecting a design first.</p>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white text-center">2. Select a Product for Your Design</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {productCatalog.map(product => (
                    <ProductCard
                        key={product.id}
                        product={product}
                        onSelect={() => handleProductSelect(product)}
                        isSelected={selectedProduct?.id === product.id}
                    />
                ))}
            </div>

            {selectedProduct && (
                <div className="bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Select Colors for <span className="text-brand-primary">{selectedProduct.name}</span></h2>
                    <div className="flex flex-wrap gap-3">
                        {selectedProduct.variants.find(v => v.name === 'Color')?.options.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleColorToggle(option.value)}
                                className={`h-12 w-12 rounded-full border-2 transition-all duration-200 ${workflowState.selectedColors.includes(option.value) ? 'border-brand-primary scale-110 ring-2 ring-brand-primary' : 'border-slate-500'}`}
                                style={{ backgroundColor: option.hex || 'transparent' }}
                                title={option.value}
                            />
                        ))}
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center mt-8">
                <button 
                    onClick={() => setCurrentView('designStudio')}
                    className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-3 px-8 rounded-lg text-lg">
                    Back
                </button>
                <button 
                    onClick={() => setCurrentView('generateMockups')}
                    disabled={!selectedProduct || workflowState.selectedColors.length === 0}
                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg disabled:bg-slate-600 disabled:cursor-not-allowed">
                    Continue to Mockups
                </button>
            </div>
        </div>
    );
};

export default ProductSelection;