import React from 'react';
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
  
  const workflowSteps: { view: AppView; label: string; icon: React.ReactNode; requires?: (keyof WorkflowState)[] }[] = [
    { view: 'designStudio', label: '1. Design Studio', icon: <CreateIcon /> },
    { view: 'productSelection', label: '2. Product Selection', icon: <TagIcon />, requires: ['asset'] },
    { view: 'generateMockups', label: '3. Generate Mockups', icon: <MockupIcon />, requires: ['selectedProduct'] },
    { view: 'marketingCopy', label: '4. Marketing Copy', icon: <MarketingIcon />, requires: ['mockups'] },
    { view: 'reviewAndPublish', label: '5. Review & Publish', icon: <ClipboardCheckIcon />, requires: ['marketingCopy'] },
  ];
  
  const isStepDisabled = (step: typeof workflowSteps[0]) => {
    const isDesignStudio = step.view === 'designStudio';
    if (!isWorkflowActive && !isDesignStudio) return true;
    if (isDesignStudio && isWorkflowActive) return false;
    
    if (!workflowState) return !isDesignStudio;

    if (step.requires) {
        for (const req of step.requires) {
             if (req === 'mockups' && workflowState.mockups.light.length === 0 && workflowState.mockups.dark.length === 0) return true;
            if (!workflowState[req]) return true;
        }
    }
    return false;
  };

  const mainTools: { view: AppView; label: string; icon: React.ReactNode }[] = [
    { view: 'dashboard', label: 'Dashboard', icon: <DashboardIcon /> },
    { view: 'assetLibrary', label: 'Asset Library', icon: <LibraryIcon /> },
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

      <div>
         <NavItem
            label="Settings"
            icon={<SettingsIcon />}
            isActive={currentView === 'settings'}
            onClick={() => setCurrentView('settings')}
          />
      </div>
    </nav>
  );
};

export default Sidebar;
