import React, { useState, useEffect } from 'react';
import { Bot, Sparkles, AlertCircle, Volume2, Mic2, Fingerprint } from 'lucide-react';
import VoiceSelector from './components/VoiceSelector';
import VoiceCloner from './components/VoiceCloner';
import HistoryItem from './components/HistoryItem';
import { AVAILABLE_VOICES, SAMPLE_PROMPTS } from './constants';
import { GeneratedAudio, TtsStatus, CustomVoice } from './types';
import { generateSpeech } from './services/geminiService';

const App: React.FC = () => {
  // Tabs
  const [activeTab, setActiveTab] = useState<'prebuilt' | 'cloning'>('prebuilt');

  // State
  const [text, setText] = useState('');
  
  // Voice Selection State
  const [selectedPrebuiltId, setSelectedPrebuiltId] = useState(AVAILABLE_VOICES[0].id);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);

  // App Status
  const [status, setStatus] = useState<TtsStatus>(TtsStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedAudio[]>([]);

  // Derived state
  const isGenerating = status === TtsStatus.GENERATING;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;

  // Handlers
  const handleAddCustomVoice = (voice: CustomVoice) => {
    setCustomVoices(prev => [...prev, voice]);
    setSelectedCustomId(voice.id);
  };

  const handleDeleteCustomVoice = (id: string) => {
    setCustomVoices(prev => prev.filter(v => v.id !== id));
    if (selectedCustomId === id) setSelectedCustomId(null);
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    // Validation
    if (activeTab === 'cloning' && !selectedCustomId) {
       setError("Please select or create a custom voice first.");
       return;
    }

    setError(null);
    setStatus(TtsStatus.GENERATING);

    try {
      // Logic for selecting the underlying model voice
      let apiVoiceName = 'Puck'; // Default
      let displayVoiceName = 'Unknown';
      let isCloned = false;

      if (activeTab === 'prebuilt') {
        apiVoiceName = selectedPrebuiltId;
        displayVoiceName = AVAILABLE_VOICES.find(v => v.id === selectedPrebuiltId)?.name || selectedPrebuiltId;
      } else {
        // Voice Cloning Simulation Logic
        // Since the public API doesn't support real-time arbitrary voice cloning yet,
        // we simulate the experience by mapping the custom voice to a high-quality existing voice
        // or effectively "fallback" while preserving the UI illusion for the demo.
        // In a real production app with Enterprise access, this would send the 'voice.previewBlob' to a training endpoint.
        const customVoice = customVoices.find(v => v.id === selectedCustomId);
        if (customVoice) {
          // For variety, we could hash the ID to pick a consistent backing voice, 
          // but for quality, we'll default to a neutral, high-quality one like 'Charon' or 'Kore'.
          // Let's toggle based on random property or just pick 'Fenrir' for a distinct "processed" feel.
          apiVoiceName = 'Charon'; 
          displayVoiceName = customVoice.name;
          isCloned = true;
        }
      }

      // Use the actual service
      const { blob } = await generateSpeech(text, apiVoiceName);
      
      const newItem: GeneratedAudio = {
        id: crypto.randomUUID(),
        text,
        voiceName: displayVoiceName,
        timestamp: Date.now(),
        audioBlob: blob,
        isCloned
      };

      setHistory(prev => [newItem, ...prev]);
      setStatus(TtsStatus.IDLE);
      
    } catch (err: any) {
      console.error(err);
      setStatus(TtsStatus.ERROR);
      setError(err.message || "Failed to generate speech. Check API Key or try again.");
    }
  };

  const handleSelectSample = (sample: string) => {
    setText(sample);
  };

  const handleDeleteHistory = (id: string) => {
    setHistory(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 selection:bg-indigo-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Header */}
        <header className="mb-12 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 ring-1 ring-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
            <Bot size={32} className="text-indigo-400 mr-2" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">
              VocalForge AI
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Voice Cloning & Generation
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto text-lg">
            Create ultra-realistic speech using Gemini 2.5 Flash.
          </p>
        </header>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: Input & Controls (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Voice Source Tabs */}
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden">
              <div className="flex border-b border-slate-800">
                 <button
                   onClick={() => setActiveTab('prebuilt')}
                   className={`flex-1 py-4 font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-colors ${activeTab === 'prebuilt' ? 'bg-slate-800 text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <Mic2 size={18} /> Prebuilt Voices
                 </button>
                 <button
                   onClick={() => setActiveTab('cloning')}
                   className={`flex-1 py-4 font-medium text-sm sm:text-base flex items-center justify-center gap-2 transition-colors ${activeTab === 'cloning' ? 'bg-slate-800 text-white border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'}`}
                 >
                    <Fingerprint size={18} /> Voice Cloning
                 </button>
              </div>

              <div className="p-6">
                {activeTab === 'prebuilt' ? (
                  <VoiceSelector 
                    selectedVoiceId={selectedPrebuiltId} 
                    onSelect={setSelectedPrebuiltId}
                    disabled={isGenerating}
                  />
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <VoiceCloner
                      customVoices={customVoices}
                      selectedVoiceId={selectedCustomId}
                      onAddVoice={handleAddCustomVoice}
                      onSelectVoice={setSelectedCustomId}
                      onDeleteVoice={handleDeleteCustomVoice}
                      disabled={isGenerating}
                    />
                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200 flex gap-2">
                       <AlertCircle size={16} className="shrink-0" />
                       <p>Note: This is a simulation for the demo interface. Real-time voice cloning requires specific enterprise endpoint configuration. The output will map to a high-fidelity proxy voice.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Text Input */}
            <section className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6">
               <div className="flex justify-between items-center mb-4">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                    <Sparkles className="text-amber-400" />
                    Input Text
                  </h2>
                  <div className="text-xs font-mono text-slate-500">
                    {charCount} chars | {wordCount} words
                  </div>
               </div>

               <div className="relative">
                 <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Enter the text you want the AI to speak..."
                    className="w-full h-48 bg-slate-950/50 border border-slate-700 rounded-xl p-4 text-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all resize-y"
                    disabled={isGenerating}
                 />
                 
                 {/* Sample Prompts (Quick fill) */}
                 <div className="mt-3 flex flex-wrap gap-2">
                    <span className="text-xs text-slate-500 py-1">Try a sample:</span>
                    {SAMPLE_PROMPTS.map((prompt, i) => (
                      <button 
                        key={i}
                        onClick={() => handleSelectSample(prompt)}
                        className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1 rounded-full transition-colors border border-slate-700"
                        disabled={isGenerating}
                      >
                        {prompt.slice(0, 20)}...
                      </button>
                    ))}
                 </div>
               </div>

               {/* Error Message */}
               {error && (
                 <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 animate-in fade-in slide-in-from-top-2">
                   <AlertCircle size={20} />
                   <span>{error}</span>
                 </div>
               )}

               {/* Generate Button */}
               <div className="mt-6 flex justify-end">
                 <button
                    onClick={handleGenerate}
                    disabled={!text.trim() || isGenerating}
                    className={`
                      relative overflow-hidden px-8 py-3 rounded-xl font-bold text-white text-lg transition-all duration-300
                      ${!text.trim() || isGenerating 
                        ? 'bg-slate-700 cursor-not-allowed opacity-50' 
                        : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:scale-[1.02] active:scale-[0.98]'
                      }
                    `}
                 >
                    {isGenerating ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Synthesizing...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Generate Voice <Volume2 size={20} />
                      </span>
                    )}
                 </button>
               </div>
            </section>
          </div>

          {/* RIGHT COLUMN: History & Output (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl p-6 h-full flex flex-col">
              <h2 className="text-xl font-semibold text-white mb-6 flex items-center justify-between">
                <span>Generation History</span>
                <span className="text-sm font-normal text-slate-500 bg-slate-800 px-2 py-0.5 rounded-md">
                  {history.length}
                </span>
              </h2>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1 max-h-[600px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800/30">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-500 border-2 border-dashed border-slate-800 rounded-xl">
                    <Volume2 size={40} className="mb-2 opacity-50" />
                    <p>No generations yet</p>
                    <p className="text-xs">Select a voice and click Generate</p>
                  </div>
                ) : (
                  history.map((item) => (
                    <HistoryItem 
                      key={item.id} 
                      item={item} 
                      onDelete={handleDeleteHistory}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default App;