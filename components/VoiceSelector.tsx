import React, { useState, useRef } from 'react';
import { AVAILABLE_VOICES } from '../constants';
import { VoiceOption } from '../types';
import { Check, Star, Play, Pause, Loader2, Volume2 } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoiceId, onSelect, disabled }) => {
  const [previewText, setPreviewText] = useState('');
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = async (e: React.MouseEvent, voice: VoiceOption) => {
    e.stopPropagation();
    
    if (previewingId === voice.id) {
      audioRef.current?.pause();
      setPreviewingId(null);
      return;
    }

    setPreviewingId(voice.id);
    const textToSpeak = previewText.trim() || `Hello! My name is ${voice.name}. I am ready to bring your words to life.`;

    try {
      const { blob } = await generateSpeech(textToSpeak, voice.id);
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        audioRef.current.onended = () => {
          setPreviewingId(null);
          URL.revokeObjectURL(url);
        };
      }
    } catch (err) {
      console.error("Preview failed", err);
      setPreviewingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={audioRef} className="hidden" />
      
      {/* Quick Test Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
          <Volume2 size={18} />
        </div>
        <input
          type="text"
          value={previewText}
          onChange={(e) => setPreviewText(e.target.value)}
          placeholder="Type here to test voices (e.g., 'Hello world')..."
          className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] uppercase tracking-widest text-slate-500 font-bold pointer-events-none">
          Quick Test
        </div>
      </div>

      {/* Grid of Voices */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {AVAILABLE_VOICES.map((voice) => {
          const isSelected = voice.id === selectedVoiceId;
          const isPreviewing = previewingId === voice.id;
          
          return (
            <button
              key={voice.id}
              onClick={() => onSelect(voice.id)}
              disabled={disabled}
              className={`
                relative p-5 rounded-2xl border-2 text-left transition-all duration-300
                flex flex-col gap-3 group overflow-hidden
                ${isSelected 
                  ? `border-indigo-500 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.2)] scale-[1.02]` 
                  : 'border-slate-800 bg-slate-900/40 hover:border-slate-600 hover:bg-slate-800/60'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {/* Background Glow Effect */}
              <div className={`absolute -right-12 -top-12 w-24 h-24 rounded-full ${voice.color} blur-[40px] opacity-10 group-hover:opacity-30 transition-opacity`} />
              
              <div className="flex items-center justify-between w-full relative z-10">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${voice.color} text-white font-bold shadow-lg transform rotate-3 group-hover:rotate-0 transition-transform duration-300`}>
                    {voice.name[0]}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-white leading-none mb-1">{voice.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter ${voice.gender === 'Female' ? 'bg-pink-500/20 text-pink-400' : 'bg-blue-500/20 text-blue-400'}`}>
                        {voice.gender}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handlePreview(e, voice)}
                    className={`
                      p-2 rounded-xl transition-all
                      ${isPreviewing 
                        ? 'bg-indigo-500 text-white animate-pulse' 
                        : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                      }
                    `}
                    title="Play Preview"
                  >
                    {isPreviewing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                  </button>
                  {isSelected && (
                    <div className="bg-emerald-500 rounded-full p-1 text-white shadow-lg ring-2 ring-emerald-500/20">
                      <Check size={12} strokeWidth={4} />
                    </div>
                  )}
                </div>
              </div>
              
              <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed relative z-10">
                {voice.description}
              </p>

              <div className="mt-auto flex items-center justify-between pt-2 relative z-10">
                 <span className="text-[9px] text-slate-500 font-mono uppercase">24kHz Audio</span>
                 {isPreviewing && (
                   <div className="flex gap-0.5 items-end h-3">
                     <div className="w-0.5 bg-indigo-400 animate-[bounce_1s_infinite_0ms]" style={{ height: '60%' }}></div>
                     <div className="w-0.5 bg-indigo-400 animate-[bounce_1s_infinite_200ms]" style={{ height: '100%' }}></div>
                     <div className="w-0.5 bg-indigo-400 animate-[bounce_1s_infinite_400ms]" style={{ height: '40%' }}></div>
                   </div>
                 )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default VoiceSelector;