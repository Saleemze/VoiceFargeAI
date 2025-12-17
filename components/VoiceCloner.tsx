import React, { useState, useRef, useEffect } from 'react';
import { Upload, Mic, X, Play, Pause, Fingerprint, Plus, Trash2, CheckCircle2, RotateCcw, ArrowRight, StopCircle, Volume2, Loader2 } from 'lucide-react';
import { CustomVoice } from '../types';
import { generateSpeech } from '../services/geminiService';

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

  // Testing Cloned Voices State
  const [testText, setTestText] = useState('');
  const [previewingVoiceId, setPreviewingVoiceId] = useState<string | null>(null);

  // Playback State for original sample preview
  const [playingOriginalId, setPlayingOriginalId] = useState<string | null>(null);
  const [isPreviewingTemp, setIsPreviewingTemp] = useState(false);
  
  // Refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const tempAudioRef = useRef<HTMLAudioElement | null>(null);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Cleanup
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
        stream.getTracks().forEach(track => track.stop());
        setUploadStep('review');
      };

      mediaRecorder.start();
      setIsRecording(true);
      
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

  // --- Preview Playback (Original Sample) ---
  const toggleOriginalPreview = (e: React.MouseEvent, voice: CustomVoice) => {
    e.stopPropagation();
    if (playingOriginalId === voice.id) {
      previewAudioRef.current?.pause();
      setPlayingOriginalId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = URL.createObjectURL(voice.previewBlob);
        previewAudioRef.current.play();
        setPlayingOriginalId(voice.id);
        previewAudioRef.current.onended = () => setPlayingOriginalId(null);
      }
    }
  };

  // --- Test Generation (Simulation of Cloned Voice) ---
  const handleTestVoice = async (e: React.MouseEvent, voice: CustomVoice) => {
    e.stopPropagation();
    
    if (previewingVoiceId === voice.id) {
      testAudioRef.current?.pause();
      setPreviewingVoiceId(null);
      return;
    }

    setPreviewingVoiceId(voice.id);
    const textToSpeak = testText.trim() || `Checking voice clone for ${voice.name}. Synthesis successful.`;

    try {
      // In this simulation, we use 'Charon' to represent the "cloned" characteristics
      const { blob } = await generateSpeech(textToSpeak, 'Charon');
      const url = URL.createObjectURL(blob);
      
      if (testAudioRef.current) {
        testAudioRef.current.src = url;
        testAudioRef.current.play();
        testAudioRef.current.onended = () => {
          setPreviewingVoiceId(null);
          URL.revokeObjectURL(url);
        };
      }
    } catch (err) {
      console.error("Voice test failed", err);
      setPreviewingVoiceId(null);
    }
  };

  return (
    <div className="space-y-6">
      <audio ref={previewAudioRef} className="hidden" />
      <audio ref={tempAudioRef} className="hidden" />
      <audio ref={testAudioRef} className="hidden" />

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
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Voice Name</label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., My Personal AI Voice"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>

            {uploadStep === 'upload' && (
              <div className="grid grid-cols-2 gap-4">
                <div 
                  onClick={() => audioInputRef.current?.click()}
                  className={`cursor-pointer border border-slate-700 bg-slate-900/50 rounded-xl p-6 flex flex-col items-center gap-3 transition-all ${isRecording ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-500/50 hover:bg-slate-800'}`}
                >
                  <Upload className="text-indigo-400" size={32} />
                  <span className="text-sm font-medium text-slate-300">Upload Audio</span>
                  <input ref={audioInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                </div>
                <div 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`cursor-pointer border rounded-xl p-6 flex flex-col items-center gap-3 transition-all relative overflow-hidden ${isRecording ? 'border-red-500/50 bg-red-950/20' : 'border-slate-700 bg-slate-900/50 hover:border-indigo-500/50 hover:bg-slate-800'}`}
                >
                  {isRecording ? <StopCircle className="text-red-500 animate-pulse" size={32} /> : <Mic className="text-indigo-400" size={32} />}
                  <span className={`text-sm font-medium ${isRecording ? 'text-red-400' : 'text-slate-300'}`}>
                    {isRecording ? formatTime(recordTime) : "Record Voice"}
                  </span>
                </div>
              </div>
            )}

            {uploadStep === 'review' && (
               <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-medium text-slate-300">Review Sample</span>
                  </div>
                  <div className="flex gap-3">
                     <button onClick={toggleTempPreview} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-colors ${isPreviewingTemp ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}>
                        {isPreviewingTemp ? <Pause size={18} /> : <Play size={18} />}
                        {isPreviewingTemp ? 'Playing...' : 'Test Sample'}
                     </button>
                     <button onClick={handleDiscardTemp} className="px-4 py-3 bg-slate-800 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-lg transition-colors border border-transparent hover:border-red-500/30">
                        <RotateCcw size={18} />
                     </button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800">
                     <button onClick={startAnalysis} className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white py-3 rounded-lg font-bold shadow-lg transition-all">
                        Analyze Voice <ArrowRight size={18} />
                     </button>
                  </div>
               </div>
            )}

            {uploadStep === 'analyzing' && (
              <div className="py-8 text-center space-y-4">
                 <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-t-indigo-500 border-r-transparent border-b-indigo-500 border-l-transparent rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                       <Fingerprint className="text-indigo-400" size={32} />
                    </div>
                 </div>
                 <p className="text-white font-medium">Extracting voice features...</p>
              </div>
            )}

            {uploadStep === 'ready' && (
               <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                      <div className="bg-emerald-500 rounded-full p-1"><CheckCircle2 size={20} className="text-white" /></div>
                      <div>
                        <p className="text-emerald-400 font-medium">Clone Ready</p>
                      </div>
                  </div>
                  <button onClick={handleSaveVoice} disabled={!voiceName.trim()} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-colors disabled:opacity-50">
                    Save Voice Clone
                  </button>
               </div>
            )}
          </div>
        </div>
      )}

      {/* --- LIST OF CLONED VOICES --- */}
      {customVoices.length > 0 && (
        <div className="space-y-6">
          {/* Quick Test Bar for Custom Voices */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-500 group-focus-within:text-indigo-400 transition-colors">
              <Volume2 size={18} />
            </div>
            <input
              type="text"
              value={testText}
              onChange={(e) => setTestText(e.target.value)}
              placeholder="Test your cloned voice here..."
              className="w-full bg-slate-950/40 border border-slate-800 rounded-2xl pl-12 pr-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {customVoices.map((voice) => {
              const isSelected = selectedVoiceId === voice.id;
              const isPlayingOriginal = playingOriginalId === voice.id;
              const isPreviewingTest = previewingVoiceId === voice.id;

              return (
                <div
                  key={voice.id}
                  onClick={() => onSelectVoice(voice.id)}
                  className={`
                    relative p-5 rounded-2xl border-2 transition-all cursor-pointer group overflow-hidden
                    ${isSelected 
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.15)]' 
                      : 'border-slate-800 bg-slate-900/40 hover:border-slate-700'
                    }
                  `}
                >
                   {/* Background Decor */}
                   <div className="absolute -right-8 -top-8 w-16 h-16 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />

                   <div className="flex justify-between items-start mb-4 relative z-10">
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg transform -rotate-2 group-hover:rotate-0 transition-transform">
                          <Fingerprint size={24} />
                       </div>
                       <div>
                         <h4 className="font-bold text-white text-lg leading-tight">{voice.name}</h4>
                         <span className="text-xs text-slate-500 flex items-center gap-1">
                           <CheckCircle2 size={10} className="text-emerald-500" />
                           Cloned Model
                         </span>
                       </div>
                     </div>
                     {isSelected && (
                       <div className="bg-emerald-500 rounded-full p-1 text-white shadow-lg">
                          <CheckCircle2 size={14} />
                       </div>
                     )}
                   </div>

                   <div className="flex items-center gap-2 relative z-10">
                     {/* Button to test the synthesized cloned voice */}
                     <button
                        onClick={(e) => handleTestVoice(e, voice)}
                        className={`
                          flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-semibold text-sm transition-all
                          ${isPreviewingTest 
                            ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/50' 
                            : 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20'
                          }
                        `}
                        title="Generate speech with this voice"
                     >
                        {isPreviewingTest ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                        Test Voice
                     </button>
                     
                     {/* Button to preview the original sample */}
                     <button
                        onClick={(e) => toggleOriginalPreview(e, voice)}
                        className={`
                          p-2 rounded-xl transition-all
                          ${isPlayingOriginal 
                            ? 'bg-slate-700 text-white' 
                            : 'bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700'
                          }
                        `}
                        title="Play original sample"
                     >
                        {isPlayingOriginal ? <Pause size={16} /> : <Play size={16} />}
                     </button>

                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteVoice(voice.id);
                        }}
                        className="p-2 rounded-xl bg-slate-800/50 text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                        title="Delete Clone"
                     >
                        <Trash2 size={16} />
                     </button>
                   </div>
                   
                   {/* Mini Audio Visualizer for Test Playback */}
                   {isPreviewingTest && (
                     <div className="mt-3 flex gap-0.5 items-end h-2 px-2">
                       {[...Array(12)].map((_, i) => (
                         <div 
                           key={i} 
                           className="flex-1 bg-indigo-400/60 animate-bounce" 
                           style={{ 
                             animationDuration: `${0.5 + Math.random()}s`, 
                             animationDelay: `${i * 0.05}s`,
                             height: `${30 + Math.random() * 70}%` 
                           }} 
                         />
                       ))}
                     </div>
                   )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {customVoices.length === 0 && !isCreating && (
        <div className="text-center py-12 text-slate-500 border-2 border-dashed border-slate-800 rounded-2xl">
           <Fingerprint size={48} className="mx-auto mb-4 opacity-20" />
           <p className="text-lg font-medium">No voices cloned yet.</p>
           <p className="text-sm">Click the button above to begin cloning your first voice.</p>
        </div>
      )}
    </div>
  );
};

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default VoiceCloner;