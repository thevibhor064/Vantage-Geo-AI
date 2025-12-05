import React, { useState, useEffect } from 'react';
import { generateDroneVideo, generateReferenceImage, openApiKeySelection } from '../services/genai';
import { VideoGenerationState } from '../types';

interface VeoGeneratorProps {
  initialLocationName?: string;
}

export const VeoGenerator: React.FC<VeoGeneratorProps> = ({ initialLocationName }) => {
  const [locationName, setLocationName] = useState(initialLocationName || '');
  const [videoState, setVideoState] = useState<VideoGenerationState>({ status: 'idle' });
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [loadingStep, setLoadingStep] = useState<string>('');

  useEffect(() => {
    if (initialLocationName) {
      setLocationName(initialLocationName);
    }
  }, [initialLocationName]);

  const handleGenerate = async () => {
    if (!locationName) return;

    setVideoState({ status: 'generating' });
    setLoadingStep('Locating and capturing view (Image)...');

    try {
      // Step 1: Generate Reference Image (Simulating "Search")
      // Now uses gemini-2.5-flash-image which is more likely to work on free tier
      const base64Data = await generateReferenceImage(locationName, aspectRatio);
      
      // Step 2: Animate with Veo
      setLoadingStep('Simulating drone flight physics (Veo 3.1)...');
      const prompt = `Cinematic drone view of ${locationName}, realistic, high quality, 4k, continuous movement, detailed surroundings`;
      
      const videoUrl = await generateDroneVideo(base64Data, prompt, aspectRatio);
      
      setVideoState({ status: 'completed', videoUri: videoUrl });
    } catch (error: any) {
      setVideoState({ status: 'error', error: error.message || 'Generation failed' });
    } finally {
        setLoadingStep('');
    }
  };

  const handleChangeKey = () => {
      openApiKeySelection();
      // Reset state so user can try again after changing key
      setVideoState({ status: 'idle' });
  };

  const handleSaveVideo = () => {
      if (videoState.videoUri) {
          const a = document.createElement('a');
          a.href = videoState.videoUri;
          a.download = `veo_drone_${locationName.replace(/\s+/g, '_')}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
      }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-slate-800 pb-6">
        <h2 className="text-3xl font-bold text-white mb-2">Veo Drone Simulator</h2>
        <p className="text-slate-400">
          We will find the best view of <span className="text-blue-400 font-semibold">{locationName || 'your location'}</span> using AI and animate it into a realistic drone video.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Controls */}
        <div className="md:col-span-1 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location Name</label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. Grand Canyon"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Aspect Ratio</label>
            <div className="flex space-x-4">
              <button
                onClick={() => setAspectRatio('16:9')}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm transition-all ${aspectRatio === '16:9' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                Landscape
              </button>
              <button
                onClick={() => setAspectRatio('9:16')}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm transition-all ${aspectRatio === '9:16' ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-700 text-slate-400 hover:border-slate-500'}`}
              >
                Portrait
              </button>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={!locationName || videoState.status === 'generating'}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform hover:-translate-y-1 ${
              !locationName
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : videoState.status === 'generating'
                ? 'bg-blue-800 text-blue-200 cursor-wait'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
            }`}
          >
            {videoState.status === 'generating' ? 'Generating...' : 'Start Simulation'}
          </button>
          
          {videoState.status === 'error' && (
             <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-300 text-sm animate-fade-in">
                 <p className="font-semibold mb-2">Generation Failed</p>
                 <p className="mb-4 text-xs leading-relaxed">{videoState.error}</p>
                 <button 
                    onClick={handleChangeKey}
                    className="w-full bg-red-800 hover:bg-red-700 text-white py-2 rounded-lg text-xs font-medium transition-colors border border-red-600"
                 >
                     Open Project Selector
                 </button>
                 <p className="mt-2 text-xs text-red-400">
                     Note: Select a project that has "Billing Enabled" in Google Cloud Console.
                 </p>
             </div>
          )}
        </div>

        {/* Output */}
        <div className="md:col-span-2 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4 min-h-[400px] relative overflow-hidden">
          {videoState.status === 'completed' && videoState.videoUri ? (
            <div className="w-full h-full flex flex-col items-center animate-fade-in">
              <video 
                src={videoState.videoUri} 
                controls 
                autoPlay 
                loop 
                className={`rounded-lg shadow-2xl w-full max-h-[500px] ${aspectRatio === '9:16' ? 'max-w-xs' : ''}`} 
              />
              <div className="mt-6 flex items-center space-x-4">
                  <p className="text-emerald-400 flex items-center">
                    <span className="mr-2">✨</span> Generated by Veo 3.1
                  </p>
                  <button 
                    onClick={handleSaveVideo}
                    className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors border border-slate-700"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      <span>Save Video</span>
                  </button>
              </div>
            </div>
          ) : videoState.status === 'generating' ? (
            <div className="text-center space-y-6 z-10">
              <div className="relative w-24 h-24 mx-auto">
                 <div className="absolute inset-0 border-4 border-blue-900 rounded-full"></div>
                 <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
              </div>
              <div>
                  <p className="text-xl text-white font-medium animate-pulse">{loadingStep}</p>
                  <p className="text-slate-500 text-sm mt-2">This may take a minute or two</p>
              </div>
            </div>
          ) : (
             <div className="text-slate-600 text-center">
                <div className="mb-6 relative mx-auto w-32 h-32 opacity-30">
                     <div className="absolute inset-0 bg-blue-500 rounded-full blur-2xl"></div>
                     <svg className="relative w-full h-full text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                     </svg>
                </div>
                <p className="text-lg">Enter location and start simulation</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};