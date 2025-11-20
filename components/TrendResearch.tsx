
import React, { useState, useCallback } from 'react';
import { generateTrendAnalysis } from '../services/geminiService.ts';
import { Trend } from '../types.ts';
import ResearchIcon from './icons/ResearchIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import CreateIcon from './icons/CreateIcon.tsx';

// Extended Trend Interface for UI logic
interface DetailedTrend extends Trend {
    competitionLevel?: string;
    targetAudience?: string;
}

interface TrendResearchProps {
    onUseTrend?: (prompt: string) => void;
}

const TrendCard: React.FC<{ trend: DetailedTrend; onUse: (prompt: string) => void }> = ({ trend, onUse }) => (
  <div className="bg-slate-800 rounded-xl border border-slate-700 hover:border-brand-primary transition-all duration-300 flex flex-col shadow-lg group">
    
    {/* Content Section */}
    <div className="p-6 flex-grow flex flex-col justify-between">
        <div>
            <div className="flex flex-col md:flex-row md:justify-between md:items-start mb-3 gap-2">
                <div className="flex-grow">
                    <h3 className="text-xl font-bold text-white group-hover:text-teal-400 transition-colors">{trend.niche}</h3>
                    <div className="flex items-center gap-3 mt-2">
                         <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            trend.opportunityScore > 80 ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                         }`}>Score: {trend.opportunityScore}</span>
                         <span className="text-xs text-teal-400 font-bold uppercase tracking-wider">{trend.targetAudience || 'General Audience'}</span>
                         <span className="text-slate-600 text-[10px]">•</span>
                         <span className={`text-xs font-bold uppercase ${
                            trend.competitionLevel === 'Low' ? 'text-green-400' :
                            trend.competitionLevel === 'High' ? 'text-red-400' :
                            'text-yellow-400'
                        }`}>
                            {trend.competitionLevel || 'Medium'} Competition
                        </span>
                    </div>
                </div>
            </div>

            <p className="text-sm text-slate-300 mb-5 leading-relaxed">{trend.description}</p>

            <div className="flex flex-wrap gap-2 mb-4">
                {trend.keywords.slice(0, 5).map(kw => (
                    <span key={kw} className="text-xs bg-slate-900/50 text-slate-400 px-2.5 py-1.5 rounded border border-slate-700/50">
                        #{kw}
                    </span>
                ))}
            </div>
        </div>

        <div className="mt-auto pt-4 border-t border-slate-700/50 flex justify-end">
            <button 
                onClick={() => {
                    // Construct a prompt that explicitly asks for a graphic, not a product
                    const basePrompt = trend.imageExamples && trend.imageExamples.length > 0 
                        ? trend.imageExamples[0] 
                        : `${trend.niche} graphic art`;
                    
                    const refinedPrompt = `${basePrompt}, isolated vector graphic, ${trend.keywords.join(", ")}, flat design, no background, commercial print-on-demand style`;
                    onUse(refinedPrompt);
                }}
                className="w-full md:w-auto bg-slate-700 hover:bg-brand-primary text-white font-bold py-2 px-6 rounded-lg flex items-center justify-center transition-all shadow-lg hover:shadow-teal-900/30 group-hover:bg-brand-primary"
            >
                <CreateIcon className="w-4 h-4 mr-2" />
                Create Design from Trend
            </button>
        </div>
    </div>
  </div>
);

const DISCOVERY_MODES = [
    { id: 'trending', label: 'Rising Trends', icon: '📈', query: 'emerging graphic design trends' },
    { id: 'low-comp', label: 'Low Competition', icon: '💎', query: 'low competition high demand graphic niches' },
    { id: 'seasonal', label: 'Seasonal', icon: '🗓️', query: 'upcoming seasonal holiday graphics' },
    { id: 'humor', label: 'Viral Humor', icon: '😂', query: 'funny text-based graphic designs' },
    { id: 'hobbies', label: 'Passionate Hobbies', icon: '🎣', query: 'passionate hobby vector graphics' },
];

const TrendResearch: React.FC<TrendResearchProps> = ({ onUseTrend }) => {
  const [customTopic, setCustomTopic] = useState('');
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [trends, setTrends] = useState<DetailedTrend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState('General');

  const executeResearch = useCallback(async (topic: string, selectedPlatform: string = 'General') => {
    setIsLoading(true);
    setError(null);
    setTrends([]);

    try {
      // Force cast because we updated the service return type but maybe typescript hasn't caught up in this file context
      const result = await generateTrendAnalysis(topic, selectedPlatform) as DetailedTrend[];
      setTrends(result);
    } catch (e) {
      setError('Failed to discover trends. The AI might be busy.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleModeSelect = (modeId: string, query: string) => {
      setActiveMode(modeId);
      setCustomTopic(''); // Clear custom search when using presets
      executeResearch(query, platform);
  };

  const handleCustomSearch = () => {
      if (!customTopic.trim()) return;
      setActiveMode(null);
      executeResearch(customTopic, platform);
  };

  const handlePlatformChange = (newPlatform: string) => {
      setPlatform(newPlatform);
      // If we already have a mode or search active, re-run it
      if (activeMode) {
          const mode = DISCOVERY_MODES.find(m => m.id === activeMode);
          if (mode) executeResearch(mode.query, newPlatform);
      } else if (customTopic) {
          executeResearch(customTopic, newPlatform);
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-900/50 mb-4">
            <ResearchIcon className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-4xl font-extrabold text-white tracking-tight">Trend Discovery Engine</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          Scan the market for high-demand graphic design opportunities.
        </p>
      </div>

      {/* Discovery Dashboard */}
      <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-8 shadow-xl">
          
          {/* Platform Tabs */}
          <div className="flex justify-center mb-8">
               <div className="bg-slate-900 p-1 rounded-lg inline-flex">
                   {['General', 'Etsy', 'TikTok', 'Pinterest'].map(p => (
                       <button
                            key={p}
                            onClick={() => handlePlatformChange(p)}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors ${platform === p ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                       >
                           {p}
                       </button>
                   ))}
               </div>
          </div>

          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-6 text-center">Start your discovery</h2>
          
          {/* 1. Quick Modes */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              {DISCOVERY_MODES.map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeSelect(mode.id, mode.query)}
                    disabled={isLoading}
                    className={`p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 ${activeMode === mode.id 
                        ? 'bg-purple-600 border-purple-500 text-white shadow-lg scale-105' 
                        : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-purple-500/50 hover:bg-slate-750'}`}
                  >
                      <span className="text-2xl">{mode.icon}</span>
                      <span className="text-sm font-bold">{mode.label}</span>
                  </button>
              ))}
          </div>

          <div className="relative flex items-center justify-center mb-8">
             <div className="border-t border-slate-700 w-full absolute"></div>
             <span className="bg-slate-900 px-4 relative text-slate-500 text-xs font-bold uppercase">Or Deep Dive</span>
          </div>

          {/* 2. Custom Search */}
          <div className="flex max-w-2xl mx-auto relative">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCustomSearch()}
              placeholder="Analyze a specific topic (e.g. 'Yoga', 'Crypto', 'Gardening')..."
              className="w-full bg-slate-900 border-2 border-slate-700 rounded-full px-6 py-4 pr-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:outline-none text-white text-lg shadow-inner placeholder-slate-600"
              disabled={isLoading}
            />
            <button
              onClick={handleCustomSearch}
              disabled={isLoading || !customTopic.trim()}
              className="absolute right-2 top-2 bottom-2 bg-purple-600 hover:bg-purple-500 text-white font-bold px-6 rounded-full flex items-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? <SpinnerIcon /> : 'Analyze'}
            </button>
          </div>
      </div>

      {/* Results Section */}
      {isLoading && (
          <div className="py-20 text-center space-y-4">
              <SpinnerIcon className="w-12 h-12 text-purple-500 mx-auto animate-spin" />
              <p className="text-xl text-slate-300 font-medium animate-pulse">AI is scanning {platform} trends...</p>
              <p className="text-sm text-slate-500">Analyzing keywords • Checking competition • Identifying gaps</p>
          </div>
      )}

      {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-center">
              <p className="text-red-400">{error}</p>
              <button onClick={() => handleCustomSearch()} className="mt-2 text-red-300 underline hover:text-white">Try Again</button>
          </div>
      )}

      {!isLoading && trends.length > 0 && (
        <div className="space-y-6 animate-fade-in-down">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Top Opportunities Found</h2>
                <span className="text-sm text-slate-400">Based on real-time AI market analysis</span>
            </div>
            
            <div className="flex flex-col gap-6">
                {trends.map((trend, index) => (
                    <TrendCard 
                        key={index} 
                        trend={trend} 
                        onUse={(prompt) => onUseTrend && onUseTrend(prompt)} 
                    />
                ))}
            </div>
        </div>
      )}
      
      {!isLoading && trends.length === 0 && !error && (
          <div className="text-center py-10 opacity-50">
              <p className="text-slate-600">Select a category above to start discovering.</p>
          </div>
      )}
    </div>
  );
};

export default TrendResearch;
