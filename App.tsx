
import React, { useState, useCallback } from 'react';
import { AppView, DesignAsset, Job, WorkflowState, AppNotification } from './types.ts';

import Sidebar from './components/Sidebar.tsx';
import Dashboard from './components/Dashboard.tsx';
import AssetLibrary from './components/AssetLibrary.tsx';
import DesignStudio from './components/DesignStudio.tsx';
import TrendResearch from './components/TrendResearch.tsx';
import MarketingGenerator from './components/MarketingGenerator.tsx';
import ProductSelection from './components/ProductSelection.tsx';
import GenerateMockups from './components/Mockups.tsx';
import ReviewAndPublish from './components/ReviewAndPublish.tsx';
import Analytics from './components/Analytics.tsx';
import Settings from './components/Settings.tsx';
import JobStatusPanel from './components/JobStatusPanel.tsx';
import Notification from './components/Notification.tsx';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<AppView>('dashboard');
    const [assets, setAssets] = useState<DesignAsset[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);
    const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
    const [notification, setNotification] = useState<AppNotification | null>(null);

    const showNotification = useCallback((message: string, type: 'success' | 'error') => {
        setNotification({ message, type });
    }, []);

    const addAsset = useCallback((newAsset: DesignAsset) => {
        setAssets(prev => [newAsset, ...prev]);
        showNotification(`Asset "${newAsset.name}" added to library.`, 'success');
    }, [showNotification]);

    const addJob = useCallback((job: Job) => {
        setJobs(prev => [job, ...prev.slice(0, 49)]);
    }, []);

    const updateJobStatus = useCallback((jobId: number, status: Job['status'], progress?: number, details?: string) => {
        setJobs(prev => prev.map(job =>
            job.id === jobId ? { ...job, status, progress: progress ?? job.progress, details: details ?? job.details } : job
        ));
    }, []);

    const startWorkflow = useCallback((asset: DesignAsset) => {
        setWorkflowState({
            asset: asset,
            designVariantUrl: null,
            selectedProduct: null,
            selectedProvider: null,
            selectedColors: [],
            mockups: [],
            mockupGenerationConfig: undefined,
            videoUrl: null,
            marketingCopy: null,
        });
        if (!assets.some(a => a.id === asset.id)) {
            addAsset(asset);
        }
        setCurrentView('productSelection');
    }, [addAsset, assets]);

    const updateWorkflow = useCallback((updates: Partial<WorkflowState>) => {
        setWorkflowState(prev => (prev ? { ...prev, ...updates } : null));
    }, []);

    const resetWorkflow = useCallback(() => {
        setWorkflowState(null);
        setCurrentView('dashboard');
    }, []);
    
    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <Dashboard assets={assets} jobs={jobs} setCurrentView={setCurrentView} />;
            case 'assetLibrary':
                return <AssetLibrary assets={assets} addAsset={addAsset} addJob={addJob} updateJobStatus={updateJobStatus} onAssetSelect={(asset) => startWorkflow(asset)} />;
            case 'designStudio':
                return <DesignStudio startWorkflow={startWorkflow} addJob={addJob} updateJobStatus={updateJobStatus} />;
            case 'trendResearch':
                return <TrendResearch />;
            case 'productSelection':
                 return <ProductSelection workflowState={workflowState} updateWorkflow={updateWorkflow} setCurrentView={setCurrentView} />;
            case 'generateMockups':
                return <GenerateMockups workflowState={workflowState} updateWorkflow={updateWorkflow} setCurrentView={setCurrentView} addJob={addJob} updateJobStatus={updateJobStatus} />;
            case 'marketingCopy':
                return <MarketingGenerator workflowState={workflowState} updateWorkflow={updateWorkflow} setCurrentView={setCurrentView} addJob={addJob} updateJobStatus={updateJobStatus} />;
            case 'reviewAndPublish':
                return <ReviewAndPublish workflowState={workflowState} onPublish={resetWorkflow} showNotification={showNotification} addJob={addJob} updateJobStatus={updateJobStatus} setCurrentView={setCurrentView} updateWorkflow={updateWorkflow} />;
            case 'analytics':
                return <Analytics />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard assets={assets} jobs={jobs} setCurrentView={setCurrentView} />;
        }
    };

    return (
        <div className="bg-slate-900 text-slate-300 flex h-screen font-sans">
            {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <Sidebar currentView={currentView} setCurrentView={setCurrentView} workflowState={workflowState} />
            <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                {renderView()}
            </main>
            <JobStatusPanel jobs={jobs} />
        </div>
    );
};

export default App;