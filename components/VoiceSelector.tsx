import React from 'react';
import { AVAILABLE_VOICES } from '../constants';
import { VoiceOption } from '../types';
import { Mic, Check } from 'lucide-react';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoiceId, onSelect, disabled }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {AVAILABLE_VOICES.map((voice) => {
        const isSelected = voice.id === selectedVoiceId;
        return (
          <button
            key={voice.id}
            onClick={() => onSelect(voice.id)}
            disabled={disabled}
            className={`
              relative p-4 rounded-xl border-2 text-left transition-all duration-200
              flex flex-col gap-2 group
              ${isSelected 
                ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]' 
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${voice.color} text-white font-bold shadow-lg`}>
                  {voice.name[0]}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{voice.name}</h3>
                  <span className="text-xs text-slate-400 uppercase tracking-wider">{voice.gender}</span>
                </div>
              </div>
              {isSelected && (
                <div className="bg-indigo-500 rounded-full p-1 text-white">
                  <Check size={16} />
                </div>
              )}
            </div>
            
            <p className="text-sm text-slate-400 mt-2 font-medium">
              {voice.description}
            </p>

            {/* Visual Flair */}
            <div className={`absolute -bottom-px -right-px w-8 h-8 rounded-tl-xl ${voice.color} opacity-20`} />
          </button>
        );
      })}
    </div>
  );
};

export default VoiceSelector;