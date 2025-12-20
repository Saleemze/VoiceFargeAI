
import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData, bufferToWave } from "../utils/audioUtils";

/**
 * Generates speech using the Gemini 2.5 Flash TTS model.
 * Following @google/genai guidelines, we create a new instance of GoogleGenAI for each call
 * using the process.env.API_KEY environment variable.
 */
export async function generateSpeech(
  text: string,
  voiceName: string,
  languageName?: string
): Promise<{ blob: Blob; audioBuffer: AudioBuffer }> {
  // Always initialize with the pre-configured API key from the environment
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Use the recommended model for text-to-speech tasks
  const model = "gemini-2.5-flash-preview-tts";

  // If a specific language is provided, we use a system instruction to guide the pronunciation
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

    // Extract raw PCM audio bytes from the response
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini API");
    }

    // Decode PCM data manually as per guidelines
    const pcmData = decodeBase64(base64Audio);

    // Create AudioContext to decode into buffer (sample rate 24kHz matches model default)
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000
    });

    const audioBuffer = await decodeAudioData(pcmData, audioContext, 24000, 1);
    
    // Convert to WAV Blob for broader compatibility/downloading
    const blob = bufferToWave(audioBuffer, audioBuffer.length);

    // Clean up AudioContext resources
    await audioContext.close();

    return { blob, audioBuffer };
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    throw error;
  }
}
