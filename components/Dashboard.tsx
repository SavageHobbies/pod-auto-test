import React from 'react';
// FIX: Added .ts extension to fix module resolution error.
import { DesignAsset, Job, AppView } from '../types.ts';
import AnalyticsIcon from './icons/AnalyticsIcon.tsx';
import LibraryIcon from './icons/LibraryIcon.tsx';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import CreateIcon from './icons/CreateIcon.tsx';

interface DashboardProps {
  assets: DesignAsset[];
  jobs: Job[];
  setCurrentView: (view: AppView) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; colorClass: string }> = ({ title, value, icon, colorClass }) => (
    <div className="glass-panel p-6 rounded-xl flex items-center transition-transform hover:-translate-y-1 duration-300">
        <div className={`p-4 rounded-lg mr-5 ${colorClass} bg-opacity-10`}>
            {React.cloneElement(icon as React.ReactElement, { className: `w-8 h-8 ${colorClass.replace('bg-', 'text-')}` })}
        </div>
        <div>
            <p className="text-slate-400 text-sm font-medium uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
    </div>
);

const WelcomeDashboard: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="text-center flex flex-col items-center justify-center h-full animate-fade-in-down">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 flex items-center justify-center mb-8 shadow-xl shadow-teal-900/50">
            <CreateIcon className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">POD Automate</h1>
        <p className="text-xl text-slate-400 mb-10 max-w-2xl leading-relaxed">
            Your intelligent command center for Print-on-Demand. <br/>
            Research trends, generate designs, and publish products in minutes.
        </p>
        <button 
            onClick={onStart}
            className="group bg-white text-slate-900 hover:bg-teal-50 font-bold py-4 px-10 rounded-full text-lg transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center"
        >
            Start New Workflow
            <svg className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
        </button>
    </div>
);

const MainDashboard: React.FC<DashboardProps> = ({ assets, jobs }) => {
    const completedJobs = jobs.filter(j => j.status === 'completed').length;

    return (
        <div className="space-y-8 animate-fade-in-down">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-white">Dashboard</h1>
                <span className="text-sm text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                    {new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Assets" value={assets.length} icon={<LibraryIcon />} colorClass="bg-blue-500" />
                <StatCard title="Jobs Completed" value={completedJobs} icon={<CheckCircleIcon />} colorClass="bg-green-500" />
                <StatCard title="Est. Revenue" value="$1,234" icon={<AnalyticsIcon />} colorClass="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="glass-panel p-6 rounded-xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-semibold text-white">Recent Assets</h2>
                        <button className="text-sm text-teal-400 hover:text-teal-300 font-medium">View All</button>
                    </div>
                    {assets.length > 0 ? (
                        <ul className="space-y-4">
                            {assets.slice(0, 5).map(asset => (
                                <li key={asset.id} className="flex items-center bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors">
                                    <img src={asset.imageUrl} alt={asset.name} className="w-12 h-12 rounded-lg object-cover mr-4 bg-slate-700" />
                                    <div>
                                        <p className="font-medium text-white">{asset.name}</p>
                                        <div className="flex gap-2 mt-1">
                                            {asset.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-[10px] bg-teal-500/10 text-teal-400 font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="text-center py-8 text-slate-500">
                            <LibraryIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            No assets found.
                        </div>
                    )}
                </div>

                <div className="glass-panel p-6 rounded-xl">
                    <h2 className="text-xl font-semibold text-white mb-6">Recent Activity</h2>
                     {jobs.length > 0 ? (
                        <ul className="space-y-2">
                            {jobs.slice(0, 6).map(job => (
                                <li key={job.id} className="flex justify-between items-center text-sm p-3 rounded-lg hover:bg-slate-800/50 transition-colors">
                                    <div className="flex items-center overflow-hidden">
                                        <span className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 ${
                                            job.status === 'completed' ? 'bg-green-500' :
                                            job.status === 'processing' ? 'bg-blue-500 animate-pulse' :
                                            job.status === 'failed' ? 'bg-red-500' :
                                            'bg-slate-500'
                                        }`}></span>
                                        <span className="text-slate-300 truncate">{job.name}</span>
                                    </div>
                                    <span className={`ml-4 px-2 py-0.5 rounded text-xs font-medium capitalize flex-shrink-0 ${
                                        job.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                                        job.status === 'processing' ? 'bg-blue-500/10 text-blue-400' :
                                        job.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                        'bg-slate-700 text-slate-400'
                                    }`}>
                                        {job.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <div className="text-center py-8 text-slate-500">
                            <CheckCircleIcon className="w-10 h-10 mx-auto mb-2 opacity-20" />
                            No activity recorded.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Dashboard: React.FC<DashboardProps> = (props) => {
    if (props.assets.length === 0) {
        return <WelcomeDashboard onStart={() => props.setCurrentView('designStudio')} />;
    }
    return <MainDashboard {...props} />;
};


export default Dashboard;