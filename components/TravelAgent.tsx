
import React, { useState, useRef, useEffect } from 'react';
import { generateDeepTravelItinerary, searchHiddenSpots, createTravelChat, downloadFile, generateLocationPreviews, generateSpotImage } from '../services/genai';
import { Chat } from '@google/genai';
import { ChatMessage, TravelPlan, HiddenGem } from '../types';

interface TravelAgentProps {
  initialLocation?: string;
}

type TabSection = 'overview' | 'disaster' | 'safety' | 'itinerary' | 'weather' | 'photography' | 'guide';

export const TravelAgent: React.FC<TravelAgentProps> = ({ initialLocation }) => {
  const [location, setLocation] = useState(initialLocation || '');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'plan' | 'hidden'>('plan');
  
  // Tab state for the plan
  const [activeTab, setActiveTab] = useState<TabSection>('overview');

  const [error, setError] = useState<string | null>(null);
  
  const [travelData, setTravelData] = useState<TravelPlan | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  
  const [hiddenSpots, setHiddenSpots] = useState<HiddenGem[] | null>(null);
  const [hiddenSpotImages, setHiddenSpotImages] = useState<{[key: string]: string}>({});

  // Chat state
  const chatRef = useRef<Chat | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages]);

  useEffect(() => {
      if (initialLocation) {
          setLocation(initialLocation);
      }
  }, [initialLocation]);

  const clearResults = () => {
    setTravelData(null);
    setHiddenSpots(null);
    setHiddenSpotImages({});
    setImages([]);
    setError(null);
    setChatMessages([]);
    chatRef.current = null;
    setActiveTab('overview');
  };

  const handleDeepPlan = async () => {
    if (!location) return;
    setLoading(true);
    clearResults();
    setMode('plan');
    
    // Launch Image Generation in parallel
    setImagesLoading(true);
    generateLocationPreviews(location).then(imgs => {
        setImages(imgs);
        setImagesLoading(false);
    });
    
    try {
      const result = await generateDeepTravelItinerary(location);
      setTravelData(result);
      
      const contextString = JSON.stringify(result, null, 2);
      chatRef.current = createTravelChat(contextString);
      setChatMessages([{
        id: 'init',
        role: 'model',
        text: 'I have analyzed the location. Ask me anything about the plan or the destination!'
      }]);

    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred while generating the plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleHiddenSpots = async () => {
    if (!location) return;
    setLoading(true);
    clearResults();
    setMode('hidden');

    try {
      const result = await searchHiddenSpots(location);
      setHiddenSpots(result);
      
      // Generate images for spots in parallel
      result.forEach(spot => {
          generateSpotImage(spot.name, location).then(imgUrl => {
              if (imgUrl) {
                  setHiddenSpotImages(prev => ({...prev, [spot.name]: imgUrl}));
              }
          });
      });

    } catch (e: any) {
      console.error(e);
      setError(e.message || "An unexpected error occurred while searching.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !chatRef.current) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: userMsg }]);
    setChatLoading(true);

    try {
      const response = await chatRef.current.sendMessage({ message: userMsg });
      const text = response.text || "I couldn't generate a response.";
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, I encountered an error answering that." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSavePlan = () => {
    if (travelData) {
        // Convert JSON back to readable markdown for download
        const content = `
# Travel Plan for ${location}
Confidence: ${travelData.confidence}

## Overview
${travelData.overview}

## Disaster Profile
- Zone: ${travelData.disaster_profile.zone_type}
- Risk Score: ${travelData.disaster_profile.risk_score}
- Details: ${travelData.disaster_profile.details}

## Safety Measures
${travelData.safety_measures.map(s => `- ${s}`).join('\n')}

## Itinerary
${travelData.itinerary.map(s => `- ${s}`).join('\n')}

## Weather
- Crowd: ${travelData.weather.crowd_levels}
- Best Time: ${travelData.weather.best_time_to_visit}
- Summary: ${travelData.weather.forecast_summary}

## Photography
${travelData.photography.basic_guide}
Technical: ISO ${travelData.photography.technical_settings.iso}, Shutter ${travelData.photography.technical_settings.shutter_speed}, Aperture ${travelData.photography.technical_settings.aperture}

## Trip Guide
- Transport: ${travelData.trip_guide.transport_system}
- Scams: ${travelData.trip_guide.common_scams}
        `.trim();
        downloadFile(content, `travel_plan_${location.replace(/\s+/g, '_')}.txt`, 'text/plain');
    }
  };

  const getBadgeColor = (level: string) => {
    const l = level?.toLowerCase() || '';
    switch (l) {
      case 'high': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-slate-100 text-slate-600';
    }
  };
  
  const getCrowdColor = (score: number) => {
      if (score > 70) return 'bg-red-400 shadow-red-200';
      if (score > 40) return 'bg-yellow-400 shadow-yellow-200';
      return 'bg-emerald-400 shadow-emerald-200';
  };

  const renderContent = () => {
    if (!travelData) return null;

    switch (activeTab) {
        case 'overview':
            return (
                <div className="space-y-6 animate-fade-in">
                    <div className="flex items-center justify-between">
                         <h3 className="text-2xl font-bold text-slate-800">Overview</h3>
                         <span className={`px-5 py-2 rounded-full text-sm font-bold border shadow-sm ${getBadgeColor(travelData.confidence)}`}>
                            Confidence: {travelData.confidence}
                        </span>
                    </div>
                    <p className="text-lg text-slate-600 leading-relaxed">{travelData.overview}</p>
                    
                    {/* Visuals are part of overview */}
                    <div className="space-y-4 pt-4">
                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">AI Visual Impressions</h4>
                         {imagesLoading ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="aspect-video bg-slate-100 rounded-2xl flex items-center justify-center">
                                        <span className="text-slate-400 font-medium">Generating View...</span>
                                    </div>
                                ))}
                            </div>
                        ) : images.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {images.map((img, idx) => (
                                    <div key={idx} className="group relative aspect-video rounded-2xl overflow-hidden shadow-lg shadow-slate-200 hover:shadow-xl transition-all duration-500">
                                        <img src={img} alt={`${location} view ${idx + 1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 bg-slate-50 rounded-2xl text-slate-500 text-center italic border border-slate-100">Visuals unavailable.</div>
                        )}
                    </div>
                </div>
            );
        case 'disaster':
            return (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-2xl font-bold text-slate-800">Disaster Profile</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-sm text-red-500 font-semibold uppercase mb-1">Zone Type</p>
                            <p className="text-xl font-bold text-red-900">{travelData.disaster_profile.zone_type}</p>
                        </div>
                        <div className="p-6 bg-orange-50 rounded-2xl border border-orange-100">
                            <p className="text-sm text-orange-500 font-semibold uppercase mb-1">Risk Score</p>
                            <p className="text-xl font-bold text-orange-900">{travelData.disaster_profile.risk_score}</p>
                        </div>
                    </div>
                    <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                        <p className="text-slate-600 leading-relaxed">{travelData.disaster_profile.details}</p>
                    </div>
                </div>
            );
        case 'safety':
            return (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-2xl font-bold text-slate-800">Safety Measures</h3>
                    <ul className="space-y-4">
                        {travelData.safety_measures.map((item, i) => (
                            <li key={i} className="flex items-start space-x-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm">
                                <span className="flex-shrink-0 w-6 h-6 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-sm font-bold">✓</span>
                                <span className="text-slate-700">{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            );
        case 'itinerary':
            return (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-2xl font-bold text-slate-800">Basic Itinerary</h3>
                    <div className="space-y-4">
                        {travelData.itinerary.map((item, i) => (
                            <div key={i} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start space-x-4">
                                     <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold">
                                        {i + 1}
                                     </div>
                                     <p className="text-slate-700 leading-relaxed pt-1">{item}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            );
        case 'weather':
            return (
                <div className="space-y-6 animate-fade-in">
                     <h3 className="text-2xl font-bold text-slate-800">Weather & Crowd</h3>
                     
                     {/* Crowd Chart - Improved Visibility */}
                     {travelData.weather.crowd_curve && (
                         <div className="p-8 bg-white border border-slate-100 rounded-2xl shadow-sm">
                             <h4 className="text-sm font-bold text-slate-500 uppercase mb-8">Annual Crowd Density Forecast</h4>
                             <div className="flex items-end justify-between h-48 space-x-1 sm:space-x-2 w-full">
                                 {travelData.weather.crowd_curve.map((d, i) => (
                                     <div key={i} className="flex flex-col items-center flex-1 h-full justify-end group cursor-default">
                                         {/* Percentage Label - Always visible, bolder */}
                                         <span className="text-[10px] sm:text-xs text-slate-600 font-bold mb-1.5">{d.score}%</span>
                                         
                                         {/* The Bar - Minimum height ensured */}
                                         <div 
                                            className={`w-full min-w-[8px] rounded-t-md sm:rounded-t-lg transition-all duration-1000 shadow-md ${getCrowdColor(d.score)}`} 
                                            style={{height: `${Math.max(d.score, 5)}%`}}
                                        >
                                        </div>
                                         <span className="text-[10px] sm:text-xs text-slate-400 font-bold mt-3 uppercase tracking-wider">{d.month.substring(0, 3)}</span>
                                     </div>
                                 ))}
                             </div>
                             <div className="flex justify-center mt-8 space-x-8 pt-4 border-t border-slate-50">
                                 <div className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm"></span><span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Low Traffic</span></div>
                                 <div className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full bg-yellow-400 shadow-sm"></span><span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Moderate</span></div>
                                 <div className="flex items-center space-x-2"><span className="w-3 h-3 rounded-full bg-red-400 shadow-sm"></span><span className="text-xs font-medium text-slate-500 uppercase tracking-wide">High Traffic</span></div>
                             </div>
                         </div>
                     )}

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                            <p className="text-sm text-blue-500 font-semibold uppercase mb-2">Crowd Levels (Summary)</p>
                            <p className="text-slate-800 font-medium">{travelData.weather.crowd_levels}</p>
                        </div>
                        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100">
                            <p className="text-sm text-purple-500 font-semibold uppercase mb-2">Best Time to Visit</p>
                            <p className="text-slate-800 font-medium">{travelData.weather.best_time_to_visit}</p>
                        </div>
                     </div>
                     <div className="p-8 bg-white border border-slate-100 rounded-2xl">
                        <h4 className="text-lg font-bold text-slate-800 mb-3">Forecast Summary</h4>
                        <p className="text-slate-600">{travelData.weather.forecast_summary}</p>
                     </div>
                </div>
            );
        case 'photography':
             return (
                <div className="space-y-6 animate-fade-in">
                    <h3 className="text-2xl font-bold text-slate-800">Photography Guide</h3>
                    <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl">
                        <p className="text-slate-700 leading-relaxed">{travelData.photography.basic_guide}</p>
                    </div>
                    
                    <h4 className="text-xl font-bold text-slate-800 mt-6">Technical Phone Settings</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-900 text-white rounded-2xl text-center shadow-lg shadow-slate-200">
                            <p className="text-xs text-slate-400 uppercase mb-1 tracking-widest">ISO</p>
                            <p className="text-xl font-bold">{travelData.photography.technical_settings.iso}</p>
                        </div>
                        <div className="p-4 bg-slate-900 text-white rounded-2xl text-center shadow-lg shadow-slate-200">
                            <p className="text-xs text-slate-400 uppercase mb-1 tracking-widest">Shutter</p>
                            <p className="text-xl font-bold">{travelData.photography.technical_settings.shutter_speed}</p>
                        </div>
                         <div className="p-4 bg-slate-900 text-white rounded-2xl text-center shadow-lg shadow-slate-200">
                            <p className="text-xs text-slate-400 uppercase mb-1 tracking-widest">Aperture</p>
                            <p className="text-xl font-bold">{travelData.photography.technical_settings.aperture}</p>
                        </div>
                    </div>
                    {travelData.photography.technical_settings.notes && (
                        <p className="text-sm text-slate-500 italic text-center">{travelData.photography.technical_settings.notes}</p>
                    )}
                </div>
             );
        case 'guide':
            return (
                <div className="space-y-8 animate-fade-in">
                    <h3 className="text-2xl font-bold text-slate-800">Trip Essentials</h3>
                    
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-700">Transport System</h4>
                        <p className="text-slate-600 bg-white p-4 rounded-xl border border-slate-100">{travelData.trip_guide.transport_system}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                             <h4 className="font-bold text-slate-700 mb-3">Travel Tips</h4>
                             <ul className="list-disc list-inside space-y-2 text-slate-600">
                                {travelData.trip_guide.travel_tips.map((t, i) => <li key={i}>{t}</li>)}
                             </ul>
                        </div>
                        <div>
                             <h4 className="font-bold text-slate-700 mb-3">Packing Suggestions</h4>
                             <ul className="list-disc list-inside space-y-2 text-slate-600">
                                {travelData.trip_guide.packing_suggestions.map((t, i) => <li key={i}>{t}</li>)}
                             </ul>
                        </div>
                    </div>

                     <div className="p-6 bg-red-50 border border-red-100 rounded-2xl">
                        <h4 className="font-bold text-red-800 mb-2">⚠ Common Scams</h4>
                        <p className="text-red-700 text-sm">{travelData.trip_guide.common_scams}</p>
                     </div>
                </div>
            );
        default:
            return null;
    }
  }

  const tabs: {id: TabSection, label: string}[] = [
      { id: 'overview', label: 'Overview' },
      { id: 'disaster', label: 'Disaster Profile' },
      { id: 'safety', label: 'Safety Measures' },
      { id: 'itinerary', label: 'Basic Itinerary' },
      { id: 'weather', label: 'Weather' },
      { id: 'photography', label: 'Photography' },
      { id: 'guide', label: 'Trip Guide' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-6">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-slate-900 tracking-tight">Vantage</h2>
        <p className="text-slate-500 font-light text-lg">Intelligent Geo-AI System • Powered by Gemini 3.0 Pro</p>
      </div>

      <div className="bg-white rounded-[2rem] p-3 shadow-xl shadow-slate-200/60 border border-slate-100 flex flex-col md:flex-row gap-3 max-w-3xl mx-auto">
        <input 
          type="text" 
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Where are you going?"
          className="flex-1 bg-transparent px-6 py-4 text-slate-800 text-lg focus:outline-none placeholder-slate-400 font-medium"
        />
        <div className="flex space-x-2 p-1">
          <button
            className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 shadow-md ${
              loading 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20'
            }`}
            onClick={handleDeepPlan}
            disabled={loading}
          >
            {loading && mode === 'plan' ? 'Thinking...' : 'Full Plan'}
          </button>
          <button
            className={`px-8 py-3 rounded-2xl font-semibold transition-all duration-300 ${
              loading
                ? 'bg-slate-50 text-slate-300 cursor-not-allowed'
                : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300'
            }`}
            onClick={handleHiddenSpots}
            disabled={loading}
          >
            {loading && mode === 'hidden' ? 'Searching...' : 'Hidden Spots'}
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 md:p-12 min-h-[600px] flex flex-col shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)]">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full py-24 space-y-8 flex-grow">
                <div className="w-20 h-20 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                <div className="text-center space-y-2">
                    <p className="text-xl text-slate-800 font-semibold">
                        {mode === 'plan' ? 'Analyzing Ecosystem...' : 'Locating Hidden Gems...'}
                    </p>
                    <p className="text-slate-500">
                        {mode === 'plan' 
                            ? 'Processing weather data, safety profiles, and travel logistics' 
                            : 'Scanning maps and creating visual previews'}
                    </p>
                </div>
            </div>
        ) : error ? (
            <div className="flex flex-col items-center justify-center h-full py-20 flex-grow">
                <div className="bg-red-50 border border-red-100 rounded-3xl p-8 max-w-lg text-center">
                     <p className="text-red-500 font-bold mb-4">{error}</p>
                     <button 
                        onClick={() => mode === 'plan' ? handleDeepPlan() : handleHiddenSpots()}
                        className="bg-red-600 text-white px-6 py-2 rounded-xl"
                    >
                        Retry
                    </button>
                </div>
            </div>
        ) : (
            <div className="flex-grow flex flex-col">
                {mode === 'plan' && travelData && (
                    <div className="flex flex-col h-full">
                        {/* Tab Navigation */}
                        <div className="flex flex-wrap gap-3 mb-10 pb-6 border-b border-slate-100">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${
                                        activeTab === tab.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/25 transform scale-105'
                                        : 'bg-white text-slate-500 border border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                             <button 
                                onClick={handleSavePlan}
                                className="ml-auto px-6 py-3 rounded-2xl text-sm font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-lg flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download Data
                            </button>
                        </div>

                        {/* Tab Content */}
                        <div className="flex-grow mb-12 min-h-[400px]">
                            {renderContent()}
                        </div>
                        
                        {/* Chat Interface */}
                        <div className="mt-8 border-t border-slate-100 pt-10 animate-fade-in">
                            <div className="flex items-center space-x-3 mb-6">
                                <span className="text-2xl">💬</span>
                                <h3 className="text-2xl font-bold text-slate-900">Ask Gemini 3</h3>
                            </div>
                            
                            <div className="bg-gray-50 rounded-[2rem] border border-gray-100 overflow-hidden flex flex-col h-[500px] shadow-inner">
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {chatMessages.map((msg) => (
                                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-6 py-4 shadow-sm ${
                                                msg.role === 'user' 
                                                ? 'bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-tr-sm' 
                                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-sm'
                                            }`}>
                                                <p className="text-md leading-relaxed">{msg.text}</p>
                                            </div>
                                        </div>
                                    ))}
                                    {chatLoading && (
                                        <div className="flex justify-start">
                                            <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-6 py-4 flex space-x-2 items-center shadow-sm">
                                                <span className="text-xs text-slate-400 font-medium mr-2">Thinking</span>
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                            </div>
                                        </div>
                                    )}
                                    <div ref={chatBottomRef} />
                                </div>
                                
                                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-slate-100 flex gap-3">
                                    <input 
                                        type="text" 
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        placeholder="Ask for details, hotels, or more..."
                                        className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder-slate-400"
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={chatLoading || !chatInput.trim()}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 rounded-2xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        Send
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {mode === 'hidden' && hiddenSpots && (
                    <div className="space-y-8 animate-fade-in">
                        <div className="flex items-center space-x-2 mb-8 pb-6 border-b border-slate-100">
                             <h3 className="text-3xl font-bold text-slate-900 m-0">5 Exclusive Hidden Gems</h3>
                             <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-sm font-medium">Verified by AI</span>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-8">
                            {hiddenSpots.map((spot, idx) => (
                                <div key={idx} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-lg shadow-slate-100/50 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-500 group flex flex-col md:flex-row gap-8">
                                    {/* Image Section */}
                                    <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 relative shadow-inner">
                                        {hiddenSpotImages[spot.name] ? (
                                            <img 
                                                src={hiddenSpotImages[spot.name]} 
                                                alt={spot.name} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                                                <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-500 rounded-full animate-spin mb-2"></div>
                                                <span className="text-xs font-medium">Visualizing...</span>
                                            </div>
                                        )}
                                        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold text-slate-800 shadow-sm">
                                            #{idx + 1}
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="flex-1 flex flex-col justify-center space-y-4">
                                        <h4 className="text-2xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                                            {spot.name}
                                        </h4>
                                        <p className="text-slate-600 leading-relaxed text-lg">
                                            {spot.description}
                                        </p>
                                        <div className="pt-2 flex items-center text-slate-500 text-sm font-medium bg-slate-50 px-4 py-3 rounded-xl border border-slate-100 w-fit">
                                            <span className="mr-2">📍</span>
                                            {spot.location_hint}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                {!travelData && !hiddenSpots && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 py-24 opacity-60">
                        <span className="text-7xl mb-6 grayscale opacity-50">🌍</span>
                        <p className="text-2xl font-light">Enter a location to start planning</p>
                    </div>
                )}
            </div>
        )}
      </div>
    </div>
  );
};
