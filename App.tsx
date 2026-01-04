import React, { useState, useRef, useEffect } from 'react';
import { Bot, Sparkles, AlertCircle, Volume2, Mic2, Fingerprint, History, Trash2 } from 'lucide-react';
import VoiceSelector from './components/VoiceSelector.tsx';
import VoiceCloner from './components/VoiceCloner.tsx';
import LanguageSelector from './components/LanguageSelector.tsx';
import HistoryItem from './components/HistoryItem.tsx';
import { AVAILABLE_VOICES, SAMPLE_PROMPTS } from './constants.ts';
import { TtsStatus, CustomVoice, GeneratedAudio } from './types.ts';
import { generateSpeech } from './services/geminiService.ts';

const STORAGE_KEY = 'vocalforge_persistent_history_v3';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'prebuilt' | 'cloning'>('prebuilt');
  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [selectedPrebuiltId, setSelectedPrebuiltId] = useState(AVAILABLE_VOICES[0].id);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>([]);
  const [selectedCustomId, setSelectedCustomId] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedAudio[]>([]);
  const [status, setStatus] = useState<TtsStatus>(TtsStatus.IDLE);
  const [error, setError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          const restoredHistory = await Promise.all(parsed.map(async (item: any) => {
            if (item.audioBase64) {
              const res = await fetch(item.audioBase64);
              const blob = await res.blob();
              return { ...item, audioBlob: blob };
            }
            return item;
          }));
          setHistory(restoredHistory);
        }
      } catch (e) { console.error("History recovery failed", e); }
    };
    loadData();
  }, []);

  const persistHistory = async (newHistory: GeneratedAudio[]) => {
    try {
      const serializable = await Promise.all(newHistory.slice(0, 15).map(async (item) => {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(item.audioBlob);
        });
        const base64 = await base64Promise;
        const { audioBlob, ...rest } = item;
        return { ...rest, audioBase64: base64 };
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
    } catch (e) { console.warn("Storage quota full", e); }
  };

  const isGenerating = status === TtsStatus.GENERATING;

  const handleAddCustomVoice = (voice: CustomVoice) => {
    setCustomVoices(prev => [...prev, voice]);
    setSelectedCustomId(voice.id);
  };

  const handleGenerate = async () => {
    if (!text.trim()) return;
    
    let cloningSample: Blob | undefined;
    let displayVoiceName = '';
    let apiVoiceName = '';

    if (activeTab === 'cloning') {
      const voice = customVoices.find(v => v.id === selectedCustomId);
      if (!voice) {
        setError("Please select or record a voice clone first.");
        return;
      }
      cloningSample = voice.previewBlob;
      displayVoiceName = voice.name;
    } else {
      const voice = AVAILABLE_VOICES.find(v => v.id === selectedPrebuiltId);
      apiVoiceName = selectedPrebuiltId;
      displayVoiceName = voice?.name || apiVoiceName;
    }

    setError(null);
    setStatus(TtsStatus.GENERATING);

    try {
      const languageParam = selectedLanguage !== 'auto' ? selectedLanguage : undefined;
      const { blob } = await generateSpeech(text, apiVoiceName, languageParam, cloningSample);
      
      const newEntry: GeneratedAudio = {
        id: crypto.randomUUID(),
        text: text.trim(),
        voiceName: displayVoiceName,
        audioBlob: blob,
        createdAt: Date.now(),
        isCloned: activeTab === 'cloning',
        language: selectedLanguage === 'auto' ? 'Auto' : selectedLanguage
      };

      const newHistory = [newEntry, ...history];
      setHistory(newHistory);
      persistHistory(newHistory);
      
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
      setStatus(TtsStatus.IDLE);
      setText('');
    } catch (err: any) {
      console.error(err);
      setStatus(TtsStatus.ERROR);
      setError(err.message || "Synthesis failed. Check your API key and network.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200">
      <audio ref={audioRef} className="hidden" onEnded={() => setStatus(TtsStatus.IDLE)} />
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px]" />
      </div>
      <div className="relative z-10 container mx-auto px-4 py-8">
        <header className="mb-12 flex flex-col items-center text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-500/10 rounded-2xl mb-4 ring-1 ring-indigo-500/30">
            <Bot size={32} className="text-indigo-400 mr-2" />
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-blue-400">VocalForge AI</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">AI Voice & Cloning Studio</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">High-fidelity voice synthesis and zero-shot voice cloning powered by Gemini Native Audio.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
              <div className="flex border-b border-slate-800">
                 <button onClick={() => setActiveTab('prebuilt')} className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 ${activeTab === 'prebuilt' ? 'bg-slate-800/50 text-white border-b-2 border-indigo-500' : 'text-slate-500'}`}><Mic2 size={18} /> Prebuilt Voices</button>
                 <button onClick={() => setActiveTab('cloning')} className={`flex-1 py-4 font-medium flex items-center justify-center gap-2 ${activeTab === 'cloning' ? 'bg-slate-800/50 text-white border-b-2 border-indigo-500' : 'text-slate-500'}`}><Fingerprint size={18} /> Voice Cloning</button>
              </div>
              <div className="p-8">
                {activeTab === 'prebuilt' ? <VoiceSelector selectedVoiceId={selectedPrebuiltId} onSelect={setSelectedPrebuiltId} disabled={isGenerating} /> : <VoiceCloner customVoices={customVoices} selectedVoiceId={selectedCustomId} onAddVoice={handleAddCustomVoice} onSelectVoice={setSelectedCustomId} onDeleteVoice={(id) => setCustomVoices(v => v.filter(x => x.id !== id))} disabled={isGenerating} />}
              </div>
            </div>

            <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-white"><Sparkles className="text-amber-400" /> Synthesize Text</h2>
                  <div className="w-64"><LanguageSelector selectedLanguage={selectedLanguage} onSelect={setSelectedLanguage} disabled={isGenerating} /></div>
               </div>
               <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type what you want the AI to say..." className="w-full h-48 bg-slate-950/50 border border-slate-700 rounded-2xl p-6 text-lg focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none" disabled={isGenerating} />
               {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 flex items-center gap-3"><AlertCircle size={20} />{error}</div>}
               <div className="mt-6 flex justify-end">
                 <button onClick={handleGenerate} disabled={!text.trim() || isGenerating} className={`px-10 py-4 rounded-2xl font-bold text-white text-lg transition-all ${!text.trim() || isGenerating ? 'bg-slate-700 opacity-50' : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:shadow-indigo-500/20 shadow-xl hover:scale-105'}`}>
                   {isGenerating ? "Synthesizing..." : "Generate Voice"}
                 </button>
               </div>
            </section>
          </div>

          <aside className="lg:col-span-4 h-fit">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-2xl h-[calc(100vh-12rem)] flex flex-col">
              <h3 className="flex items-center gap-2 font-bold text-lg mb-6"><History size={20} className="text-indigo-400" /> Studio History</h3>
              <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                {history.length === 0 ? <p className="text-slate-500 text-center py-12">No files generated yet.</p> : history.map((item) => <HistoryItem key={item.id} item={item} onDelete={(id) => { const u = history.filter(x => x.id !== id); setHistory(u); persistHistory(u); }} />)}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};
export default App;