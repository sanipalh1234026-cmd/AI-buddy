// Voice speech recognition and audio playback utilities

import { browserSpeechSynthesis } from './speechSynthesis';

class VoiceService {
  private audioCtx: AudioContext | null = null;
  private currentAudioSource: AudioBufferSourceNode | null = null;
  private isPlayingAudio: boolean = false;
  private recognition: any = null;
  private isListeningVoice: boolean = false;

  public initAudioContext(): AudioContext {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass({ sampleRate: 24000 });
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  // Play PCM 24kHz audio from Gemini TTS
  public async playGeminiPCM(base64Data: string, onEnded?: () => void): Promise<void> {
    this.stopPlayback();
    try {
      const ctx = this.initAudioContext();
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // 16-bit PCM little endian
      const int16Array = new Int16Array(bytes.buffer);
      const float32Array = new Float32Array(int16Array.length);
      for (let i = 0; i < int16Array.length; i++) {
        float32Array[i] = int16Array[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, float32Array.length, 24000);
      audioBuffer.getChannelData(0).set(float32Array);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      this.currentAudioSource = source;
      this.isPlayingAudio = true;

      source.onended = () => {
        this.isPlayingAudio = false;
        this.currentAudioSource = null;
        if (onEnded) onEnded();
      };

      source.start(0);
    } catch (err) {
      console.warn('Error playing Gemini PCM, falling back to speech synthesis', err);
      if (onEnded) onEnded();
    }
  }

  // Play using Web Speech API SpeechSynthesis
  public playSpeechSynthesis(
    text: string,
    voiceName?: string,
    rate: number = 1.0,
    onEnded?: () => void
  ): void {
    this.stopPlayback();
    this.isPlayingAudio = true;
    browserSpeechSynthesis.speak('voice-service-temp', text, {
      voiceName,
      rate,
      onEnd: () => {
        this.isPlayingAudio = false;
        if (onEnded) onEnded();
      },
      onError: () => {
        this.isPlayingAudio = false;
        if (onEnded) onEnded();
      },
    });
  }

  public stopPlayback(): void {
    if (this.currentAudioSource) {
      try {
        this.currentAudioSource.stop();
      } catch {
        // ignore if already stopped
      }
      this.currentAudioSource = null;
    }
    browserSpeechSynthesis.stop();
    this.isPlayingAudio = false;
  }

  public isPlaying(): boolean {
    return this.isPlayingAudio;
  }

  // Web Speech API Voice Recognition
  public startListening(
    onResult: (transcript: string, isFinal: boolean) => void,
    onError: (error: string) => void,
    onEnd: () => void,
    lang: string = 'en-US'
  ): boolean {
    const SpeechRecognitionClass =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      onError('Speech recognition is not supported in this browser.');
      return false;
    }

    try {
      this.stopListening();
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = lang;

      this.recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript;
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        onResult(final || interim, Boolean(final));
      };

      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        onError(event.error);
      };

      this.recognition.onend = () => {
        this.isListeningVoice = false;
        onEnd();
      };

      this.recognition.start();
      this.isListeningVoice = true;
      return true;
    } catch (err: any) {
      onError(err?.message || 'Could not start speech recognition');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
      this.recognition = null;
    }
    this.isListeningVoice = false;
  }

  public isListening(): boolean {
    return this.isListeningVoice;
  }
}

export const voiceService = new VoiceService();
