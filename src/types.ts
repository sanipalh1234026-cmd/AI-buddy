export type BuddyMode =
  | 'home'
  | 'chat'
  | 'code'
  | 'study'
  | 'search'
  | 'maps'
  | 'image'
  | 'video'
  | 'music'
  | 'voice'
  | 'history'
  | 'settings';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface MapPlace {
  title: string;
  uri: string;
  address?: string;
  rating?: number;
  reviewSnippets?: string[];
}

export interface AttachedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  base64?: string;
  content?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  mode?: BuddyMode;
  attachedFiles?: AttachedFile[];
  sources?: GroundingSource[];
  mapPlaces?: MapPlace[];
  modelUsed?: string;
  isThinking?: boolean;
  thinkingTimeMs?: number;
  error?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  mode: BuddyMode;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  isPinned?: boolean;
  codeConfig?: {
    language: string;
    action: 'write' | 'explain' | 'fix' | 'refactor';
  };
  studyConfig?: {
    gradeLevel: string;
    action: 'homework' | 'explain' | 'quiz' | 'stepbystep';
  };
}

export interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  imageUrl: string;
  sourceImageId?: string;
  isEdited?: boolean;
  createdAt: number;
}

export interface GeneratedVideo {
  id: string;
  prompt: string;
  sourceImageUrl?: string;
  videoUrl: string;
  aspectRatio: '16:9' | '9:16';
  model: string;
  createdAt: number;
}

export interface GeneratedMusic {
  id: string;
  title: string;
  prompt: string;
  modelType: 'clip' | 'pro';
  audioUrl: string;
  lyrics?: string;
  createdAt: number;
  duration?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  language: string;
  voice: 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Charon';
  speechRate: number;
  autoPlaySpeech: boolean;
  soundEffects: boolean;
  contentSafetyFilter: boolean;
  piiWarnings: boolean;
  preferredModel?: 'auto' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite';
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}
