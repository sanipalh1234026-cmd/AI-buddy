import { AttachedFile, GroundingSource, MapPlace } from '../types';

export interface ChatRequestOptions {
  messages: Array<{ role: string; content: string }>;
  mode?: string;
  language?: string;
  gradeLevel?: string;
  codeLanguage?: string;
  codeAction?: string;
  studyAction?: string;
  useSearchGrounding?: boolean;
  useMapsGrounding?: boolean;
  userLocation?: { latitude: number; longitude: number } | null;
  modelPreference?: string;
  attachedFiles?: AttachedFile[];
}

export interface ChatResponse {
  text: string;
  sources?: GroundingSource[];
  mapPlaces?: MapPlace[];
  searchQueries?: string[];
  model?: string;
  error?: string;
}

export async function sendChatMessage(options: ChatRequestOptions): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to send message');
  }
  return data;
}

export async function requestTTS(text: string, voice: string = 'Puck') {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
    });
    return await response.json();
  } catch (err: any) {
    return { audio: null, fallbackToBrowser: true, message: err?.message };
  }
}

export async function requestTranscribeAudio(audioBase64: string, mimeType: string = 'audio/webm'): Promise<string> {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ audio: audioBase64, mimeType }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Audio transcription failed');
  }
  return data.transcription || '';
}

export async function requestGenerateImage(options: {
  prompt: string;
  sourceImage?: string | null;
  aspectRatio?: string;
  style?: string;
}) {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate or edit image');
  }
  return data;
}

export async function requestGenerateMusic(options: {
  prompt: string;
  modelType?: 'clip' | 'pro';
  image?: { data: string; mimeType: string } | null;
}): Promise<{
  audioBase64: string;
  mimeType: string;
  lyrics?: string;
  prompt: string;
  model: string;
  modelType: string;
  duration: string;
}> {
  const response = await fetch('/api/generate-music', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to generate music');
  }
  return data;
}

export async function checkSafety(text: string): Promise<{ safe: boolean; warnings: string[] }> {
  try {
    const response = await fetch('/api/safety-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    return await response.json();
  } catch {
    return { safe: true, warnings: [] };
  }
}

export interface VideoGenerateOptions {
  imageBytes?: string;
  mimeType?: string;
  prompt?: string;
  aspectRatio?: '16:9' | '9:16';
}

export async function requestGenerateVideo(options: VideoGenerateOptions): Promise<{
  operationName: string;
  model: string;
  aspectRatio: string;
  isTextToVideo?: boolean;
}> {
  const payload: any = {
    prompt: options.prompt,
    aspectRatio: options.aspectRatio || '16:9',
  };

  if (options.imageBytes) {
    payload.image = {
      imageBytes: options.imageBytes,
      mimeType: options.mimeType || 'image/jpeg',
    };
  }

  const response = await fetch('/api/generate-video', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to initiate video generation');
  }
  return data;
}

export async function checkVideoStatus(operationName: string): Promise<{
  done: boolean;
  error?: string | null;
  hasVideo?: boolean;
}> {
  const response = await fetch('/api/video-status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Failed to poll video status');
  }
  return data;
}

export async function downloadVideoBlob(operationName: string): Promise<Blob> {
  const response = await fetch('/api/video-download', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operationName }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to download generated video');
  }

  return await response.blob();
}
