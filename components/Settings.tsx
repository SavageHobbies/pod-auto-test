
import React, { useState, useEffect } from 'react';
import SettingsIcon from './icons/SettingsIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
// client-side helper calls server endpoint to avoid CORS
async function serverTestConnection(apiKey: string) {
    try {
        const res = await fetch('/api/printify/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey }) });
        return await res.json();
    } catch (e: any) {
        return { ok: false, message: e?.message || String(e) };
    }
}

const Settings: React.FC = () => {
    const [printifyApiKey, setPrintifyApiKey] = useState('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');
    const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
    const [testMessage, setTestMessage] = useState<string | null>(null);

    useEffect(() => {
        const savedPrintifyKey = localStorage.getItem('printifyApiKey');
        if (savedPrintifyKey) {
            setPrintifyApiKey(savedPrintifyKey);
        }
    }, []);

    const handleSave = () => {
        localStorage.setItem('printifyApiKey', printifyApiKey);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
    };

    const handleTestConnection = async () => {
        setTestStatus('testing');
        setTestMessage(null);
        try {
            // Persist the key immediately so tests and other pages can use it without extra clicks
            try { localStorage.setItem('printifyApiKey', printifyApiKey); setSaveStatus('success'); setTimeout(() => setSaveStatus('idle'), 1500); } catch (e) {}
            const res = await serverTestConnection(printifyApiKey);
            if (res.ok) {
                setTestStatus('success');
                setTestMessage('Connection OK');
                localStorage.setItem('printifyTestStatus', 'ok');
                // Notify other parts of the app that Printify is available
                try { window.dispatchEvent(new CustomEvent('printify:connected')); } catch (e) {}
            } else {
                setTestStatus('error');
                setTestMessage(res.message || `HTTP ${res.status}`);
                localStorage.setItem('printifyTestStatus', 'error');
            }
        } catch (e: any) {
            setTestStatus('error');
            setTestMessage(e?.message || 'Unknown error');
            localStorage.setItem('printifyTestStatus', 'error');
        }
        // Keep the status/message visible briefly, then clear both together so color matches message
        setTimeout(() => {
            setTestMessage(null);
            setTestStatus('idle');
        }, 4000);
    };

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="flex items-center space-x-4">
                <SettingsIcon className="h-10 w-10 text-brand-primary" />
                <h1 className="text-3xl font-bold text-white">Settings</h1>
            </div>

            <div className="bg-slate-800 p-6 rounded-lg space-y-6">
                <div>
                    <h2 className="text-xl font-semibold text-white">API Keys</h2>
                    <p className="text-slate-400 mt-1">Your keys are stored securely in your browser's local storage and are never sent to our servers.</p>
                </div>

                <div className="space-y-4">
                    {/* FIX: Removed Google AI API Key input to enforce usage of environment variables as per guidelines. */}
                    <div>
                        <label htmlFor="printifyApiKey" className="block text-sm font-medium text-slate-300 mb-1">
                            Printify API Key
                        </label>
                        <input
                            type="password"
                            id="printifyApiKey"
                            value={printifyApiKey}
                            onChange={(e) => setPrintifyApiKey(e.target.value)}
                            placeholder="Enter your Printify API Key"
                            className="w-full bg-slate-700 border border-slate-600 rounded-md px-3 py-2 focus:ring-brand-primary focus:outline-none"
                        />
                    </div>
                </div>

                <div className="flex justify-between items-center">
                    {saveStatus === 'success' && (
                        <div className="flex items-center text-green-400 mr-4">
                            <CheckCircleIcon />
                            <span className="ml-2">Settings saved!</span>
                        </div>
                    )}
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleTestConnection}
                            className={`px-4 py-2 rounded-md font-medium transition-colors duration-150 ${testStatus === 'testing' ? 'bg-slate-600 text-white' : testStatus === 'success' ? 'bg-green-600 text-white' : testStatus === 'error' ? 'bg-red-600 text-white' : 'bg-slate-700 text-white'}`}
                        >
                            {testStatus === 'testing' ? 'Testing...' : testStatus === 'success' ? 'Connected' : 'Test Connection'}
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-6 rounded-md transition-colors duration-200"
                        >
                            Save Settings
                        </button>
                    </div>
                </div>
                {testMessage && (
                    <div className={`mt-3 px-3 py-2 rounded-md ${testStatus === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                        {testMessage}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
