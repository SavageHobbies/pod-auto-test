// components/ProductSelection.tsx

import React, { useState, useEffect } from 'react';
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

const ProductSelection: React.FC<ProductSelectionProps> = ({ workflowState, updateWorkflow, setCurrentView }) => {
    const [showDarkColorInfo, setShowDarkColorInfo] = useState(false);
    const [products, setProducts] = useState<Product[]>(productCatalog);
    const [loadingProducts, setLoadingProducts] = useState(false);
        const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        // Try to fetch Printify products via server if API key is saved (initial attempt)
        const key = localStorage.getItem('printifyApiKey');
        if (key) {
            fetchPrintifyProducts(key);
        }
        const onConnected = () => {
            const k = localStorage.getItem('printifyApiKey') || '';
            if (k) fetchPrintifyProducts(k);
        };
        window.addEventListener('printify:connected', onConnected);
        return () => window.removeEventListener('printify:connected', onConnected);
    }, []);

    const [printifyError, setPrintifyError] = useState<string | null>(null);

    const fetchPrintifyProducts = async (key: string) => {
        setLoadingProducts(true);
        setPrintifyError(null);
        try {
            const res = await fetch('/api/printify/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }) });
            if (!res.ok) {
                const text = await res.text();
                setPrintifyError(`Server responded ${res.status}: ${text}`);
                setProducts(productCatalog);
                return;
            }
            const data = await res.json();
            if (data?.ok && Array.isArray(data.body)) {
                const grouped: Record<string, any> = {};
                data.body.forEach((entry: any) => {
                    const p = entry.product;
                    const key = p.id || `${p.title}-${p.handle}`;
                    if (!grouped[key]) {
                        grouped[key] = {
                            id: p.id || key,
                            name: p.title || p.name || 'Untitled',
                            description: p.description || '',
                            imageUrl: p.images?.[0]?.src || 'https://via.placeholder.com/400x300?text=No+Image',
                            providers: [],
                            variants: p.variants?.map((v: any) => ({ name: v.name, options: v.options?.map((o: any) => ({ value: o.name, hex: o.hex })) })) || [],
                        };
                    }
                    grouped[key].providers.push({ shopId: entry.shopId, shopName: entry.shopName, productId: p.id, price: p.variants?.[0]?.price });
                });
                const mapped = Object.values(grouped).slice(0, 200) as Product[]; // limit
                if (Array.isArray(mapped) && mapped.length > 0) setProducts(mapped);
                else {
                    setProducts(productCatalog);
                    setPrintifyError('Printify returned no products (using local catalog)');
                }
            } else {
                setProducts(productCatalog);
                setPrintifyError(data?.message || 'No products returned from Printify');
            }
        } catch (e: any) {
            console.error('fetchPrintifyProducts error', e);
            setProducts(productCatalog);
            setPrintifyError(e?.message || String(e));
        } finally {
            setLoadingProducts(false);
        }
    };
    const selectedProduct = workflowState?.selectedProduct;

    // Default categories (fallback)
    const defaultCategories = [
        { id: 'all', label: 'All' },
        { id: 'tshirt', label: 'T-Shirts' },
        { id: 'hoodie', label: 'Hoodies' },
        { id: 'mug', label: 'Mugs' },
        { id: 'rug', label: 'Rugs' },
        { id: 'blanket', label: 'Blankets' },
        { id: 'flag', label: 'Flags' },
        { id: 'accessory', label: 'Accessories' },
    ];
    const [categories, setCategories] = useState(defaultCategories);

    useEffect(() => {
        const key = localStorage.getItem('printifyApiKey') || '';
        if (!key) return;
        (async () => {
            try {
                const res = await fetch('/api/printify/categories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key }) });
                const data = await res.json();
                if (data?.ok && Array.isArray(data.categories)) {
                    const mapped = [{ id: 'all', label: 'All' }, ...data.categories.map((c: string) => ({ id: c.toLowerCase().replace(/\s+/g, '-'), label: c }))];
                    setCategories(mapped);
                }
            } catch (e) {
                // ignore and keep defaults
            }
        })();
    }, []);

    const inferType = (p: Product) => {
        const text = `${p.name} ${p.description}`.toLowerCase();
        if (text.includes('mug')) return 'Mug';
        if (text.includes('hoodie') || text.includes('sweatshirt')) return 'Hoodie';
        if (text.includes('blanket')) return 'Blanket';
        if (text.includes('rug')) return 'Rug';
        if (text.includes('flag')) return 'Flag';
        if (text.includes('t-shirt') || text.includes('t shirt') || text.includes('tee')) return 'T-Shirt';
        return 'Accessory';
    };

    const filteredProducts = selectedCategory === 'all' ? products : products.filter(p => {
        const inferred = inferType(p).toLowerCase();
        return inferred.includes(selectedCategory);
    });

    const handleProductSelect = (product: Product) => {
        const defaultProvider = product.providers[0];
        updateWorkflow({
            selectedProduct: product,
            selectedProvider: defaultProvider,
            selectedColors: [],
            selectedLightColors: [],
            selectedDarkColors: [],
        });
        setShowDarkColorInfo(false);
    };

    const [productDetails, setProductDetails] = useState<any | null>(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    // When selectedProduct changes, try to fetch provider/variant details if product has providers with shopId
    useEffect(() => {
        const prod = workflowState?.selectedProduct;
        if (!prod) { setProductDetails(null); return; }
        // If product has providers with shopId, call server for product details
        const shopProvider = prod.providers?.find((p: any) => p.shopId || p.id?.toString().startsWith('pf-'));
        if (!shopProvider) { setProductDetails(null); return; }
        // try to fetch details using the first provider
        const apiKey = localStorage.getItem('printifyApiKey') || '';
        if (!apiKey) { setProductDetails(null); return; }
        setDetailsLoading(true);
        (async () => {
            try {
                const res = await fetch('/api/printify/product-details', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey, shopId: shopProvider.shopId || shopProvider.id, productId: shopProvider.productId || prod.id }) });
                const data = await res.json();
                if (data?.ok) {
                    setProductDetails(data.body);
                } else {
                    setProductDetails(null);
                }
            } catch (e) {
                setProductDetails(null);
            } finally {
                setDetailsLoading(false);
            }
        })();
    }, [workflowState?.selectedProduct]);
    
    const handleColorToggle = (colorValue: string, hex?: string) => {
        if (!selectedProduct || !workflowState) return;

        const { selectedColors, selectedLightColors, selectedDarkColors } = workflowState;
        
        const isDark = hex ? isColorDark(hex) : false;
        
        const newColors = selectedColors.includes(colorValue)
            ? selectedColors.filter(c => c !== colorValue)
            : [...selectedColors, colorValue];

        const newLightColors = newColors.filter(c => {
            const option = selectedProduct.variants.find(v => v.name === 'Color')?.options.find(o => o.value === c);
            return option?.hex ? !isColorDark(option.hex) : true;
        });
        
        const newDarkColors = newColors.filter(c => {
            const option = selectedProduct.variants.find(v => v.name === 'Color')?.options.find(o => o.value === c);
            return option?.hex ? isColorDark(option.hex) : false;
        });

        if (isDark && !selectedColors.includes(colorValue)) {
            setShowDarkColorInfo(true);
        }

        updateWorkflow({ 
            selectedColors: newColors,
            selectedLightColors: newLightColors,
            selectedDarkColors: newDarkColors
        });
    };

    // Allow visiting product selection without an active workflow
    // If there's no workflowState, user can still pick products; updateWorkflow will create a workflow when needed.

    useEffect(() => {
        try { localStorage.setItem('lastProductList', JSON.stringify(products.map(p => ({ id: p.id, name: p.name, imageUrl: p.imageUrl || '' })))); } catch (e) {}
    }, [products]);

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-white text-center">Uploaded Designs</h1>
            {/* Quick status: product count and source */}
            <div className="flex items-center justify-center text-sm text-slate-400 mt-2">
                {products.length === 0 ? (
                    <div>No products available. Try adding your Printify API key in Settings or use the local catalog.</div>
                ) : (
                    <div>Showing <b className="text-white">{products.length}</b> product(s) {localStorage.getItem('printifyApiKey') ? '(from Printify or local fallback)' : '(local catalog)'}</div>
                )}
            </div>
            <div className="flex items-center justify-center mt-3 gap-3">
                <div className="text-sm text-slate-300 mr-2">Filter by category:</div>
                <div className="flex gap-2">
                    {categories.map(c => (
                        <button key={c.id} onClick={() => setSelectedCategory(c.id)} className={`text-sm px-3 py-1 rounded-md ${selectedCategory === c.id ? 'bg-brand-primary text-white' : 'bg-slate-700 text-white'}`}>
                            {c.label}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex justify-center mt-2">
                <button
                    onClick={() => {
                        const key = localStorage.getItem('printifyApiKey') || '';
                        if (!key) return alert('Please save your Printify API key in Settings first.');
                        fetchPrintifyProducts(key);
                    }}
                    className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md"
                >
                    Load from Printify
                </button>
            </div>
            {printifyError && <div className="text-center text-xs text-red-400 mt-2">{printifyError}</div>}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loadingProducts ? (
                    <div className="col-span-full text-center text-slate-400">Loading products from Printify...</div>
                ) : (
                    filteredProducts.map(product => (
                        <div key={product.id}>
                            <div className="text-xs text-slate-400 mb-1">{inferType(product)}</div>
                            <ProductCard
                                product={product}
                                onSelect={() => handleProductSelect(product)}
                                isSelected={selectedProduct?.id === product.id}
                            />
                        </div>
                    ))
                )}
            </div>

            {/* Accessibility / debug fallback: simple list of product names (click to select) */}
            {products.length > 0 && (
                <div className="mt-6 bg-slate-800 p-4 rounded-md">
                    <h3 className="text-sm font-semibold text-slate-300 mb-2">Quick List</h3>
                    <ul className="text-sm text-slate-400 space-y-1">
                        {products.map(p => (
                            <li key={p.id}>
                                <button className="text-left text-slate-200 hover:underline" onClick={() => handleProductSelect(p)}>{p.name} — {p.type}</button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {selectedProduct && (
                <div className="bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Select Colors for <span className="text-brand-primary">{selectedProduct.name}</span></h2>
                    {showDarkColorInfo && (
                        <div className="bg-slate-700 border border-slate-600 text-slate-300 text-sm rounded-md p-3 mb-4">
                            <b>Note:</b> For dark-colored products, we'll automatically generate a light-colored (inverted) version of your design to ensure it's visible.
                        </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                        {selectedProduct.variants.find(v => v.name === 'Color')?.options.map(option => (
                            <button
                                key={option.value}
                                onClick={() => handleColorToggle(option.value, option.hex)}
                                className={`h-12 w-12 rounded-full border-2 transition-all duration-200 ${workflowState.selectedColors.includes(option.value) ? 'border-brand-primary scale-110 ring-2 ring-brand-primary' : 'border-slate-500'}`}
                                style={{ backgroundColor: option.hex || 'transparent' }}
                                title={option.value}
                            />
                        ))}
                    </div>
                </div>
            )}

            {selectedProduct && (
                <div className="bg-slate-800 p-6 rounded-lg mt-6">
                    <h3 className="text-lg font-semibold mb-3">Providers & Variants</h3>
                    {detailsLoading && <div className="text-slate-400">Loading provider details...</div>}
                    {!detailsLoading && productDetails && (
                        <div>
                            <p className="text-slate-300 mb-2">Available from:</p>
                            <ul className="space-y-3">
                                {productDetails.providers?.map((prov: any, idx: number) => (
                                    <li key={idx} className="p-3 bg-slate-700 rounded-md">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-white">{prov.shopName || prov.name}</div>
                                                <div className="text-xs text-slate-400">Base price: {prov.price ? `$${prov.price}` : 'N/A'}</div>
                                            </div>
                                            <div>
                                                <button
                                                    onClick={() => {
                                                        // select this provider
                                                            updateWorkflow({ 
                                                                selectedProvider: { id: prov.shopId || prov.id, name: prov.shopName || prov.name, price: prov.price || 0 },
                                                                // if provider exposes a default variant price/choice, set selectedVariant
                                                                selectedVariant: prov.selectedVariant ? { id: prov.selectedVariant.id, name: prov.selectedVariant.name, price: prov.selectedVariant.price } : undefined,
                                                                // attach shipping info if available
                                                                ...(prov.shipping ? { shipping: prov.shipping } : {})
                                                            });
                                                    }}
                                                    className="bg-brand-primary text-white px-3 py-1 rounded-md"
                                                >
                                                    Select Provider
                                                </button>
                                            </div>
                                        </div>
                                        {prov.variants && (
                                            <div className="mt-3 text-sm text-slate-300">
                                                <div className="mb-2">Variants:</div>
                                                <div className="flex flex-wrap gap-2">
                                                    {prov.variants.map((v: any, vi: number) => (
                                                        <div key={vi} className="px-2 py-1 bg-slate-600 rounded-md">
                                                            <button
                                                                className="text-left"
                                                                onClick={() => {
                                                                    // select this provider and variant
                                                                    updateWorkflow({
                                                                        selectedProvider: { id: prov.shopId || prov.id, name: prov.shopName || prov.name, price: prov.price || 0 },
                                                                        selectedVariant: { id: v.id || v.sku || v.option_id || vi, name: v.name, price: v.price || prov.price || 0 },
                                                                        ...(prov.shipping ? { shipping: prov.shipping } : {})
                                                                    });
                                                                }}
                                                            >
                                                                {v.name}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {!detailsLoading && !productDetails && (
                        <div className="text-slate-400">Provider/variant details are not available for this product.</div>
                    )}
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
