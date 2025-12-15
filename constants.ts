import { VoiceOption, LanguageGroup } from './types';

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

export const SUPPORTED_LANGUAGES: LanguageGroup[] = [
  {
    label: "African Languages",
    options: [
      { code: "sw", name: "Swahili (Kiswahili)" },
      { code: "am", name: "Amharic" },
      { code: "yo", name: "Yoruba" },
      { code: "ig", name: "Igbo" },
      { code: "ha", name: "Hausa" },
      { code: "zu", name: "Zulu (isiZulu)" },
      { code: "xh", name: "Xhosa (isiXhosa)" },
      { code: "so", name: "Somali" },
      { code: "sn", name: "Shona" },
      { code: "af", name: "Afrikaans" }
    ]
  },
  {
    label: "Asian Languages",
    options: [
      { code: "ja", name: "Japanese" },
      { code: "zh", name: "Chinese (Mandarin)" },
      { code: "ko", name: "Korean" },
      { code: "hi", name: "Hindi" },
      { code: "ar", name: "Arabic" },
      { code: "bn", name: "Bengali" },
      { code: "id", name: "Indonesian" },
      { code: "vi", name: "Vietnamese" },
      { code: "th", name: "Thai" },
      { code: "tr", name: "Turkish" }
    ]
  },
  {
    label: "European & Global",
    options: [
      { code: "en", name: "English" },
      { code: "fr", name: "French" },
      { code: "es", name: "Spanish" },
      { code: "de", name: "German" },
      { code: "it", name: "Italian" },
      { code: "pt", name: "Portuguese" },
      { code: "ru", name: "Russian" },
      { code: "nl", name: "Dutch" },
      { code: "pl", name: "Polish" },
      { code: "uk", name: "Ukrainian" }
    ]
  }
];

export const SAMPLE_PROMPTS = [
  "The quick brown fox jumps over the lazy dog.",
  "Welcome to the future of artificial intelligence voice generation.",
  "I can read audiobooks, narrate videos, or just say hello!",
  "Explain quantum computing to a five year old in a funny way."
];