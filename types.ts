
// types.ts

export type AppView = 
  | 'dashboard' 
  | 'assetLibrary' 
  | 'designStudio' 
  | 'productSelection'
  | 'generateMockups'
  | 'marketingCopy'
  | 'reviewAndPublish'
  | 'trendResearch' 
  | 'analytics' 
  | 'settings'
  | 'staging';

export interface DesignAsset {
  id: number;
  name: string;
  imageUrl: string;
  tags: string[];
  resolution?: { width: number; height: number };
  isPrintReady?: boolean;
}

export interface Job {
  id: number;
  name: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'warning';
  progress?: number;
  details?: string;
}

export interface Trend {
  niche: string;
  description: string;
  opportunityScore: number;
  imageExamples: string[];
  keywords: string[];
}

export interface MarketingCopy {
  title: string;
  description: string;
  tags: string[];
}

export interface AppNotification {
  message: string;
  type: 'success' | 'error';
}

// --- New Catalog Structure ---

export interface CatalogVariant {
    id: number;
    title: string; // e.g., "Red / S"
    color: string;
    hex: string;
    size: string;
}

export interface PrintProvider {
    id: number;
    name: string; // e.g., "Monster Digital"
    location: string; // e.g., "US"
    itemPrice: number;
    shippingPrice: number;
    avgProductionTime: number; // in days
    colors: string[]; // List of available hex codes or names
    rating: number; // 0-5 stars
}

export interface ProductBlueprint {
    id: number;
    name: string; // e.g., "Unisex Jersey Short Sleeve Tee"
    brand: string; // e.g., "Bella+Canvas 3001"
    description: string;
    imageUrl: string;
    category: 'T-Shirt' | 'Hoodie' | 'Mug' | 'Accessory' | 'Home & Living';
    providers: PrintProvider[];
    variants: CatalogVariant[]; // All possible variants for this blueprint
}

// For backward compatibility in some views, 'Product' alias refers to the Blueprint + Selected Provider combo
export interface SelectedProductInfo {
    blueprint: ProductBlueprint;
    provider: PrintProvider;
}

// ---------------------------

export type MockupStyle = 'flatLay' | 'folded' | 'hanging' | 'man' | 'woman' | 'kid';

export interface MockupGenerationParams {
  color: string;
  style: MockupStyle;
}

export interface MockupData {
  url: string;
  params: MockupGenerationParams;
}

export interface StagedProduct {
    id: number;
    designImageUrl: string;
    productName: string;
    providerName: string;
    basePrice: number;
    colors: string[];
    marketingCopy: MarketingCopy;
    mockups: MockupData[];
    videoUrl: string | null;
}

export interface WorkflowState {
  asset: DesignAsset;
  designVariantUrl: string | null;
  
  // Updated to store Blueprint + Provider
  selectedProduct: ProductBlueprint | null; 
  selectedProvider: PrintProvider | null;

  selectedColors: string[];
  selectedLightColors: string[];
  selectedDarkColors: string[];
  
  mockups: {
    light: MockupData[];
    dark: MockupData[];
  };
  
  mockupGenerationConfig?: {
      theme: string;
  };
  
  videoUrls: {
      light: string | null;
      dark: string | null;
  };
  marketingCopy: MarketingCopy | null;
}
