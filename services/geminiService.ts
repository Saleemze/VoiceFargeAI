import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData, bufferToWave } from "../utils/audioUtils";

let aiInstance: GoogleGenAI | null = null;

// Helper to get or create instance
const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment");
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export async function generateSpeech(
  text: string,
  voiceName: string,
  languageName?: string
): Promise<{ blob: Blob; audioBuffer: AudioBuffer }> {
  const ai = getAI();
  
  // Gemini 2.5 Flash TTS model
  const model = "gemini-2.5-flash-preview-tts";

  // If a specific language is selected, we instruct the model via system instruction
  // to ensure correct pronunciation and intonation.
  const systemInstruction = languageName && languageName !== 'Auto Detect'
    ? `You are a text-to-speech model. Generate the audio in ${languageName}.`
    : undefined;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        systemInstruction: systemInstruction,
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini API");
    }

    // Decode PCM
    const pcmData = decodeBase64(base64Audio);

    // Create AudioContext to decode into buffer
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000 // Gemini TTS usually returns 24kHz
    });

    const audioBuffer = await decodeAudioData(pcmData, audioContext, 24000, 1);
    
    // Convert to WAV Blob for storage/download
    const blob = bufferToWave(audioBuffer, audioBuffer.length);

    // Close context to free resources
    await audioContext.close();

    return { blob, audioBuffer };
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}