import React, { useState } from 'react';
import { searchLocationWithMaps } from '../services/genai';
import { LocationData } from '../types';

interface LocationSearchProps {
  onLocationFound: (location: LocationData) => void;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({ onLocationFound }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ text: string; mapLink: string; mapTitle: string } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const data = await searchLocationWithMaps(query);
      setResult(data);
      onLocationFound({
        name: query, 
        mapLink: data.mapLink,
        summary: data.text
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to find location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 max-w-4xl mx-auto py-10">
      <div className="text-center space-y-6">
        <h2 className="text-5xl font-bold text-slate-900 tracking-tight">Find Your Destination</h2>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-light leading-relaxed">
          Enter any location worldwide. We leverage Google Maps Grounding to locate it precisely for you with AI-driven precision.
        </p>
      </div>

      <div className="w-full relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 to-purple-200 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <form onSubmit={handleSearch} className="relative bg-white rounded-[1.8rem] shadow-2xl shadow-slate-200/50 flex p-2 border border-slate-100">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g., Mount Fuji, Japan"
            className="flex-1 bg-transparent border-none text-slate-800 px-6 py-4 rounded-2xl focus:outline-none text-xl placeholder-slate-400 font-medium"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-lg shadow-blue-500/20 disabled:opacity-70 disabled:shadow-none flex items-center min-w-[140px] justify-center"
          >
            {loading ? (
              <span className="animate-spin h-5 w-5 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              'Search'
            )}
          </button>
        </form>

        {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center space-x-3 text-red-600 animate-fade-in shadow-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{error}</span>
            </div>
        )}
      </div>

      {result && (
        <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] animate-fade-in ring-1 ring-slate-900/5">
          <div className="flex items-start space-x-6">
            <div className="p-4 bg-blue-50 rounded-2xl text-blue-600 shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-4">
              <h3 className="text-2xl font-bold text-slate-900">Location Found</h3>
              <div className="prose prose-slate max-w-none text-slate-600 leading-relaxed text-lg">
                <p>{result.text}</p>
              </div>
              
              {result.mapLink && (
                <div className="pt-2">
                    <a
                    href={result.mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-6 py-3 rounded-xl font-medium"
                    >
                    <span>Open in Google Maps</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};