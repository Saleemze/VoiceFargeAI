import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { 
  Bot, Sparkles, AlertCircle, Volume2, Mic2, Fingerprint, History, Trash2, 
  Check, Play, Pause, Loader2, Download, Globe, Upload, X, Plus, CheckCircle2, 
  RotateCcw, ArrowRight, StopCircle 
} from 'lucide-react';
import { GoogleGenAI, Modality } from "@google/genai";

// --- TYPES ---
export interface VoiceOption {
  id: string;
  name: string;
  gender: 'Male' | 'Female';
  description: string;
  color: string;
}

export interface CustomVoice {
  id: string;
  name: string;
  previewBlob: Blob;
  createdAt: number;
}

export enum TtsStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}

export interface GeneratedAudio {
  id: string;
  text: string;
  voiceName: string;
  audioBlob: Blob;
  createdAt: number;
  isCloned?: boolean;
  language?: string;
}

// --- CONSTANTS ---
const AVAILABLE_VOICES: VoiceOption[] = [
  { id: 'Kore', name: 'Kore', gender: 'Female', description: 'Warm, nurturing, and natural.', color: 'bg-rose-500' },
  { id: 'Zephyr', name: 'Zephyr', gender: 'Female', description: 'Soft, airy, and melodic.', color: 'bg-teal-500' },
  { id: 'Aoede', name: 'Aoede', gender: 'Female', description: 'Sophisticated and professional.', color: 'bg-purple-500' },
  { id: 'Eos', name: 'Eos', gender: 'Female', description: 'Bright and energetic.', color: 'bg-amber-500' },
  { id: 'Puck', name: 'Puck', gender: 'Male', description: 'Deep and authoritative.', color: 'bg-blue-500' },
  { id: 'Charon', name: 'Charon', gender: 'Male', description: 'Steady and reliable.', color: 'bg-indigo-500' },
  { id: 'Orpheus', name: 'Orpheus', gender: 'Male', description: 'Poetic and expressive.', color: 'bg-emerald-500' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'Male', description: 'Grit and intensity.', color: 'bg-orange-500' }
];

const SUPPORTED_LANGUAGES = [
  { label: "Global", options: [{ code: "en", name: "English" }, { code: "es", name: "Spanish" }, { code: "fr", name: "French" }, { code: "de", name: "German" }, { code: "it", name: "Italian" }] },
  { label: "Asian", options: [{ code: "ja", name: "Japanese" }, { code: "zh", name: "Chinese" }, { code: "ko", name: "Korean" }, { code: "hi", name: "Hindi" }] }
];

const STORAGE_KEY = 'vocalforge_persistent_history_v3';

// --- UTILS ---
function decodeBase64(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number = 24000, numChannels: number = 1): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
  }
  return buffer;
}

function bufferToWave(abuffer: AudioBuffer, len: number): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = len * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let pos = 0;
  const setUint16 = (d: number) => { view.setUint16(pos, d, true); pos += 2; };
  const setUint32 = (d: number) => { view.setUint32(pos, d, true); pos += 4; };

  setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
  setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
  setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164); setUint32(length - pos - 4);

  const channels = [];
  for (let i = 0; i < numOfChan; i++) channels.push(abuffer.getChannelData(i));
  let offset = 0;
  for (let p = 0; p < len; p++) {
    for (let i = 0; i < numOfChan; i++) {
      let s = Math.max(-1, Math.min(1, channels[i][p]));
      s = (0.5 + s < 0 ? s * 32768 : s * 32767) | 0;
      view.setInt16(44 + offset, s, true);
      offset += 2;
    }
  }
  return new Blob([buffer], { type: 'audio/wav' });
}

// --- SERVICE ---
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((r) => { const f = new FileReader(); f.onloadend = () => r((f.result as string).split(',')[1]); f.readAsDataURL(blob); });
}

async function generateSpeech(text: string, voiceName: string, languageName?: string, audioReference?: Blob): Promise<{ blob: Blob; audioBuffer: AudioBuffer }> {
  const apiKey = process.env.API_KEY;
  if (!apiKey || apiKey === 'undefined') throw new Error("API Key is missing. Set API_KEY in Netlify Environment Variables.");
  const ai = new GoogleGenAI({ apiKey });
  const model = "gemini-2.5-flash-preview-tts";
  
  let contents: any;
  if (audioReference) {
    const base64Ref = await blobToBase64(audioReference);
    contents = [{ parts: [{ inlineData: { data: base64Ref, mimeType: audioReference.type || 'audio/wav' } }, { text: `Mimic the voice in this sample for: "${text}"` }] }];
  } else {
    const lang = languageName && languageName !== 'auto' ? `[Language: ${languageName}] ` : "";
    contents = [{ parts: [{ text: `${lang}${text}` }] }];
  }

  const response = await ai.models.generateContent({
    model, contents, config: { responseModalities: [Modality.AUDIO], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } }
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
  if (!base64Audio) throw new Error("No audio data returned.");
  const pcmData = decodeBase64(base64Audio);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  const audioBuffer = await decodeAudioData(pcmData, audioContext, 24000, 1);
  const blob = bufferToWave(audioBuffer, audioBuffer.length);
  await audioContext.close();
  return { blob, audioBuffer };
}

// --- COMPONENTS ---

const LanguageSelector = ({ selectedLanguage, onSelect, disabled }: any) => (
  <div className="relative">
    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
    <select value={selectedLanguage} onChange={(e) => onSelect(e.target.value)} disabled={disabled} className="w-full bg-slate-950/50 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-200">
      <option value="auto">Auto Detect</option>
      {SUPPORTED_LANGUAGES.map(g => (
        <optgroup key={g.label} label={g.label}>
          {g.options.map(l => <option key={l.code} value={l.name}>{l.name}</option>)}
        </optgroup>
      ))}
    </select>
  </div>
);

const VoiceSelector = ({ selectedVoiceId, onSelect, disabled }: any) => {
  const [previewing, setPreviewing] = useState<string | null>(null);
  const audioRef = useRef(new Audio());

  const handlePreview = async (e: any, v: any) => {
    e.stopPropagation();
    if (previewing === v.id) { audioRef.current.pause(); setPreviewing(null); return; }
    setPreviewing(v.id);
    try {
      const { blob } = await generateSpeech(`Hello, I am ${v.name}.`, v.id);
      audioRef.current.src = URL.createObjectURL(blob);
      audioRef.current.play();
      audioRef.current.onended = () => setPreviewing(null);
    } catch { setPreviewing(null); }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {AVAILABLE_VOICES.map(v => (
        <button key={v.id} onClick={() => onSelect(v.id)} disabled={disabled} className={`relative p-5 rounded-2xl border-2 text-left transition-all ${selectedVoiceId === v.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'}`}>
          <div className="flex justify-between items-center mb-2">
            <div className={`w-10 h-10 rounded-xl ${v.color} flex items-center justify-center text-white font-bold`}>{v.name[0]}</div>
            <div className="flex gap-2">
              <div onClick={(e) => handlePreview(e, v)} className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400">
                {previewing === v.id ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              </div>
              {selectedVoiceId === v.id && <Check size={16} className="text-emerald-500" />}
            </div>
          </div>
          <h3 className="font-bold text-white">{v.name}</h3>
          <p className="text-xs text-slate-500 line-clamp-1">{v.description}</p>
        </button>
      ))}
    </div>
  );
};

const HistoryItem = ({ item, onDelete }: any) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(new Audio());
  const url = useRef(URL.createObjectURL(item.audioBlob));

  return (
    <div className={`p-4 rounded-xl border border-slate-700 bg-slate-800/50 mb-4`}>
      <div className="flex justify-between mb-2">
        <span className="text-xs font-bold bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded">{item.voiceName}</span>
        <button onClick={() => onDelete(item.id)} className="text-slate-500 hover:text-red-400"><Trash2 size={14} /></button>
      </div>
      <p className="text-sm text-slate-300 italic mb-3 line-clamp-2">"{item.text}"</p>
      <div className="flex items-center gap-3">
        <button onClick={() => {
          if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
          else { audioRef.current.src = url.current; audioRef.current.play(); setIsPlaying(true); audioRef.current.onended = () => setIsPlaying(false); }
        }} className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center">
          {isPlaying ? <Pause size={18} fill="white" /> : <Play size={18} fill="white" className="ml-1" />}
        </button>
        <button onClick={() => { const a = document.createElement('a'); a.href = url.current; a.download = 'voice.wav'; a.click(); }} className="p-2 text-slate-400 hover:text-white"><Download size={18} /></button>
      </div>
    </div>
  );
};

// --- MAIN APP ---

const App = () => {
  const [activeTab, setActiveTab] = useState('prebuilt');
  const [text, setText] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].id);
  const [history, setHistory] = useState<GeneratedAudio[]>([]);
  const [status, setStatus] = useState(TtsStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef(new Audio());

  const handleGenerate = async () => {
    if (!text.trim()) return;
    setStatus(TtsStatus.GENERATING);
    setError(null);
    try {
      const { blob } = await generateSpeech(text, selectedVoice, selectedLanguage);
      const newEntry: GeneratedAudio = { id: crypto.randomUUID(), text: text.trim(), voiceName: selectedVoice, audioBlob: blob, createdAt: Date.now() };
      setHistory([newEntry, ...history]);
      audioRef.current.src = URL.createObjectURL(blob);
      audioRef.current.play();
      setStatus(TtsStatus.IDLE);
      setText('');
    } catch (err: any) {
      setError(err.message);
      setStatus(TtsStatus.ERROR);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 text-center">
          <div className="inline-flex items-center p-3 bg-indigo-500/10 rounded-2xl mb-4">
            <Bot size={32} className="text-indigo-400 mr-2" />
            <span className="text-2xl font-bold text-indigo-400">VocalForge AI</span>
          </div>
          <h1 className="text-4xl font-bold text-white">Voice Cloning Studio</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <VoiceSelector selectedVoiceId={selectedVoice} onSelect={setSelectedVoice} disabled={status === TtsStatus.GENERATING} />
            </div>

            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-white"><Sparkles className="text-amber-400" /> Synthesis</h2>
                <div className="w-48"><LanguageSelector selectedLanguage={selectedLanguage} onSelect={setSelectedLanguage} disabled={status === TtsStatus.GENERATING} /></div>
              </div>
              <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Enter text to speak..." className="w-full h-40 bg-slate-950/50 border border-slate-700 rounded-2xl p-6 focus:ring-2 focus:ring-indigo-500/50 outline-none resize-none" />
              {error && <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">{error}</div>}
              <button onClick={handleGenerate} disabled={!text.trim() || status === TtsStatus.GENERATING} className="mt-6 w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl font-bold text-white shadow-xl hover:scale-[1.01] transition-all disabled:opacity-50">
                {status === TtsStatus.GENERATING ? "Processing..." : "Generate Voice"}
              </button>
            </div>
          </div>

          <aside className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 shadow-xl max-h-[800px] overflow-y-auto">
            <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><History size={20} className="text-indigo-400" /> History</h3>
            {history.map(item => <HistoryItem key={item.id} item={item} onDelete={(id: any) => setHistory(history.filter(h => h.id !== id))} />)}
          </aside>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);