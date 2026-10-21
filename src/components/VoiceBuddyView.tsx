import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  Bot,
  User,
  Activity,
  FileText,
  Copy,
  Check,
  RotateCcw,
  Zap,
  PhoneCall,
  PhoneOff,
} from 'lucide-react';
import { useAudioTranscription } from '../utils/useAudioTranscription';
import { requestTTS } from '../services/api';

export const VoiceBuddyView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'live' | 'transcribe'>('live');

  // Live API (gemini-3.8-live) State
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [isLiveConnecting, setIsLiveConnecting] = useState(false);
  const [isLiveSpeaking, setIsLiveSpeaking] = useState(false);
  const [liveTranscriptHistory, setLiveTranscriptHistory] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; time: string }>
  >([
    {
      role: 'assistant',
      text: 'Hello! I am AI Buddy Voice powered by gemini-3.8-live. Tap "Start Real-Time Voice" to talk with me in low-latency conversational audio.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [liveStatusText, setLiveStatusText] = useState('Idle. Ready to connect.');
  const [liveError, setLiveError] = useState<string | null>(null);

  // Audio nodes & WebSocket references
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Dedicated Audio Transcription State (gemini-3.5-transcribe)
  const [transcribedNotes, setTranscribedNotes] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const {
    isRecording: isTranscribeRecording,
    isTranscribing,
    transcriptionError,
    toggleRecording: toggleTranscribeRecording,
  } = useAudioTranscription((text) => {
    if (text.trim()) {
      setTranscribedNotes((prev) => [text.trim(), ...prev]);
    }
  });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscriptHistory, isLiveSpeaking]);

  // Clean up audio & socket on unmount
  useEffect(() => {
    return () => {
      disconnectLiveSession();
    };
  }, []);

  const startLiveSession = async () => {
    setLiveError(null);
    setIsLiveConnecting(true);
    setLiveStatusText('Initiating connection to gemini-3.8-live...');

    try {
      // 1. Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      // 2. Initialize playback AudioContext (24kHz for Gemini Live)
      const PlaybackContext = window.AudioContext || (window as any).webkitAudioContext;
      const playbackCtx = new PlaybackContext();
      if (playbackCtx.state === 'suspended') {
        await playbackCtx.resume();
      }
      playbackCtxRef.current = playbackCtx;
      nextPlayTimeRef.current = playbackCtx.currentTime;

      // 3. Establish WebSocket connection to /ws/live
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setLiveStatusText('Connected to Gemini Live session. Listening for speech...');
        setIsLiveConnecting(false);
        setIsLiveConnected(true);

        // 4. Hook microphone stream to 16kHz PCM audio streamer
        setupMicStream(stream, ws);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'audio' && data.audio) {
            setIsLiveSpeaking(true);
            playLiveAudioChunk(data.audio);
          } else if (data.type === 'interrupted') {
            stopLivePlayback();
            setIsLiveSpeaking(false);
          } else if (data.type === 'turnComplete') {
            setIsLiveSpeaking(false);
          } else if (data.type === 'error') {
            setLiveError(data.error || 'Live API session error');
            disconnectLiveSession();
          }
        } catch (e) {
          console.error('[Live Voice] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('[Live Voice] WebSocket error:', err);
        setLiveError('WebSocket connection error. Make sure server is running.');
        disconnectLiveSession();
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
        setIsLiveConnecting(false);
        setLiveStatusText('Session closed.');
      };
    } catch (err: any) {
      console.error('[Live Voice] Initialization failed:', err);
      setLiveError(err?.message || 'Failed to initialize microphone or live connection.');
      disconnectLiveSession();
    }
  };

  const setupMicStream = (stream: MediaStream, ws: WebSocket) => {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const inputCtx = new AudioContextClass({ sampleRate: 16000 });
    inputAudioCtxRef.current = inputCtx;

    const sourceNode = inputCtx.createMediaStreamSource(stream);
    const processor = inputCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;

      const input = e.inputBuffer.getChannelData(0);
      const pcm16 = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        const s = Math.max(-1, Math.min(1, input[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
      }

      const bytes = new Uint8Array(pcm16.buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      ws.send(JSON.stringify({ type: 'audio', data: base64 }));
    };

    sourceNode.connect(processor);
    processor.connect(inputCtx.destination);
  };

  const playLiveAudioChunk = (base64Audio: string) => {
    const playbackCtx = playbackCtxRef.current;
    if (!playbackCtx) return;

    try {
      const binary = atob(base64Audio);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const pcm16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768;
      }

      // Gemini Live uses 24000Hz PCM
      const audioBuffer = playbackCtx.createBuffer(1, float32.length, 24000);
      audioBuffer.getChannelData(0).set(float32);

      const bufferSource = playbackCtx.createBufferSource();
      bufferSource.buffer = audioBuffer;
      bufferSource.connect(playbackCtx.destination);

      const startTime = Math.max(playbackCtx.currentTime, nextPlayTimeRef.current);
      bufferSource.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.push(bufferSource);
      bufferSource.onended = () => {
        activeSourcesRef.current = activeSourcesRef.current.filter((s) => s !== bufferSource);
        if (activeSourcesRef.current.length === 0) {
          setIsLiveSpeaking(false);
        }
      };
    } catch (err) {
      console.warn('[Live Voice] Audio playback error:', err);
    }
  };

  const stopLivePlayback = () => {
    for (const src of activeSourcesRef.current) {
      try {
        src.stop();
      } catch {}
    }
    activeSourcesRef.current = [];
    if (playbackCtxRef.current) {
      nextPlayTimeRef.current = playbackCtxRef.current.currentTime;
    }
  };

  const disconnectLiveSession = () => {
    stopLivePlayback();

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    if (playbackCtxRef.current) {
      playbackCtxRef.current.close().catch(() => {});
      playbackCtxRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop());
      micStreamRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsLiveConnected(false);
    setIsLiveConnecting(false);
    setIsLiveSpeaking(false);
    setLiveStatusText('Disconnected');
  };

  const handleCopyNote = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-rose-950/50 via-red-900/40 to-slate-900 border border-rose-500/20 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Radio className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">Voice & Speech Studio</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-semibold border border-rose-400/30">
                  gemini-3.8-live & gemini-3.5-transcribe
                </span>
              </div>
              <p className="text-xs text-rose-200/80 mt-1">
                Real-time two-way voice conversations with Live API (<code className="text-rose-300">gemini-3.8-live</code>) and verbatim microphone audio transcription (<code className="text-rose-300">gemini-3.5-transcribe</code>).
              </p>
            </div>
          </div>

          {/* Tab Switcher */}
          <div className="inline-flex rounded-xl bg-black/40 p-1 border border-white/10 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Live Conversation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('transcribe')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'transcribe'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Audio Transcriber</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: GEMINI-3.8-LIVE REAL-TIME CONVERSATION */}
      {activeTab === 'live' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm text-center space-y-6">
            {/* Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isLiveConnected
                    ? 'bg-emerald-500 animate-pulse'
                    : isLiveConnecting
                    ? 'bg-amber-500 animate-ping'
                    : 'bg-gray-400'
                }`}
              />
              <span>{liveStatusText}</span>
            </div>

            {/* Central Animated Orb */}
            <div className="flex justify-center py-4">
              <div className="relative flex items-center justify-center">
                {isLiveConnected && (
                  <div
                    className={`absolute w-36 h-36 rounded-full bg-rose-500/20 blur-xl transition-all duration-300 ${
                      isLiveSpeaking ? 'scale-150 bg-rose-500/40' : 'scale-110'
                    }`}
                  />
                )}
                <button
                  type="button"
                  onClick={isLiveConnected ? disconnectLiveSession : startLiveSession}
                  disabled={isLiveConnecting}
                  className={`relative w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 cursor-pointer ${
                    isLiveConnected
                      ? 'bg-gradient-to-tr from-rose-600 to-red-500 text-white hover:from-rose-700 hover:to-red-600 scale-105'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600'
                  }`}
                >
                  {isLiveConnecting ? (
                    <div className="w-8 h-8 border-3 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                  ) : isLiveConnected ? (
                    <>
                      <PhoneOff className="w-8 h-8 mb-1" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">End Call</span>
                    </>
                  ) : (
                    <>
                      <PhoneCall className="w-8 h-8 text-rose-500 mb-1" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">Start Live</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Live Audio Activity Waves */}
            <div className="flex justify-center items-center gap-1.5 h-10">
              {[...Array(12)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isLiveConnected
                      ? isLiveSpeaking
                        ? 'bg-rose-500 animate-pulse'
                        : 'bg-emerald-500'
                      : 'bg-gray-200 dark:bg-gray-800 h-2'
                  }`}
                  style={{
                    height: isLiveConnected
                      ? isLiveSpeaking
                        ? `${Math.max(10, Math.sin((i + Date.now() / 200) * 1.5) * 36)}px`
                        : `${12 + (i % 4) * 4}px`
                      : '8px',
                  }}
                />
              ))}
            </div>

            {liveError && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">
                {liveError}
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Live API connects directly to Gemini 3.8 over real-time WebSockets, streaming 16kHz audio from your microphone and playing back 24kHz audio with instant interruption handling.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: DEDICATED AUDIO TRANSCRIBER (gemini-3.5-transcribe) */}
      {activeTab === 'transcribe' && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm space-y-6">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto border border-rose-200 dark:border-rose-900">
                <Mic className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Microphone Audio Transcriber
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-lg mx-auto">
                  Record spoken thoughts, meetings, lectures, or ideas with your microphone. Transcribed verbatim into structured text using <code className="text-rose-600 dark:text-rose-400 font-semibold">gemini-3.5-transcribe</code>.
                </p>
              </div>

              {/* Record Button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={toggleTranscribeRecording}
                  disabled={isTranscribing}
                  className={`px-6 py-3 rounded-2xl font-bold text-sm text-white shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2.5 mx-auto cursor-pointer ${
                    isTranscribeRecording
                      ? 'bg-red-600 hover:bg-red-700 shadow-red-500/30 animate-pulse'
                      : isTranscribing
                      ? 'bg-amber-600 shadow-amber-500/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30'
                  }`}
                >
                  {isTranscribeRecording ? (
                    <>
                      <MicOff className="w-5 h-5" />
                      <span>Stop & Transcribe with gemini-3.5-transcribe</span>
                    </>
                  ) : isTranscribing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing Speech with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-5 h-5" />
                      <span>Start Voice Recording</span>
                    </>
                  )}
                </button>
              </div>

              {transcriptionError && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400 max-w-md mx-auto">
                  {transcriptionError}
                </div>
              )}
            </div>

            {/* List of Transcribed Notes */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-500" />
                <span>Transcriptions ({transcribedNotes.length})</span>
              </h3>

              {transcribedNotes.length === 0 ? (
                <div className="p-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-gray-800 text-xs text-gray-400">
                  No audio transcribed yet. Tap "Start Voice Recording" to dictate text.
                </div>
              ) : (
                <div className="space-y-3">
                  {transcribedNotes.map((note, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 space-y-2"
                    >
                      <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">
                        {note}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-700/60 text-xs text-gray-400">
                        <span className="text-[11px] font-mono text-rose-600 dark:text-rose-400 font-semibold">
                          gemini-3.5-transcribe
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyNote(idx, note)}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
                        >
                          {copiedIndex === idx ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedIndex === idx ? 'Copied' : 'Copy Text'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
