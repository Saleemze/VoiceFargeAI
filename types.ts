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

export interface GeneratedAudio {
  id: string;
  text: string;
  voiceName: string;
  timestamp: number;
  audioBlob: Blob; // The WAV/PCM blob ready to play
  duration?: number;
  isCloned?: boolean;
  language?: string;
}

export interface LanguageOption {
  code: string;
  name: string;
}

export interface LanguageGroup {
  label: string;
  options: LanguageOption[];
}

export enum TtsStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  PLAYING = 'PLAYING',
  ERROR = 'ERROR'
}

export interface SpeakerConfig {
  voiceName: string;
}