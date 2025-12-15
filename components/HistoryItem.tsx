import React, { useRef, useState, useEffect } from 'react';
import { GeneratedAudio } from '../types';
import { Play, Pause, Download, Trash2, Volume2, Fingerprint, Globe } from 'lucide-react';

interface HistoryItemProps {
  item: GeneratedAudio;
  onDelete: (id: string) => void;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ item, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    urlRef.current = URL.createObjectURL(item.audioBlob);
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [item.audioBlob]);

  const togglePlay = () => {
    if (!audioRef.current || !urlRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const p = (audioRef.current.currentTime / audioRef.current.duration) * 100;
      setProgress(p || 0);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
  };

  const handleDownload = () => {
    if (!urlRef.current) return;
    const a = document.createElement('a');
    a.href = urlRef.current;
    a.download = `vocalforge-${item.voiceName}-${item.id.slice(0, 6)}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={`
      rounded-xl p-4 border transition-colors relative overflow-hidden
      ${item.isCloned ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800/80 border-slate-700 hover:border-slate-600'}
    `}>
      {item.isCloned && (
         <div className="absolute top-0 right-0 p-1.5 bg-indigo-500/20 rounded-bl-xl border-l border-b border-indigo-500/30">
            <Fingerprint size={12} className="text-indigo-400" />
         </div>
      )}

      <audio
        ref={audioRef}
        src={urlRef.current || ""}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        className="hidden"
      />

      <div className="flex flex-col gap-3">
        {/* Header info */}
        <div className="flex justify-between items-start pr-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-bold px-2 py-1 rounded ${item.isCloned ? 'bg-indigo-500/20 text-indigo-200 ring-1 ring-indigo-500/40' : 'bg-slate-700 text-slate-300'}`}>
              {item.voiceName}
            </span>
            {item.language && item.language !== 'Auto' && (
              <span className="text-xs bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded flex items-center gap-1">
                <Globe size={10} /> {item.language}
              </span>
            )}
          </div>
          <button 
            onClick={() => onDelete(item.id)}
            className="text-slate-500 hover:text-red-400 transition-colors ml-2"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Text Snippet */}
        <p className="text-sm text-slate-300 line-clamp-2 italic font-serif">
          "{item.text}"
        </p>

        {/* Controls */}
        <div className="flex items-center gap-3 mt-2">
          <button
            onClick={togglePlay}
            className={`
              w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95
              ${isPlaying ? 'bg-indigo-500' : 'bg-slate-700 hover:bg-slate-600'}
            `}
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          <div className="flex-1 bg-slate-700 h-2 rounded-full overflow-hidden relative">
            <div 
              className="absolute left-0 top-0 bottom-0 bg-indigo-500 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          <button
            onClick={handleDownload}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-700 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors"
            title="Download WAV"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoryItem;