import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, X, Play, Pause, Fingerprint, Plus, Trash2, CheckCircle2, RotateCcw, ArrowRight, StopCircle } from 'lucide-react';
import { CustomVoice } from '../types';

interface VoiceClonerProps {
  customVoices: CustomVoice[];
  selectedVoiceId: string | null;
  onAddVoice: (voice: CustomVoice) => void;
  onSelectVoice: (id: string) => void;
  onDeleteVoice: (id: string) => void;
  disabled?: boolean;
}

const VoiceCloner: React.FC<VoiceClonerProps> = ({
  customVoices,
  selectedVoiceId,
  onAddVoice,
  onSelectVoice,
  onDeleteVoice,
  disabled
}) => {
  // Creation State
  const [isCreating, setIsCreating] = useState(false);
  const [uploadStep, setUploadStep] = useState<'upload' | 'review' | 'analyzing' | 'ready'>('upload');
  const [voiceName, setVoiceName] = useState('');
  const [tempBlob, setTempBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);

  // Playback State for preview
  const [playingPreviewId, setPlayingPreviewId] = useState<string | null>(null);
  const [isPreviewingTemp, setIsPreviewingTemp] = useState(false);
  
  // Refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const tempAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Cleanup URLs
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // --- Handlers for File Upload ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setTempBlob(file);
      setUploadStep('review');
    }
  };

  const startAnalysis = () => {
    setUploadStep('analyzing');
    // Fake analysis delay for effect
    setTimeout(() => {
      setUploadStep('ready');
    }, 2000);
  };

  // --- Handlers for Recording ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setTempBlob(blob);
        stream.getTracks().forEach(track => track.stop()); // Stop mic
        setUploadStep('review');
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Timer
      setRecordTime(0);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
        setRecordTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please ensure permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // --- Review Handlers ---
  const handleDiscardTemp = () => {
    setTempBlob(null);
    setUploadStep('upload');
    setIsPreviewingTemp(false);
  };

  const toggleTempPreview = () => {
    if (!tempBlob || !tempAudioRef.current) return;

    if (isPreviewingTemp) {
      tempAudioRef.current.pause();
      setIsPreviewingTemp(false);
    } else {
      tempAudioRef.current.src = URL.createObjectURL(tempBlob);
      tempAudioRef.current.play();
      setIsPreviewingTemp(true);
      tempAudioRef.current.onended = () => setIsPreviewingTemp(false);
    }
  };

  // --- Saving the Voice ---
  const handleSaveVoice = () => {
    if (!voiceName.trim() || !tempBlob) return;

    const newVoice: CustomVoice = {
      id: crypto.randomUUID(),
      name: voiceName.trim(),
      previewBlob: tempBlob,
      createdAt: Date.now()
    };

    onAddVoice(newVoice);
    
    // Reset
    setIsCreating(false);
    setUploadStep('upload');
    setVoiceName('');
    setTempBlob(null);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setUploadStep('upload');
    setVoiceName('');
    setTempBlob(null);
    setIsRecording(false);
    stopRecording();
  };

  // --- Preview Playback (List) ---
  const togglePreview = (voice: CustomVoice) => {
    if (playingPreviewId === voice.id) {
      previewAudioRef.current?.pause();
      setPlayingPreviewId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = URL.createObjectURL(voice.previewBlob);
        previewAudioRef.current.play();
        setPlayingPreviewId(voice.id);
        
        previewAudioRef.current.onended = () => {
          setPlayingPreviewId(null);
        };
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden audio element for previews */}
      <audio ref={previewAudioRef} className="hidden" />
      <audio ref={tempAudioRef} className="hidden" />

      {/* --- ADD NEW VOICE BUTTON / FORM --- */}
      {!isCreating ? (
        <button
          onClick={() => setIsCreating(true)}
          disabled={disabled}
          className="w-full py-8 border-2 border-dashed border-slate-700 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-slate-800/30 transition-all group"
        >
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Plus size={32} />
          </div>
          <span className="text-lg font-semibold">Clone a New Voice</span>
          <span className="text-sm opacity-60">Upload audio sample or record directly</span>
        </button>
      ) : (
        <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-6 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Fingerprint className="text-indigo-400" />
              New Voice Clone
            </h3>
            <button onClick={handleCancel} className="text-slate-500 hover:text-slate-300">
              <X size={24} />
            </button>
          </div>

          <div className="space-y-6">
            {/* Step 1: Input Name */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Voice Name</label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., My Professional Voice"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {/* Step 2: Audio Source */}
            {uploadStep === 'upload' && (
              <div className="grid grid-cols-2 gap-4">
                {/* Upload File */}
                <div 
                  onClick={() => audioInputRef.current?.click()}
                  className={`
                    cursor-pointer border border-slate-700 bg-slate-900/50 rounded-xl p-6 flex flex-col items-center gap-3 transition-all
                    ${isRecording ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-500/50 hover:bg-slate-800'}
                  `}
                >
                  <Upload className="text-indigo-400" size={32} />
                  <span className="text-sm font-medium text-slate-300">Upload Audio</span>
                  <span className="text-xs text-slate-500 text-center">WAV, MP3, M4A<br/>Max 10MB</span>
                  <input 
                    ref={audioInputRef} 
                    type="file" 
                    accept="audio/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                </div>

                {/* Record Mic */}
                <div 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`
                    cursor-pointer border rounded-xl p-6 flex flex-col items-center gap-3 transition-all relative overflow-hidden
                    ${isRecording 
                      ? 'border-red-500/50 bg-red-950/20' 
                      : 'border-slate-700 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-800'
                    }
                  `}
                >
                  {isRecording && (
                     <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none" />
                  )}
                  {isRecording ? (
                     <StopCircle className="text-red-500" size={32} />
                  ) : (
                     <Mic className="text-indigo-400" size={32} />
                  )}
                  
                  <span className={`text-sm font-medium ${isRecording ? 'text-red-400' : 'text-slate-300'}`}>
                    {isRecording ? formatTime(recordTime) : "Record Voice"}
                  </span>
                  <span className="text-xs text-slate-500 text-center">
                    {isRecording ? "Tap to Stop" : "Use Microphone"}
                  </span>
                </div>
              </div>
            )}

            {/* Review State */}
            {uploadStep === 'review' && (
               <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-300">Review Audio Sample</span>
                    <span className="text-xs text-slate-500">
                      {tempBlob ? (tempBlob.size / 1024).toFixed(1) + ' KB' : ''}
                    </span>
                  </div>
                  
                  <div className="flex gap-3">
                     <button
                        onClick={toggleTempPreview}
                        className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${isPreviewingTemp ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                     >
                        {isPreviewingTemp ? <Pause size={18} /> : <Play size={18} />}
                        {isPreviewingTemp ? 'Playing...' : 'Play Recording'}
                     </button>
                     <button
                        onClick={handleDiscardTemp}
                        className="px-4 py-3 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30"
                        title="Discard and Retry"
                     >
                        <RotateCcw size={18} />
                     </button>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                     <button
                        onClick={startAnalysis}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg shadow-indigo-500/20 transition-all"
                     >
                        Analyze & Create Voice <ArrowRight size={18} />
                     </button>
                  </div>
               </div>
            )}

            {/* Analyzing State */}
            {uploadStep === 'analyzing' && (
              <div className="py-8 text-center space-y-4">
                 <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-ping"></div>
                    <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Fingerprint className="text-indigo-400" size={32} />
                    </div>
                 </div>
                 <div className="space-y-1">
                   <p className="text-white font-medium">Analyzing voice patterns...</p>
                   <p className="text-sm text-slate-500">Extracting timbre and pitch data</p>
                 </div>
              </div>
            )}

            {/* Ready State */}
            {uploadStep === 'ready' && (
               <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                      <div className="bg-emerald-500 rounded-full p-1">
                        <CheckCircle2 size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-emerald-400 font-medium">Voice Model Ready</p>
                        <p className="text-xs text-emerald-500/70">Sample processed successfully</p>
                      </div>
                  </div>
                  <button
                    onClick={handleSaveVoice}
                    disabled={!voiceName.trim()}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Voice Clone
                  </button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* --- LIST OF CLONED VOICES --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {customVoices.map((voice) => {
          const isSelected = selectedVoiceId === voice.id;
          const isPlaying = playingPreviewId === voice.id;

          return (
            <div
              key={voice.id}
              onClick={() => onSelectVoice(voice.id)}
              className={`
                relative p-4 rounded-xl border-2 transition-all cursor-pointer group
                ${isSelected 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }
              `}
            >
               <div className="flex justify-between items-start mb-3">
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg">
                      <Fingerprint size={20} />
                   </div>
                   <div>
                     <h4 className="font-bold text-white leading-tight">{voice.name}</h4>
                     <span className="text-xs text-slate-500">Custom Clone</span>
                   </div>
                 </div>
                 {isSelected && (
                   <div className="bg-indigo-500 rounded-full p-1 text-white">
                      <CheckCircle2 size={16} />
                   </div>
                 )}
               </div>

               <div className="flex items-center gap-2 mt-2">
                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePreview(voice);
                    }}
                    className="p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                    title="Preview Original Sample"
                 >
                    {isPlaying ? <Pause size={14} /> : <Play size={14} />}
                 </button>
                 
                 <div className="flex-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                    {isPlaying && (
                      <div className="h-full bg-indigo-400 animate-progress origin-left w-full duration-[2s]"></div>
                    )}
                 </div>

                 <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteVoice(voice.id);
                    }}
                    className="p-2 rounded-full hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete Voice"
                 >
                    <Trash2 size={14} />
                 </button>
               </div>
            </div>
          );
        })}
      </div>
      
      {customVoices.length === 0 && !isCreating && (
        <div className="text-center py-8 text-slate-500">
           <p>No custom voices created yet.</p>
        </div>
      )}
    </div>
  );
};

// Helper for time formatting
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VoiceCloner;