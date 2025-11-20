import React, { useState } from 'react';
import SettingsIcon from './icons/SettingsIcon.tsx';
import SignalIcon from './icons/SignalIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import XCircleIcon from './icons/XCircleIcon.tsx';
import { testPrintifyConnection } from '../services/printifyService.ts';

interface SettingsProps {
    apiKey: string;
    setApiKey: (key: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ apiKey, setApiKey }) => {
    const [localApiKey, setLocalApiKey] = useState(apiKey);
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
    const [testMessage, setTestMessage] = useState('');

    const handleSave = () => {
        setApiKey(localApiKey);
        // Optionally show a notification
        alert("Settings saved!");
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        try {
            const message = await testPrintifyConnection(localApiKey);
            setTestStatus('success');
            setTestMessage(message);
        } catch (error: any) {
            setTestStatus('failed');
            setTestMessage(error.message || 'An unknown error occurred.');
        }
    };

    const getTestStatusIcon = () => {
        switch (testStatus) {
            case 'testing': return <SpinnerIcon />;
            case 'success': return <CheckCircleIcon className="text-green-400" />;
            case 'failed': return <XCircleIcon className="text-red-400" />;
            default: return null;
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex items-center space-x-4">
                <SettingsIcon className="h-10 w-10 text-brand-primary" />
                <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
                <p className="text-slate-400">
                    Your Gemini API key is configured via an environment variable. There is no need to configure it here.
                </p>
            </div>
            <div className="bg-slate-800 p-6 rounded-lg space-y-4">
                <h2 className="text-xl font-semibold">Printify Settings</h2>
                <p className="text-slate-400">
                    Your Printify API key is required to fetch the live product catalog.
                </p>
                <div>
                    <label htmlFor="printify-api-key" className="block text-sm font-medium text-slate-300 mb-1">Printify API Key</label>
                    <input
                        id="printify-api-key"
                        type="password"
                        value={localApiKey}
                        onChange={(e) => {
                           setLocalApiKey(e.target.value);
                           setTestStatus('idle'); // Reset test status on key change
                        }}
                        className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleSave}
                        className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-4 rounded-md"
                    >
                        Save Settings
                    </button>
                    <button 
                        onClick={handleTestConnection}
                        disabled={!localApiKey || testStatus === 'testing'}
                        className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded-md flex items-center disabled:opacity-50"
                    >
                        <SignalIcon />
                        <span className="ml-2">{testStatus === 'testing' ? 'Testing...' : 'Test Connection'}</span>
                    </button>
                </div>
                {testStatus !== 'idle' && (
                    <div className={`mt-4 p-3 rounded-md flex items-center text-sm ${testStatus === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                        <div className="w-5 h-5 mr-3">{getTestStatusIcon()}</div>
                        <span>{testMessage}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;