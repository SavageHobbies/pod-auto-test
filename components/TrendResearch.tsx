
import React, { useState, useCallback } from 'react';
// FIX: Added .ts extension to fix module resolution error.
import { generateTrendAnalysis } from '../services/geminiService.ts';
// FIX: Added .ts extension to fix module resolution error.
import { Trend } from '../types.ts';
import ResearchIcon from './icons/ResearchIcon.tsx';
import SpinnerIcon from './icons/SpinnerIcon.tsx';
import SparklesIcon from './icons/SparklesIcon.tsx';

const TrendCard: React.FC<{ trend: Trend }> = ({ trend }) => (
  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 hover:border-brand-primary transition-colors duration-300 flex flex-col">
    <div className="flex justify-between items-start">
      <h3 className="text-lg font-bold text-white mb-2">{trend.niche}</h3>
      <div className="text-right">
        <p className="text-xs text-slate-400">Opportunity</p>
        <p className={`text-2xl font-bold ${trend.opportunityScore > 75 ? 'text-green-400' : trend.opportunityScore > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {trend.opportunityScore}
        </p>
      </div>
    </div>
    <p className="text-sm text-slate-400 mb-4 flex-grow">{trend.description}</p>
    
    <div className="mb-4">
        <p className="text-xs font-semibold text-slate-300 mb-2">Visual Examples:</p>
        <div className="grid grid-cols-3 gap-2">
            {trend.imageExamples.map((imgUrl, index) => (
                <img 
                    key={index}
                    src={imgUrl}
                    alt={`${trend.niche} example ${index + 1}`}
                    className="rounded-md aspect-video object-cover bg-slate-700"
                    loading="lazy"
                />
            ))}
        </div>
    </div>

    <div className="flex flex-wrap gap-2">
      {trend.keywords.map((keyword, index) => (
        <span key={index} className="text-xs bg-slate-700 text-slate-300 font-medium px-2 py-1 rounded">
          {keyword}
        </span>
      ))}
    </div>
  </div>
);

const TrendResearch: React.FC = () => {
  const [topic, setTopic] = useState('');
  const [trends, setTrends] = useState<Trend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResearch = useCallback(async () => {
    if (!topic.trim()) {
      setError('Please enter a topic to research.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setTrends([]);

    try {
      const result = await generateTrendAnalysis(topic);
      setTrends(result);
    } catch (e) {
      setError('Failed to generate trend analysis. Please try again.');
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [topic]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <ResearchIcon className="mx-auto h-12 w-12 text-brand-primary" />
        <h1 className="text-3xl font-bold text-white mt-4">Trend Research Engine</h1>
        <p className="text-slate-400 mt-2">Discover profitable niches and keywords powered by AI.</p>
      </div>

      <div className="flex gap-4">
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g., 'summer hobbies for men', 'retro gaming', 'eco-friendly products'"
          className="flex-grow bg-slate-800 border border-slate-600 rounded-md px-4 py-2 focus:ring-2 focus:ring-brand-primary focus:outline-none"
          disabled={isLoading}
        />
        <button
          onClick={handleResearch}
          disabled={isLoading}
          className="bg-brand-primary hover:bg-brand-secondary text-white font-bold py-2 px-6 rounded-md flex items-center justify-center disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
          {isLoading ? <SpinnerIcon /> : <SparklesIcon />}
          <span className="ml-2">{isLoading ? 'Analyzing...' : 'Research'}</span>
        </button>
      </div>

      {error && <p className="text-red-400 text-center">{error}</p>}
      
      {isLoading && (
          <div className="text-center py-8">
              <p className="text-slate-400">AI is analyzing trends... this may take a moment.</p>
          </div>
      )}

      {trends.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {trends.map((trend, index) => (
            <TrendCard key={index} trend={trend} />
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendResearch;
