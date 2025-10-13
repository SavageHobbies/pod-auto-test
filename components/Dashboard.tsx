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

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-slate-800 p-6 rounded-lg flex items-center">
        <div className="p-3 rounded-full bg-slate-700 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-slate-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
        </div>
    </div>
);

const WelcomeDashboard: React.FC<{ onStart: () => void }> = ({ onStart }) => (
    <div className="text-center flex flex-col items-center justify-center h-full">
        <CreateIcon className="w-16 h-16 text-brand-primary mb-4" />
        <h1 className="text-4xl font-bold text-white mb-2">Welcome to POD Automate</h1>
        <p className="text-lg text-slate-400 mb-8 max-w-xl">Your all-in-one platform to research, design, and publish print-on-demand products.</p>
        <button 
            onClick={onStart}
            className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-4 px-8 rounded-lg text-lg transition-transform duration-200 transform hover:scale-105"
        >
            Create Your First Design
        </button>
    </div>
);

const MainDashboard: React.FC<DashboardProps> = ({ assets, jobs }) => {
    const completedJobs = jobs.filter(j => j.status === 'completed').length;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold text-white">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Assets" value={assets.length} icon={<LibraryIcon />} />
                <StatCard title="Completed Jobs" value={completedJobs} icon={<CheckCircleIcon className="text-green-400" />} />
                <StatCard title="Mock Sales" value="$1,234" icon={<AnalyticsIcon />} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Recent Assets</h2>
                    {assets.length > 0 ? (
                        <ul className="space-y-4">
                            {assets.slice(0, 5).map(asset => (
                                <li key={asset.id} className="flex items-center bg-slate-700 p-3 rounded-md">
                                    <img src={asset.imageUrl} alt={asset.name} className="w-12 h-12 rounded-md object-cover mr-4" />
                                    <div>
                                        <p className="font-medium text-white">{asset.name}</p>
                                        <div className="flex gap-2 mt-1">
                                            {asset.tags.slice(0, 2).map(tag => (
                                                <span key={tag} className="text-xs bg-brand-secondary text-brand-primary font-semibold px-2 py-0.5 rounded-full">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-slate-400">No assets uploaded yet. Go to the Asset Library to get started.</p>
                    )}
                </div>

                <div className="bg-slate-800 p-6 rounded-lg">
                    <h2 className="text-xl font-semibold mb-4">Recent Jobs</h2>
                     {jobs.length > 0 ? (
                        <ul className="space-y-3">
                            {jobs.slice(0, 5).map(job => (
                                <li key={job.id} className="flex justify-between items-center text-sm">
                                    <span className="text-slate-300">{job.name}</span>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        job.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                        job.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                                        job.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                        'bg-slate-600/50 text-slate-400'
                                    }`}>
                                        {job.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                         <p className="text-slate-400">No jobs have been run yet.</p>
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