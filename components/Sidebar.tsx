import React, { useEffect, useState } from 'react';
// server test helper
async function serverTestConnection(apiKey: string) {
  try {
    const res = await fetch('/api/printify/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey }) });
    return await res.json();
  } catch (e) {
    return { ok: false, message: e?.message || String(e) };
  }
}
import { AppView, WorkflowState } from '../types.ts';

import DashboardIcon from './icons/DashboardIcon.tsx';
import LibraryIcon from './icons/LibraryIcon.tsx';
import CreateIcon from './icons/CreateIcon.tsx';
import ResearchIcon from './icons/ResearchIcon.tsx';
import AnalyticsIcon from './icons/AnalyticsIcon.tsx';
import SettingsIcon from './icons/SettingsIcon.tsx';
import MockupIcon from './icons/MockupIcon.tsx';
import MarketingIcon from './icons/MarketingIcon.tsx';
import TagIcon from './icons/TagIcon.tsx';
import ClipboardCheckIcon from './icons/ClipboardCheckIcon.tsx';
import OutboxIcon from './icons/OutboxIcon.tsx';


interface SidebarProps {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  workflowState: WorkflowState | null;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon, label, isActive, onClick, disabled = false }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center px-4 py-3 rounded-lg transition-colors duration-200 text-left 
    ${
      isActive
        ? 'bg-brand-primary text-white'
        : disabled 
        ? 'text-slate-600 cursor-not-allowed'
        : 'text-slate-400 hover:bg-slate-700 hover:text-white'
    }`}
  >
    <div className="w-5 h-5 mr-4 flex-shrink-0">{icon}</div>
    <span className="font-medium">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, workflowState }) => {
  const isWorkflowActive = !!workflowState;
  const [status, setStatus] = useState<'unknown' | 'ok' | 'error'>('unknown');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('printifyTestStatus');
    if (s === 'ok') setStatus('ok');
    else if (s === 'error') setStatus('error');
    else setStatus('unknown');
  }, []);
  
  const workflowSteps: { view: AppView; label: string; icon: React.ReactNode; requires?: (keyof WorkflowState)[] }[] = [
    { view: 'designStudio', label: '1. Design Studio', icon: <CreateIcon /> },
    { view: 'productSelection', label: '2. Product Selection', icon: <TagIcon />, requires: ['asset'] },
    { view: 'generateMockups', label: '3. Generate Mockups', icon: <MockupIcon />, requires: ['selectedProduct'] },
    { view: 'marketingCopy', label: '4. Marketing Copy', icon: <MarketingIcon />, requires: ['mockups'] },
    { view: 'reviewAndPublish', label: '5. Review & Publish', icon: <ClipboardCheckIcon />, requires: ['marketingCopy'] },
  ];
  
  const isStepDisabled = (step: typeof workflowSteps[0]) => {
    // Allow users to click any step; only fully disable Design Studio when there's an active workflow
    if (!isWorkflowActive && step.view !== 'designStudio') return false;
    return false;
  };

  const mainTools: { view: AppView; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'assetLibrary', label: 'Asset Library', icon: <LibraryIcon /> },
    { view: 'currentDesigns', label: 'Current Designs', icon: <LibraryIcon /> },
    { view: 'staging', label: 'Staging Area', icon: <OutboxIcon /> },
    { view: 'trendResearch', label: 'Trend Research', icon: <ResearchIcon /> },
    { view: 'analytics', label: 'Analytics', icon: <AnalyticsIcon /> },
  ];

  return (
    <nav className="w-72 bg-slate-800 border-r border-slate-700 p-4 flex flex-col h-full">
      <div className="mb-6 flex items-center space-x-3 px-2">
         <svg className="h-9 w-9 text-brand-primary" viewBox="0 0 24 24" fill="currentColor" stroke="white" strokeWidth="0.5">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
         </svg>
         <h1 className="text-2xl font-bold text-white">POD Automate</h1>
      </div>

      <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Workflow</p>
      <div className="space-y-1 mb-6">
        {workflowSteps.map((item) => (
          <NavItem
            key={item.view}
            label={item.label}
            icon={item.icon}
            isActive={currentView === item.view}
            onClick={() => setCurrentView(item.view)}
            disabled={isStepDisabled(item)}
          />
        ))}
      </div>
      
      <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tools</p>
      <div className="space-y-1 flex-grow">
        {mainTools.map((item) => (
          <NavItem
            key={item.view}
            label={item.label}
            icon={item.icon}
            isActive={currentView === item.view}
            onClick={() => setCurrentView(item.view)}
          />
        ))}
      </div>
      {/* Quick current designs preview - will show up under Tools on the Sidebar */}
      <div className="px-2">
        {/* We'll pull a small cached product list from localStorage if present */}
        {/* This is intentionally lightweight - it mirrors the quick list UI on ProductSelection */}
        <div className="mt-4">
          <h4 className="text-xs text-slate-500 uppercase mb-2">Current Designs</h4>
          <div className="text-xs text-slate-400 mb-2">Quick access to product designs</div>
          <div>
            {(() => {
              try {
                const raw = localStorage.getItem('lastProductList');
                const parsed = raw ? JSON.parse(raw) : [];
                if (!Array.isArray(parsed) || parsed.length === 0) return <div className="text-xs text-slate-500">No designs</div>;
                return (
                  <ul className="space-y-1">
                    {parsed.slice(0,6).map((p: any) => (
                      <li key={p.id}>
                        <button
                          onClick={() => {
                            // Store the selected product into workflowState and go to productSelection
                            const existing = localStorage.getItem('workflowState');
                            let wf = existing ? JSON.parse(existing) : {};
                            wf.selectedProduct = p;
                            localStorage.setItem('workflowState', JSON.stringify(wf));
                            // navigate to product selection
                            window.location.hash = '#/productSelection';
                            window.location.reload();
                          }}
                          className="text-left text-slate-200 hover:underline text-sm"
                        >
                          {p.name}
                        </button>
                      </li>
                    ))}
                  </ul>
                );
              } catch (e) {
                return <div className="text-xs text-slate-500">No designs</div>;
              }
            })()}
          </div>
        </div>
      </div>

      <div>
        {/* Resume saved workflow */}
        <div className="px-2 mb-4">
          <h3 className="text-xs text-slate-500 uppercase mb-2">Workflow</h3>
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                const raw = localStorage.getItem('workflowState');
                if (raw) {
                  try {
                    const parsed = JSON.parse(raw);
                    // set view to productSelection and rely on App.updateWorkflow to accept parsed object
                    setCurrentView('productSelection');
                    // communicate via localStorage or a custom event — App picks up stored workflow on mount
                    localStorage.setItem('workflowState', JSON.stringify(parsed));
                    window.location.reload();
                  } catch (e) {}
                }
              }}
              className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-md mr-2"
            >
              Resume
            </button>
            <button
              onClick={() => { localStorage.removeItem('workflowState'); setStatus('unknown'); setMessage(null); }}
              className="text-sm bg-red-700 hover:bg-red-600 text-white px-3 py-2 rounded-md"
            >
              Clear
            </button>
          </div>
        </div>
         <div className="px-2 py-3">
           <div className="flex items-center justify-between mb-2">
             <NavItem
               label="Settings"
               icon={<SettingsIcon />}
               isActive={currentView === 'settings'}
               onClick={() => setCurrentView('settings')}
             />
           </div>
           <div className="mt-3 flex items-center justify-between px-2">
             <div className="flex items-center space-x-2">
               <span className="text-xs text-slate-400">Printify</span>
               <span
                 id="printify-status"
                 className={`inline-block h-2 w-2 rounded-full ${status === 'ok' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-slate-600'}`}
               />
             </div>
             <div className="flex flex-col items-end">
             <button
               onClick={async () => {
                 const key = localStorage.getItem('printifyApiKey') || '';
                 const res = await serverTestConnection(key);
                 if (res.ok) {
                   localStorage.setItem('printifyTestStatus', 'ok');
                   setStatus('ok');
                 } else {
                   localStorage.setItem('printifyTestStatus', 'error');
                   setStatus('error');
                 }
                 setMessage(res.ok ? 'Connected' : (res.message || `Error ${res.status || ''}`));
                 setTimeout(() => setMessage(null), 4000);
               }}
               className="text-xs bg-slate-700 hover:bg-slate-600 text-white px-3 py-1 rounded-md"
             >
               Test
             </button>
             {typeof message !== 'undefined' && message && (
               <div className="mt-1 text-xs text-slate-300">{message}</div>
             )}
             </div>
           </div>
         </div>
      </div>
    </nav>
  );
};

export default Sidebar;
