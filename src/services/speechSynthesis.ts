// Browser SpeechSynthesis API service for reading aloud assistant messages
// Handles markdown stripping, sentence chunking (to avoid Chrome 15s freeze bug),
// voice selection, and play/pause/stop lifecycle.

export interface SpeechOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
  voiceName?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

export function cleanMarkdownForSpeech(text: string): string {
  if (!text) return '';

  return (
    text
      // Replace code blocks with concise spoken description
      .replace(/```[\w-]*\n[\s\S]*?```/g, 'Code block omitted.')
      .replace(/```[\s\S]*?```/g, 'Code snippet omitted.')
      // Replace inline code blocks
      .replace(/`([^`]+)`/g, '$1')
      // Replace markdown images: ![alt](url) -> alt image
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      // Replace markdown links: [label](url) -> label
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      // Replace raw URLs with "link"
      .replace(/https?:\/\/[^\s)]+/g, 'link')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove Markdown headers (#, ##, ###, etc.)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold and italics formatting (**bold**, *italic*, __bold__, _italic_)
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/~~(.*?)~~/g, '$1')
      // Remove blockquotes (> quote)
      .replace(/^>\s+/gm, '')
      // Remove markdown list bullets and numbers (- item, * item, 1. item)
      .replace(/^[\s*+-]+\s+/gm, '')
      .replace(/^\d+\.\s+/gm, '')
      // Remove horizontal rules
      .replace(/^-{3,}$/gm, '')
      .replace(/^\*{3,}$/gm, '')
      // Remove table pipes
      .replace(/\|/g, ' ')
      // Normalize line breaks to punctuation pauses
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, '. ')
      // Normalize whitespace
      .replace(/\s{2,}/g, ' ')
      .trim()
  );
}

// Split text into natural sentence chunks under ~180 chars to avoid Chromium SpeechSynthesis freeze bug
export function splitTextIntoChunks(text: string, maxLength = 180): string[] {
  if (!text) return [];

  // Match sentence terminators (. ! ?)
  const rawSentences = text.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g) || [text];
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLength) {
      chunks.push(trimmed);
    } else {
      // Split by clause punctuation (, ; : or spaces)
      const clauses = trimmed.split(/([,;:]\s+)/);
      let currentChunk = '';

      for (const part of clauses) {
        if ((currentChunk + part).length <= maxLength) {
          currentChunk += part;
        } else {
          if (currentChunk.trim()) {
            chunks.push(currentChunk.trim());
          }
          currentChunk = part;
        }
      }

      if (currentChunk.trim()) {
        // If single clause is still too long, chunk by words
        if (currentChunk.length > maxLength) {
          const words = currentChunk.split(/\s+/);
          let wordChunk = '';
          for (const w of words) {
            if ((wordChunk + ' ' + w).length <= maxLength) {
              wordChunk = wordChunk ? `${wordChunk} ${w}` : w;
            } else {
              if (wordChunk) chunks.push(wordChunk);
              wordChunk = w;
            }
          }
          if (wordChunk) chunks.push(wordChunk);
        } else {
          chunks.push(currentChunk.trim());
        }
      }
    }
  }

  return chunks.length > 0 ? chunks : [text];
}

class BrowserSpeechSynthesisService {
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  private isSpeakingActive: boolean = false;
  private isPausedState: boolean = false;
  private currentMessageId: string | null = null;
  private chunkQueue: string[] = [];
  private currentChunkIndex: number = 0;
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private onEndCallback?: () => void;
  private onErrorCallback?: (err: any) => void;
  private keepAliveInterval: any = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  private initVoices(): void {
    if (!isSpeechSynthesisSupported()) return;
    try {
      this.cachedVoices = window.speechSynthesis.getVoices();
    } catch {
      this.cachedVoices = [];
    }
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.cachedVoices.length === 0 && isSpeechSynthesisSupported()) {
      this.cachedVoices = window.speechSynthesis.getVoices();
    }
    return this.cachedVoices;
  }

  public findVoice(lang?: string, preferredName?: string): SpeechSynthesisVoice | null {
    const voices = this.getVoices();
    if (voices.length === 0) return null;

    // 1. Try matching preferred voice name
    if (preferredName) {
      const matchByName = voices.find((v) =>
        v.name.toLowerCase().includes(preferredName.toLowerCase())
      );
      if (matchByName) return matchByName;
    }

    // 2. Try matching language prefix (e.g. "en", "es", "fr")
    if (lang) {
      const langPrefix = lang.slice(0, 2).toLowerCase();
      const matchByLang = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix));
      if (matchByLang) return matchByLang;
    }

    // 3. Fallback to default or first voice
    const defaultVoice = voices.find((v) => v.default) || voices[0];
    return defaultVoice || null;
  }

  public isSpeaking(messageId?: string): boolean {
    if (!isSpeechSynthesisSupported()) return false;
    if (messageId) {
      return this.isSpeakingActive && this.currentMessageId === messageId;
    }
    return this.isSpeakingActive;
  }

  public isPaused(): boolean {
    return this.isPausedState;
  }

  public getCurrentMessageId(): string | null {
    return this.currentMessageId;
  }

  // Speak assistant message text using browser SpeechSynthesis
  public speak(
    messageId: string,
    rawText: string,
    options: SpeechOptions = {}
  ): boolean {
    if (!isSpeechSynthesisSupported()) {
      if (options.onError) {
        options.onError(new Error('SpeechSynthesis API is not supported in this browser.'));
      }
      return false;
    }

    // Stop any current ongoing speech
    this.stop();

    const cleanText = cleanMarkdownForSpeech(rawText);
    if (!cleanText.trim()) {
      if (options.onEnd) options.onEnd();
      return false;
    }

    const chunks = splitTextIntoChunks(cleanText);
    if (chunks.length === 0) {
      if (options.onEnd) options.onEnd();
      return false;
    }

    this.currentMessageId = messageId;
    this.chunkQueue = chunks;
    this.currentChunkIndex = 0;
    this.isSpeakingActive = true;
    this.isPausedState = false;
    this.onEndCallback = options.onEnd;
    this.onErrorCallback = options.onError;

    if (options.onStart) {
      options.onStart();
    }

    this.startKeepAlive();
    this.speakNextChunk(options);
    return true;
  }

  private speakNextChunk(options: SpeechOptions): void {
    if (!this.isSpeakingActive || this.currentChunkIndex >= this.chunkQueue.length) {
      this.handlePlaybackComplete();
      return;
    }

    const chunk = this.chunkQueue[this.currentChunkIndex];
    const utterance = new SpeechSynthesisUtterance(chunk);
    this.activeUtterance = utterance;

    // Apply voice settings
    const voice = this.findVoice(options.lang, options.voiceName);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else if (options.lang) {
      utterance.lang = options.lang;
    }

    utterance.rate = Math.max(0.5, Math.min(2.0, options.rate ?? 1.0));
    utterance.pitch = Math.max(0.5, Math.min(1.5, options.pitch ?? 1.0));

    utterance.onend = () => {
      this.currentChunkIndex++;
      if (this.currentChunkIndex < this.chunkQueue.length && this.isSpeakingActive) {
        // Speak next sentence chunk
        this.speakNextChunk(options);
      } else {
        this.handlePlaybackComplete();
      }
    };

    utterance.onerror = (e) => {
      // If error was triggered because of intentional cancel, do not treat as fatal error
      if (e.error === 'canceled' || e.error === 'interrupted') {
        this.handlePlaybackComplete();
      } else {
        console.warn('SpeechSynthesisUtterance error:', e.error);
        if (this.onErrorCallback) {
          this.onErrorCallback(e);
        }
        this.handlePlaybackComplete();
      }
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error('Failed to trigger window.speechSynthesis.speak:', err);
      this.handlePlaybackComplete();
    }
  }

  // Periodic ping to keep Chrome SpeechSynthesis from timing out mid-speech
  private startKeepAlive(): void {
    this.stopKeepAlive();
    this.keepAliveInterval = setInterval(() => {
      if (isSpeechSynthesisSupported() && window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
        window.speechSynthesis.pause();
        window.speechSynthesis.resume();
      }
    }, 10000);
  }

  private stopKeepAlive(): void {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }

  private handlePlaybackComplete(): void {
    this.stopKeepAlive();
    this.isSpeakingActive = false;
    this.isPausedState = false;
    this.currentMessageId = null;
    this.chunkQueue = [];
    this.currentChunkIndex = 0;
    this.activeUtterance = null;

    if (this.onEndCallback) {
      const cb = this.onEndCallback;
      this.onEndCallback = undefined;
      cb();
    }
  }

  public pause(): void {
    if (!isSpeechSynthesisSupported()) return;
    if (this.isSpeakingActive && !this.isPausedState) {
      window.speechSynthesis.pause();
      this.isPausedState = true;
    }
  }

  public resume(): void {
    if (!isSpeechSynthesisSupported()) return;
    if (this.isSpeakingActive && this.isPausedState) {
      window.speechSynthesis.resume();
      this.isPausedState = false;
    }
  }

  public stop(): void {
    this.stopKeepAlive();
    if (isSpeechSynthesisSupported()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    this.isSpeakingActive = false;
    this.isPausedState = false;
    this.currentMessageId = null;
    this.chunkQueue = [];
    this.currentChunkIndex = 0;
    this.activeUtterance = null;

    if (this.onEndCallback) {
      const cb = this.onEndCallback;
      this.onEndCallback = undefined;
      cb();
    }
  }
}

export const browserSpeechSynthesis = new BrowserSpeechSynthesisService();
