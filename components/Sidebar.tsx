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
  subLabel?: string;
}> = ({ icon, label, isActive, onClick, disabled = false, subLabel }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center px-4 py-3 mb-1 rounded-lg transition-all duration-200 text-left group relative
    ${
      isActive
        ? 'bg-gradient-to-r from-teal-600 to-teal-500 text-white shadow-lg shadow-teal-900/50'
        : disabled 
        ? 'text-slate-600 cursor-not-allowed'
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <div className={`w-5 h-5 mr-3 flex-shrink-0 transition-colors ${isActive ? 'text-white' : disabled ? 'text-slate-600' : 'text-slate-500 group-hover:text-teal-400'}`}>
        {icon}
    </div>
    <div className="flex flex-col">
        <span className={`font-medium text-sm ${isActive ? 'font-semibold' : ''}`}>{label}</span>
        {subLabel && <span className="text-[10px] opacity-70 leading-tight">{subLabel}</span>}
    </div>
    {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-l-full opacity-20"></div>}
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentView, setCurrentView, workflowState }) => {
  const isWorkflowActive = !!workflowState;
  
  const workflowSteps: { view: AppView; label: string; icon: React.ReactNode; requires?: (keyof WorkflowState)[] }[] = [
    { view: 'designStudio', label: 'Design Studio', icon: <CreateIcon /> },
    { view: 'productSelection', label: 'Select Product', icon: <TagIcon />, requires: ['asset'] },
    { view: 'generateMockups', label: 'Generate Mockups', icon: <MockupIcon />, requires: ['selectedProduct'] },
    { view: 'marketingCopy', label: 'Marketing Copy', icon: <MarketingIcon />, requires: ['mockups'] },
    { view: 'reviewAndPublish', label: 'Review & Publish', icon: <ClipboardCheckIcon />, requires: ['marketingCopy'] },
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
    <nav className="w-72 bg-slate-900/50 border-r border-slate-800 flex flex-col h-full backdrop-blur-xl">
      <div className="p-6 mb-2 flex items-center space-x-3">
         <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-400 to-teal-600 flex items-center justify-center shadow-lg shadow-teal-900/50">
            <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5z" />
            </svg>
         </div>
         <div>
             <h1 className="text-xl font-bold text-white tracking-tight">POD Automate</h1>
             <p className="text-xs text-teal-400 font-medium">AI Commander</p>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-8">
          <div>
            <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Current Workflow</p>
            <div className="space-y-0.5">
                {workflowSteps.map((item, index) => (
                <NavItem
                    key={item.view}
                    label={item.label}
                    subLabel={`Step ${index + 1}`}
                    icon={item.icon}
                    isActive={currentView === item.view}
                    onClick={() => setCurrentView(item.view)}
                    disabled={isStepDisabled(item)}
                />
                ))}
            </div>
          </div>
          
          <div>
            <p className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Tools</p>
            <div className="space-y-0.5">
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
          </div>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/30">
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