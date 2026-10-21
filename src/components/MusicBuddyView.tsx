import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Play,
  Pause,
  Download,
  Sparkles,
  Volume2,
  VolumeX,
  Clock,
  Radio,
  Trash2,
  Upload,
  Image as ImageIcon,
  X,
  ListMusic,
  Headphones,
} from 'lucide-react';
import { GeneratedMusic } from '../types';
import { requestGenerateMusic } from '../services/api';

interface MusicBuddyViewProps {
  musicList?: GeneratedMusic[];
  onSaveMusic?: (track: GeneratedMusic) => void;
  onDeleteMusic?: (id: string) => void;
}

const PRESET_VIBES = [
  {
    label: 'Chill Lofi',
    prompt: 'Warm chillhop beats with mellow electric piano, soft vinyl crackle, and gentle jazz chords for studying',
    modelType: 'clip' as const,
  },
  {
    label: 'Cinematic Epic',
    prompt: 'Majestic orchestral film soundtrack with soaring strings, deep brass, and cinematic trailer percussion',
    modelType: 'pro' as const,
  },
  {
    label: 'Retro Synthwave',
    prompt: '1980s neon synthwave with pulsing arpeggiated basslines, nostalgic analog synthesizers, and upbeat electronic drums',
    modelType: 'clip' as const,
  },
  {
    label: 'Acoustic Indie',
    prompt: 'Uplifting acoustic indie folk with warm fingerpicked guitar, cheerful tambourine, and heartfelt rustic melodies',
    modelType: 'pro' as const,
  },
  {
    label: 'Ambient Zen',
    prompt: 'Deep meditation ambient soundscape with soothing pads, resonant crystal singing bowls, and peaceful forest rain',
    modelType: 'clip' as const,
  },
];

export const MusicBuddyView: React.FC<MusicBuddyViewProps> = ({
  musicList: propMusicList,
  onSaveMusic,
  onDeleteMusic,
}) => {
  const [localMusicList, setLocalMusicList] = useState<GeneratedMusic[]>(() => {
    try {
      const saved = localStorage.getItem('ai_buddy_music_tracks');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const musicList = propMusicList || localMusicList;

  const handleSave = (track: GeneratedMusic) => {
    if (onSaveMusic) {
      onSaveMusic(track);
    }
    setLocalMusicList((prev) => {
      const updated = [track, ...prev];
      try {
        localStorage.setItem('ai_buddy_music_tracks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleDelete = (id: string) => {
    if (onDeleteMusic) {
      onDeleteMusic(id);
    }
    setLocalMusicList((prev) => {
      const updated = prev.filter((t) => t.id !== id);
      try {
        localStorage.setItem('ai_buddy_music_tracks', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (currentTrack?.id === id) {
      setCurrentTrack(null);
      setIsPlaying(false);
    }
  };

  const [prompt, setPrompt] = useState('');
  const [modelType, setModelType] = useState<'clip' | 'pro'>('clip');
  const [inspirationImage, setInspirationImage] = useState<{ data: string; mimeType: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Audio Playback state
  const [currentTrack, setCurrentTrack] = useState<GeneratedMusic | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Sync current track to audio element
  useEffect(() => {
    if (audioRef.current && currentTrack) {
      audioRef.current.src = currentTrack.audioUrl;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleTogglePlay = (track?: GeneratedMusic) => {
    if (track && (!currentTrack || currentTrack.id !== track.id)) {
      setCurrentTrack(track);
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setInspirationImage({
        data: (reader.result as string) || '',
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMsg('');

    try {
      const result = await requestGenerateMusic({
        prompt: prompt.trim(),
        modelType,
        image: inspirationImage,
      });

      // Convert base64 audio to Blob URL for playback
      const binary = atob(result.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: result.mimeType || 'audio/wav' });
      const audioUrl = URL.createObjectURL(blob);

      const newTrack: GeneratedMusic = {
        id: `track-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: prompt.slice(0, 45).trim() + (prompt.length > 45 ? '...' : ''),
        prompt: result.prompt,
        modelType: result.modelType as 'clip' | 'pro',
        audioUrl,
        lyrics: result.lyrics,
        createdAt: Date.now(),
        duration: result.duration,
      };

      handleSave(newTrack);
      setCurrentTrack(newTrack);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Music generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={() => setIsPlaying(false)}
        muted={isMuted}
      />

      {/* Hero Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-violet-950/60 via-purple-900/40 to-slate-900 border border-violet-500/20 text-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30 flex items-center justify-center shrink-0">
              <Music className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold">Music Studio</h1>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-semibold border border-violet-400/30">
                  Lyria Engine
                </span>
              </div>
              <p className="text-xs text-violet-200/80 mt-1">
                Compose original soundtracks with Google Lyria: generate 30-second clips (<code className="text-violet-300">lyria-3-clip-preview</code>) or full-length master tracks (<code className="text-violet-300">lyria-3-pro-preview</code>).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generator Form */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm space-y-5">
        <form onSubmit={handleGenerate} className="space-y-4">
          {/* Model Type Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-gray-800">
            <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
              <Headphones className="w-4 h-4 text-violet-500" />
              <span>Composition Model:</span>
            </label>
            <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setModelType('clip')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  modelType === 'clip'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Lyria Clip (Up to 30s)</span>
              </button>
              <button
                type="button"
                onClick={() => setModelType('pro')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  modelType === 'pro'
                    ? 'bg-violet-600 text-white shadow-xs'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Lyria Pro (Full Track)</span>
              </button>
            </div>
          </div>

          {/* Prompt textarea */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              Describe the track, mood, instruments, or lyrics:
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A cinematic uplifting track with pulsing arpeggiated synths, warm cello, and a subtle Lo-fi drum beat..."
                rows={3}
                className="w-full p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-sm text-gray-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-violet-500 transition resize-none"
              />
            </div>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-violet-500" /> Presets:
            </span>
            {PRESET_VIBES.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(preset.prompt);
                  setModelType(preset.modelType);
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-violet-50 dark:hover:bg-violet-950/40 hover:text-violet-600 dark:hover:text-violet-400 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 transition cursor-pointer"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Optional Image Inspiration */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition">
                <Upload className="w-3.5 h-3.5 text-gray-500" />
                <span>Attach Visual Inspiration</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {inspirationImage && (
                <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-950/50 border border-violet-200 dark:border-violet-800 text-xs text-violet-700 dark:text-violet-300">
                  <ImageIcon className="w-3.5 h-3.5" />
                  <span>Image attached</span>
                  <button
                    type="button"
                    onClick={() => setInspirationImage(null)}
                    className="hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!prompt.trim() || isGenerating}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-violet-500/20 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating Audio Stream...</span>
                </>
              ) : (
                <>
                  <Music className="w-4 h-4" />
                  <span>Compose with {modelType === 'clip' ? 'Lyria Clip' : 'Lyria Pro'}</span>
                </>
              )}
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-600 dark:text-red-400">
              {errorMsg}
            </div>
          )}
        </form>
      </div>

      {/* Active Music Player Component */}
      {currentTrack && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-violet-900/30 to-purple-900/20 border border-violet-500/30 backdrop-blur-md space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleTogglePlay()}
                className="w-12 h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg transition active:scale-95 cursor-pointer shrink-0"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                  {currentTrack.title}
                </h2>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  <span className="font-mono text-violet-500 dark:text-violet-400 font-semibold">
                    {currentTrack.modelType === 'clip' ? 'lyria-3-clip-preview (30s)' : 'lyria-3-pro-preview (Full Track)'}
                  </span>
                  <span>•</span>
                  <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800 transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <a
                href={currentTrack.audioUrl}
                download={`${currentTrack.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600/30 text-violet-600 dark:text-violet-300 border border-violet-500/30 text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Audio</span>
              </a>
            </div>
          </div>

          {/* Wave Scrubber */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                const val = Number(e.target.value);
                setCurrentTime(val);
                if (audioRef.current) {
                  audioRef.current.currentTime = val;
                }
              }}
              className="w-full accent-violet-600 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-lg cursor-pointer"
            />
          </div>

          {/* Lyrics / Metadata */}
          {currentTrack.lyrics && (
            <div className="mt-2 p-3 rounded-xl bg-black/20 text-xs text-violet-100/90 whitespace-pre-wrap font-mono">
              <span className="font-semibold text-violet-300 block mb-1">Generated Lyrics & Metadata:</span>
              {currentTrack.lyrics}
            </div>
          )}
        </div>
      )}

      {/* Library of Generated Music */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ListMusic className="w-4 h-4 text-violet-500" />
            <span>Track Library ({musicList.length})</span>
          </h2>
        </div>

        {musicList.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50">
            <Music className="w-8 h-8 mx-auto text-gray-400 mb-2 opacity-50" />
            <p className="text-xs text-gray-500">No tracks generated yet. Pick a preset above to create your first track!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {musicList.map((track) => {
              const isSelected = currentTrack?.id === track.id;
              const isTrackPlaying = isSelected && isPlaying;

              return (
                <div
                  key={track.id}
                  className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-violet-500 bg-violet-50/50 dark:bg-violet-950/20'
                      : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => handleTogglePlay(track)}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition ${
                        isTrackPlaying
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-violet-600 hover:text-white'
                      }`}
                    >
                      {isTrackPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                        {track.title}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-0.5">
                        <span className="bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.2 rounded font-mono font-medium">
                          {track.modelType === 'clip' ? 'Lyria Clip' : 'Lyria Pro'}
                        </span>
                        <span>{new Date(track.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <a
                      href={track.audioUrl}
                      download={`${track.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.wav`}
                      title="Download Track"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleDelete(track.id)}
                      title="Delete Track"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
