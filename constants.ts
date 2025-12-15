import { VoiceOption } from './types';

export const AVAILABLE_VOICES: VoiceOption[] = [
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'Male',
    description: 'Deep, resonant, and authoritative.',
    color: 'bg-blue-500'
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'Male',
    description: 'Calm, steady, and trustworthy.',
    color: 'bg-indigo-500'
  },
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'Female',
    description: 'Warm, soothing, and natural.',
    color: 'bg-rose-500'
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'Male',
    description: 'Energetic, fast-paced, and intense.',
    color: 'bg-orange-500'
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'Female',
    description: 'Soft, gentle, and melodic.',
    color: 'bg-teal-500'
  }
];

export const SAMPLE_PROMPTS = [
  "The quick brown fox jumps over the lazy dog.",
  "Welcome to the future of artificial intelligence voice generation.",
  "I can read audiobooks, narrate videos, or just say hello!",
  "Explain quantum computing to a five year old in a funny way."
];