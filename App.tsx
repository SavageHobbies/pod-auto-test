
import React, { useState, useCallback, useEffect } from 'react';
import { AppView, DesignAsset, Job, WorkflowState, AppNotification, StagedProduct } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import AssetLibrary from './components/AssetLibrary.tsx';
import TrendResearch from './components/TrendResearch.tsx';
import JobStatusPanel from './components/JobStatusPanel.tsx';
import DesignStudio from './components/DesignStudio.tsx';
import ProductSelection from './components/ProductSelection.tsx';
import GenerateMockups from './components/Mockups.tsx';
import MarketingGenerator from './components/MarketingGenerator.tsx';
import ReviewAndPublish from './components/ReviewAndPublish.tsx';
import Analytics from './components/Analytics.tsx';
import Settings from './components/Settings.tsx';
import Notification from './components/Notification.tsx';
import Staging from './components/Staging.tsx';

// Key for sessionStorage
const SESSION_STORAGE_KEY = 'podAutomateWorkflowState';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [assets, setAssets] = useState<DesignAsset[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [stagedProducts, setStagedProducts] = useState<StagedProduct[]>([]);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const [printifyApiKey, setPrintifyApiKey] = useState<string>('');
  
  // New state to pass research data to design studio
  const [initialDesignPrompt, setInitialDesignPrompt] = useState<string>('');

  // Load state from sessionStorage on initial render
  useEffect(() => {
    try {
      const savedStateJSON = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (savedStateJSON) {
        const savedState = JSON.parse(savedStateJSON);
        setCurrentView(savedState.currentView || 'dashboard');
        setAssets(savedState.assets || []);
        setJobs(savedState.jobs || []);
        setWorkflowState(savedState.workflowState || null);
        setStagedProducts(savedState.stagedProducts || []);
        setPrintifyApiKey(savedState.printifyApiKey || '');
      }
    } catch (error) {
      console.error("Could not load state from sessionStorage", error);
    }
  }, []);

  // Save state to sessionStorage whenever it changes
  useEffect(() => {
    const stateToSave = {
        currentView,
        assets,
        jobs,
        workflowState,
        stagedProducts,
        printifyApiKey
    };

    try {
      const stringifiedState = JSON.stringify(stateToSave);
      sessionStorage.setItem(SESSION_STORAGE_KEY, stringifiedState);
    } catch (error: any) {
      // Handle Quota Exceeded
      if (error.name === 'QuotaExceededError' || error.code === 22 || error.message?.includes('quota')) {
          console.warn("Session storage quota exceeded. Attempting aggressive cleanup.");
          
          try {
              // Aggressive Cleanup Strategy:
              // 1. Keep only the currently active asset in the library (drop history)
              // 2. Clear job history entirely
              // 3. Clear cached mockups in workflow (urls are large base64 strings)
              // 4. Clear staged products (unfortunately necessary to save the session)
              
              const activeAssetId = workflowState?.asset?.id;
              const minimalAssets = activeAssetId ? assets.filter(a => a.id === activeAssetId) : [];

              const minimalState = {
                  currentView,
                  assets: minimalAssets, 
                  jobs: [], 
                  workflowState: workflowState ? {
                      ...workflowState,
                      mockups: { light: [], dark: [] }, // Drop generated mockups
                      videoUrls: { light: null, dark: null }, // Drop videos
                  } : null,
                  stagedProducts: [], // Drop staged products to free up massive space
                  printifyApiKey
              };
              
              sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(minimalState));
              console.log("State saved with minimal data to prevent crash.");
          } catch (retryError) {
              console.error("Storage completely full. State persistence disabled for this session.");
              // If we absolutely can't save, we just swallow the error to prevent app crash
              // Optionally, we could try sessionStorage.clear() here, but that might be too destructive during a session.
          }
      } else {
        console.error("Could not save state to sessionStorage", error);
      }
    }
  }, [currentView, assets, jobs, workflowState, stagedProducts, printifyApiKey]);


  const addAsset = useCallback((asset: DesignAsset) => {
    setAssets(prev => {
        // Check if duplicate by ID or similar name to avoid spamming
        if (prev.some(a => a.id === asset.id)) return prev;
        return [...prev, asset];
    });
  }, []);
  
  const addJob = useCallback((job: Job) => {
    setJobs(prev => [job, ...prev]);
  }, []);

  const updateJobStatus = useCallback((jobId: number, status: Job['status'], progress?: number, details?: string) => {
    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status, progress: progress ?? j.progress, details: details ?? j.details } : j));
  }, []);

  const showNotification = useCallback((message: string, type: AppNotification['type']) => {
      setNotification({ message, type });
  }, []);

  const startWorkflow = useCallback((asset: DesignAsset) => {
    setAssets(prev => prev.find(a => a.id === asset.id) ? prev : [...prev, asset]);
    
    setWorkflowState({
        asset: asset,
        designVariantUrl: null,
        selectedProduct: null,
        selectedProvider: null,
        selectedColors: [],
        selectedLightColors: [],
        selectedDarkColors: [],
        mockups: { light: [], dark: [] },
        videoUrls: { light: null, dark: null },
        marketingCopy: null,
    });
    
    setCurrentView('productSelection');
  }, []);

  const clearWorkflow = useCallback(() => {
      setWorkflowState(null);
      setCurrentView('designStudio');
  }, []);

  const updateWorkflow = useCallback((updates: Partial<WorkflowState>) => {
    setWorkflowState(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const onAssetSelect = useCallback((asset: DesignAsset) => {
    startWorkflow(asset);
  }, [startWorkflow]);

  const onStageProducts = useCallback((products: StagedProduct[]) => {
      setStagedProducts(prev => [...prev, ...products]);
      // DO NOT clear workflow state here to allow user to go back and edit
      setCurrentView('staging');
      showNotification(`${products.length} product(s) sent to staging!`, 'success');
  }, [showNotification]);

  // Bridge function to take a trend prompt and start the design process
  const handleUseTrend = useCallback((prompt: string) => {
      setInitialDesignPrompt(prompt);
      setCurrentView('designStudio');
  }, []);


  const renderView = () => {
    switch(currentView) {
      case 'dashboard': return <Dashboard assets={assets} jobs={jobs} setCurrentView={setCurrentView} />;
      case 'assetLibrary': return <AssetLibrary assets={assets} addAsset={addAsset} addJob={addJob} updateJobStatus={updateJobStatus} onAssetSelect={onAssetSelect} />;
      case 'designStudio': 
        return <DesignStudio 
            startWorkflow={startWorkflow} 
            addJob={addJob} 
            updateJobStatus={updateJobStatus} 
            initialPrompt={initialDesignPrompt} // Pass the prompt
        />;
      case 'productSelection': return <ProductSelection workflowState={workflowState} updateWorkflow={updateWorkflow} setCurrentView={setCurrentView} printifyApiKey={printifyApiKey} />;
      case 'generateMockups': return <GenerateMockups workflowState={workflowState} updateWorkflow={updateWorkflow} setCurrentView={setCurrentView} addJob={addJob} updateJobStatus={updateJobStatus} addAsset={addAsset} />;
      case 'marketingCopy': return <MarketingGenerator workflowState={workflowState} updateWorkflow={updateWorkflow} setCurrentView={setCurrentView} addJob={addJob} updateJobStatus={updateJobStatus} />;
      case 'reviewAndPublish': return <ReviewAndPublish workflowState={workflowState} onStageProducts={onStageProducts} setCurrentView={setCurrentView} showNotification={showNotification} addJob={addJob} updateJobStatus={updateJobStatus} updateWorkflow={updateWorkflow} />;
      case 'trendResearch': return <TrendResearch onUseTrend={handleUseTrend} />;
      case 'analytics': return <Analytics />;
      case 'settings': return <Settings apiKey={printifyApiKey} setApiKey={setPrintifyApiKey} />;
      case 'staging': return <Staging stagedProducts={stagedProducts} showNotification={showNotification} onStartNew={clearWorkflow} onBackToWorkflow={() => setCurrentView('reviewAndPublish')} />;
      default: return <div className="text-center text-slate-400">View not implemented.</div>;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <div className="flex h-screen">
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} workflowState={workflowState} />
        <main className="flex-1 p-8 overflow-y-auto scroll-smooth">
          {renderView()}
        </main>
        <JobStatusPanel jobs={jobs} />
      </div>
    </div>
  );
}

export default App;
