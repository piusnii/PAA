import { Platform } from 'react-native';
import { TranscribeResponse } from '../types';

export class ApiError extends Error {
  constructor(message: string, public statusCode?: number, public details?: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Uploads an audio recording file to the PAA backend proxy for Groq Whisper transcription.
 */
export async function uploadAudioForTranscription(
  audioUri: string,
  backendUrl: string,
  sharedSecret: string
): Promise<TranscribeResponse> {
  const cleanUrl = backendUrl.replace(/\/+$/, '');
  const endpoint = `${cleanUrl}/api/transcribe`;

  const formData = new FormData();
  
  // Format file object according to React Native FormData expectations
  const filename = audioUri.split('/').pop() || 'recording.m4a';
  const fileType = Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

  formData.append('file', {
    uri: audioUri,
    type: fileType,
    name: filename,
  } as unknown as Blob);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'x-paa-secret-key': sharedSecret,
        // Do NOT set Content-Type header manually for FormData in React Native;
        // fetch automatically sets boundary.
      },
      body: formData,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.error || `Server returned ${response.status} ${response.statusText}`;
      const details = data?.details;
      throw new ApiError(errorMsg, response.status, details);
    }

    if (!data || typeof data.text !== 'string') {
      throw new ApiError('Invalid response received from transcription server');
    }

    return data as TranscribeResponse;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error instanceof ApiError) {
      throw error;
    }

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your network and backend server.');
    }

    // Network reachability issue
    throw new ApiError(
      `Could not reach backend at ${cleanUrl}. Ensure the Next.js server is running and your device can reach this IP address.`,
      0,
      error?.message
    );
  }
}
