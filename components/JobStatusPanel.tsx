
import React from 'react';
// FIX: Added .ts extension to fix module resolution error.
import { Job } from '../types.ts';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import XCircleIcon from './icons/XCircleIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';

const JobItem: React.FC<{ job: Job }> = ({ job }) => {
  const getIcon = () => {
    switch (job.status) {
      case 'completed':
        return <CheckCircleIcon className="text-green-400" />;
      case 'processing':
        return <SpinnerIcon />;
      case 'failed':
        return <XCircleIcon className="text-red-400" />;
      case 'warning':
        return <XCircleIcon className="text-yellow-400" />;
      default:
        return <div className="w-4 h-4 rounded-full bg-slate-500 animate-pulse"></div>;
    }
  };

  return (
    <li className="p-3 bg-slate-700 rounded-md">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          <div className="w-5 h-5 mr-3 flex items-center justify-center">{getIcon()}</div>
          <span className="font-medium text-slate-300">{job.name}</span>
        </div>
        <span className="text-xs text-slate-400 capitalize">{job.status}</span>
      </div>
      {job.status === 'processing' && job.progress !== undefined && (
        <div className="mt-2">
          <div className="w-full bg-slate-600 rounded-full h-1.5">
            <div
              className="bg-brand-primary h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${job.progress}%` }}
            ></div>
          </div>
        </div>
      )}
       {job.details && <p className="text-xs text-slate-400 mt-1 pl-8">{job.details}</p>}
    </li>
  );
};

const JobStatusPanel: React.FC<{ jobs: Job[] }> = ({ jobs }) => {
  return (
    <aside className="w-80 bg-slate-800 border-l border-slate-700 p-4 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 text-white">Job Status</h2>
      {jobs.length > 0 ? (
        <ul className="space-y-3 overflow-y-auto flex-1">
          {jobs.map(job => (
            <JobItem key={job.id} job={job} />
          )).reverse()}
        </ul>
      ) : (
        <div className="flex-1 flex items-center justify-center text-center">
          <p className="text-sm text-slate-500">No active jobs.</p>
        </div>
      )}
    </aside>
  );
};

export default JobStatusPanel;
