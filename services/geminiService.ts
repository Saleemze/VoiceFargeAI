import { GoogleGenAI, Modality } from "@google/genai";
import { decodeBase64, decodeAudioData, bufferToWave } from "../utils/audioUtils.ts";

/**
 * Utility to convert Blob to base64
 */
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
}

/**
 * Generates speech.
 * Uses 'gemini-2.5-flash-preview-tts' as it is the supported model for Text-to-Speech via generateContent.
 */
export async function generateSpeech(
  text: string,
  voiceName: string,
  languageName?: string,
  audioReference?: Blob
): Promise<{ blob: Blob; audioBuffer: AudioBuffer }> {
  const apiKey = process.env.API_KEY || (window as any).process?.env?.API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Please set API_KEY in your Netlify Environment Variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // The model 'gemini-2.5-flash-preview-tts' is specialized for speech generation.
    // For "cloning", we attempt to pass the reference audio as part of the multimodal prompt.
    // Note: True zero-shot cloning is most effective in the Live API, but we provide a 
    // high-quality approximation here by combining the sample with the TTS instructions.
    const model = "gemini-2.5-flash-preview-tts";
    
    let contents: any;

    if (audioReference) {
      const base64Ref = await blobToBase64(audioReference);
      contents = [
        {
          parts: [
            { inlineData: { data: base64Ref, mimeType: audioReference.type || 'audio/wav' } },
            { text: `Mimic the voice in this audio sample exactly. Speak the following text: "${text}"` }
          ]
        }
      ];
    } else {
      const langInstruction = languageName && languageName !== 'Auto' && languageName !== 'Auto Detect'
        ? `[Language: ${languageName}] `
        : "";
      contents = [{ parts: [{ text: `${langInstruction}${text}` }] }];
    }

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            // We use the requested voice name (e.g., 'Puck', 'Charon') as the base profile
            prebuiltVoiceConfig: { voiceName: voiceName },
          },
        },
      },
    });

    return await processAudioResponse(response);

  } catch (error: any) {
    console.error("Gemini TTS Error:", error);
    if (error.message?.includes("404") || error.status === 404) {
      throw new Error("Model not found. Please ensure you are using a supported region and the correct API key.");
    }
    if (error.message?.includes("500") || error.status === 500) {
      throw new Error("The AI service is temporarily unavailable. Try again in a moment.");
    }
    throw error;
  }
}

async function processAudioResponse(response: any) {
  const base64Audio = response.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;

  if (!base64Audio) {
    throw new Error("No audio data returned. The model might have filtered the content or the request was invalid.");
  }

  const pcmData = decodeBase64(base64Audio);
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
  
  const audioBuffer = await decodeAudioData(pcmData, audioContext, 24000, 1);
  const blob = bufferToWave(audioBuffer, audioBuffer.length);
  await audioContext.close();

  return { blob, audioBuffer };
}