// types.ts

export type AppView = 
  | 'dashboard' 
  | 'assetLibrary' 
  | 'designStudio' 
  | 'currentDesigns'
  | 'productSelection'
  | 'generateMockups'
  | 'marketingCopy'
  | 'reviewAndPublish'
  | 'trendResearch' 
  | 'analytics' 
  | 'settings'
  | 'staging'; // New view for staged products

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

// For Catalog Data
export interface Variant {
  id: number;
  name: string; 
  options: { value: string, hex?: string }[];
}

export interface Provider {
  id: number;
  name: string;
  price: number;
}

export interface Product {
  id: number;
  name: string;
  type: 'T-Shirt' | 'Hoodie' | 'Mug' | 'Accessory' | 'Hat';
  description: string;
  imageUrl: string;
  providers: Provider[];
  variants: Variant[];
}

// For Mockup Generation
export type MockupStyle = 'flatLay' | 'folded' | 'hanging' | 'man' | 'woman' | 'kid';

export interface MockupGenerationParams {
  color: string;
  style: MockupStyle;
}

export interface MockupData {
  url: string;
  params: MockupGenerationParams;
}

// For Staging Area
export interface StagedProduct {
    id: number;
    designImageUrl: string;
    productName: string;
  providerId?: number | string;
  providerName: string;
  variantId?: number | string;
  variantName?: string;
  basePrice: number;
  shipping?: any;
    colors: string[];
    marketingCopy: MarketingCopy;
    mockups: MockupData[];
    videoUrl: string | null;
    sellingPrice?: number;
    totalCost?: number;
}


// For Workflow State Management
export interface WorkflowState {
  asset: DesignAsset;
  designVariantUrl: string | null;
  selectedProduct: Product | null;
  selectedProvider: Provider | null;
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
  // New: Separate video URLs for each package
  videoUrls: {
      light: string | null;
      dark: string | null;
  };
  marketingCopy: MarketingCopy | null;
  // Selected variant (provider-specific variant choice)
  selectedVariant?: {
    id: number | string;
    name: string;
    price?: number;
  } | null;
}
