import React, { useState, useRef } from 'react';
import {
  Image as ImageIcon,
  Film,
  Sparkles,
  Download,
  Share2,
  Copy,
  Check,
  Maximize2,
  X,
  Trash2,
  Palette,
  Ratio,
  Wand2,
  Upload,
  Play,
  RotateCcw,
  Loader2,
  AlertCircle,
  Clapperboard,
  Edit3,
  Layers,
  Mic,
  MicOff,
  Video,
} from 'lucide-react';
import { GeneratedImage, GeneratedVideo } from '../types';
import {
  requestGenerateImage,
  requestGenerateVideo,
  checkVideoStatus,
  downloadVideoBlob,
} from '../services/api';
import { useAudioTranscription } from '../utils/useAudioTranscription';

const STYLES = [
  'Photorealistic',
  'Digital Art',
  '3D Render',
  'Anime / Manga',
  'Cyberpunk Neon',
  'Watercolor Painting',
  'Cinematic Film Still',
  'Minimalist Vector',
];

const ASPECT_RATIOS = [
  { id: '1:1', label: 'Square (1:1)' },
  { id: '16:9', label: 'Landscape (16:9)' },
  { id: '9:16', label: 'Portrait (9:16)' },
  { id: '4:3', label: 'Standard (4:3)' },
  { id: '3:4', label: 'Vertical (3:4)' },
];

const VIDEO_RATIOS: Array<{ id: '16:9' | '9:16'; label: string; desc: string }> = [
  {
    id: '16:9',
    label: '16:9 Widescreen Landscape',
    desc: 'Ideal for monitors, presentations, and cinematic videos',
  },
  {
    id: '9:16',
    label: '9:16 Vertical Portrait',
    desc: 'Optimized for mobile viewing, shorts, and social media reels',
  },
];

const createSamplePhoto = (title: string, bgGradient: string, elements: string) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" width="800" height="450">
    <defs>${bgGradient}</defs>
    <rect width="800" height="450" fill="url(#bg)"/>
    ${elements}
    <text x="400" y="420" font-family="system-ui, -apple-system, sans-serif" font-size="20" font-weight="700" fill="rgba(255,255,255,0.9)" text-anchor="middle">${title}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

const SAMPLE_PHOTO_PRESETS = [
  {
    title: 'Alpine Sunset Lake',
    prompt: 'Gentle water ripples on the lake, soft golden hour sun reflecting off calm water with slow cinematic pan',
    url: createSamplePhoto(
      'Alpine Sunset Lake',
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ff7e5f"/>
        <stop offset="50%" stop-color="#feb47b"/>
        <stop offset="100%" stop-color="#2c3e50"/>
      </linearGradient>`,
      `<circle cx="400" cy="180" r="70" fill="#fff5eb" opacity="0.9"/>
       <polygon points="50,300 200,120 350,300" fill="#3d405b" opacity="0.8"/>
       <polygon points="250,300 450,100 650,300" fill="#2b2d42" opacity="0.9"/>
       <polygon points="500,300 650,150 780,300" fill="#1d3557" opacity="0.8"/>
       <rect x="0" y="280" width="800" height="170" fill="#1b263b" opacity="0.7"/>`
    ),
  },
  {
    title: 'Cyberpunk Neon City',
    prompt: 'Cinematic rain dripping onto wet pavement, glowing neon signs pulsing and flickering with smooth camera tracking',
    url: createSamplePhoto(
      'Cyberpunk Neon City',
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0f0c29"/>
        <stop offset="50%" stop-color="#302b63"/>
        <stop offset="100%" stop-color="#24243e"/>
      </linearGradient>`,
      `<rect x="100" y="80" width="90" height="300" fill="#ff007f" opacity="0.6"/>
       <rect x="230" y="120" width="110" height="260" fill="#00f0ff" opacity="0.5"/>
       <rect x="380" y="60" width="130" height="320" fill="#7928ca" opacity="0.7"/>
       <rect x="550" y="140" width="90" height="240" fill="#ff007f" opacity="0.5"/>
       <rect x="670" y="100" width="80" height="280" fill="#00f0ff" opacity="0.6"/>
       <circle cx="400" cy="180" r="140" fill="none" stroke="#00f0ff" stroke-width="4" opacity="0.6"/>
       <rect x="0" y="360" width="800" height="90" fill="#111" opacity="0.9"/>`
    ),
  },
  {
    title: 'Emerald Forest Mist',
    prompt: 'Cascading forest waterfall mist drifting gently in sunbeams through dense emerald foliage and mossy stones',
    url: createSamplePhoto(
      'Emerald Forest Mist',
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#134e5e"/>
        <stop offset="100%" stop-color="#71b280"/>
      </linearGradient>`,
      `<polygon points="100,0 220,380 0,380" fill="#0b3c2d" opacity="0.9"/>
       <polygon points="700,0 580,380 800,380" fill="#0b3c2d" opacity="0.9"/>
       <rect x="370" y="60" width="60" height="320" fill="#e0fbfc" opacity="0.85"/>
       <ellipse cx="400" cy="380" rx="200" ry="40" fill="#98d8c8" opacity="0.6"/>`
    ),
  },
];

interface ImageBuddyViewProps {
  initialTab?: 'image' | 'video';
  images: GeneratedImage[];
  onSaveImage: (img: GeneratedImage) => void;
  onDeleteImage: (id: string) => void;
}

export const ImageBuddyView: React.FC<ImageBuddyViewProps> = ({
  initialTab = 'image',
  images,
  onSaveImage,
  onDeleteImage,
}) => {
  const [activeTab, setActiveTab] = useState<'image' | 'video'>(initialTab);
  const [imageSubMode, setImageSubMode] = useState<'create' | 'edit'>('create');
  const [videoMode, setVideoMode] = useState<'photo' | 'text'>('photo');

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Image Generation State
  const [prompt, setPrompt] = useState('');
  const [editSourceImage, setEditSourceImage] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState('Photorealistic');
  const [selectedRatio, setSelectedRatio] = useState('1:1');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageErrorMsg, setImageErrorMsg] = useState('');
  const [fullscreenImage, setFullscreenImage] = useState<GeneratedImage | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Video Generation (Veo) State
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [uploadedPhotoBase64, setUploadedPhotoBase64] = useState<string | null>(null);
  const [uploadedPhotoMime, setUploadedPhotoMime] = useState<string>('image/jpeg');
  const [videoPrompt, setVideoPrompt] = useState('');
  const [videoRatio, setVideoRatio] = useState<'16:9' | '9:16'>('16:9');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [videoProgressStatus, setVideoProgressStatus] = useState<string>('');
  const [videoErrorMsg, setVideoErrorMsg] = useState('');
  const [generatedVideos, setGeneratedVideos] = useState<GeneratedVideo[]>(() => {
    try {
      const stored = localStorage.getItem('ai_buddy_veo_videos');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [activeVideoModal, setActiveVideoModal] = useState<GeneratedVideo | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editImageInputRef = useRef<HTMLInputElement>(null);

  // Audio transcription for Image prompt
  const { isRecording: isRecordingImage, isTranscribing: isTranscribingImage, toggleRecording: toggleImageRecording } =
    useAudioTranscription((text) => setPrompt((prev) => (prev ? `${prev} ${text}` : text)));

  // Audio transcription for Video prompt
  const { isRecording: isRecordingVideo, isTranscribing: isTranscribingVideo, toggleRecording: toggleVideoRecording } =
    useAudioTranscription((text) => setVideoPrompt((prev) => (prev ? `${prev} ${text}` : text)));

  const saveVideosToStorage = (newVideos: GeneratedVideo[]) => {
    setGeneratedVideos(newVideos);
    try {
      localStorage.setItem('ai_buddy_veo_videos', JSON.stringify(newVideos));
    } catch (e) {
      console.warn('Failed to save videos to localStorage', e);
    }
  };

  const samplePrompts = [
    'A majestic snow leopard perched on a crystal Himalayan peak at dawn with glowing aura',
    'A cozy cyberpunk coffee shop in Tokyo with rain on neon glass windows, volumetric lighting',
    'A futuristic electric sports car concept driving along coastal cliffs at sunset, octane render',
    'Whimsical treehouse library nestled inside an ancient giant redwood tree with glowing lanterns',
  ];

  const sampleEditPrompts = [
    'Add vivid neon lighting, cyberpunk holograms, and wet reflective streets',
    'Change the time of day to a dramatic starry twilight with the Milky Way visible',
    'Transform into a soft impressionistic watercolor painting with pastel tones',
    'Add a majestic dragon flying through the clouds in the distant background',
  ];

  const sampleVideoPrompts = [
    'Cinematic slow camera zoom with gentle breeze moving through the scene',
    'Dynamic lighting shifts from golden hour sunset to twilight neon',
    'Smooth camera pan with subtle natural motion and ambient atmosphere',
    'Particles of glowing light floating upward, depth of field blur',
  ];

  // Image Creation or Editing Handler (gemini-3.1-flash-image-preview)
  const handleGenerateImage = async (customPrompt?: string) => {
    const activePrompt = customPrompt || prompt;
    if (!activePrompt.trim() || isGeneratingImage) return;

    setIsGeneratingImage(true);
    setImageErrorMsg('');
    try {
      const result = await requestGenerateImage({
        prompt: activePrompt,
        sourceImage: imageSubMode === 'edit' ? editSourceImage : null,
        aspectRatio: selectedRatio,
        style: selectedStyle,
      });

      const newImage: GeneratedImage = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt: activePrompt,
        style: selectedStyle,
        aspectRatio: selectedRatio,
        imageUrl: result.imageUrl,
        isEdited: imageSubMode === 'edit' && Boolean(editSourceImage),
        createdAt: Date.now(),
      };

      onSaveImage(newImage);
    } catch (err: any) {
      setImageErrorMsg(err?.message || 'Failed to generate image. Please try again.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // Upload Photo for Editing
  const handleEditSourceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setEditSourceImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Upload Photo for Video
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setVideoErrorMsg('Please select a valid image file (JPEG, PNG, WEBP).');
      return;
    }

    setVideoErrorMsg('');
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setUploadedPhotoUrl(result);
      setUploadedPhotoMime(file.type || 'image/jpeg');
      const base64Data = result.replace(/^data:[^;]+;base64,/, '');
      setUploadedPhotoBase64(base64Data);
    };
    reader.readAsDataURL(file);
  };

  // Use an existing gallery image for editing
  const handleStartEditImage = (img: GeneratedImage) => {
    setActiveTab('image');
    setImageSubMode('edit');
    setEditSourceImage(img.imageUrl);
    setPrompt(`Modify this scene to add `);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Use an existing gallery image for video animation
  const handleAnimateGalleryImage = (img: GeneratedImage) => {
    setActiveTab('video');
    setVideoMode('photo');
    setUploadedPhotoUrl(img.imageUrl);
    setVideoPrompt(`Animate this scene with natural movement: ${img.prompt.slice(0, 80)}`);
    if (img.aspectRatio === '9:16') {
      setVideoRatio('9:16');
    } else {
      setVideoRatio('16:9');
    }

    if (img.imageUrl.startsWith('data:')) {
      setUploadedPhotoBase64(img.imageUrl.replace(/^data:[^;]+;base64,/, ''));
      setUploadedPhotoMime('image/png');
    } else {
      fetch(img.imageUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            setUploadedPhotoBase64(res.replace(/^data:[^;]+;base64,/, ''));
            setUploadedPhotoMime(blob.type || 'image/jpeg');
          };
          reader.readAsDataURL(blob);
        })
        .catch(() => {});
    }
  };

  // Video Generation Handler (veo-3.1-fast-generate-preview - supports Text-to-Video and Photo-to-Video)
  const handleGenerateVideo = async () => {
    const isTextMode = videoMode === 'text';
    if ((!isTextMode && !uploadedPhotoBase64) || !videoPrompt.trim() || isGeneratingVideo) return;

    setIsGeneratingVideo(true);
    setVideoErrorMsg('');
    setVideoProgressStatus(`Connecting to Veo neural engine (veo-3.1-fast-generate-preview)...`);

    try {
      const startResult = await requestGenerateVideo({
        imageBytes: isTextMode ? undefined : (uploadedPhotoBase64 || undefined),
        mimeType: isTextMode ? undefined : uploadedPhotoMime,
        prompt: videoPrompt.trim() || 'A smooth cinematic video animation with natural movement',
        aspectRatio: videoRatio,
      });

      const operationName = startResult.operationName;
      setVideoProgressStatus('Rendering video frames with Veo model (veo-3.1-fast-generate-preview)...');

      let isDone = false;
      let attempts = 0;
      const maxAttempts = 60;

      while (!isDone && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        attempts++;

        setVideoProgressStatus(
          `Synthesizing cinematic frames... (${attempts * 3}s elapsed, please hold on)`
        );

        const statusResult = await checkVideoStatus(operationName);

        if (statusResult.error) {
          throw new Error(statusResult.error);
        }

        if (statusResult.done) {
          isDone = true;
          break;
        }
      }

      if (!isDone) {
        throw new Error('Video generation timed out. Please try again.');
      }

      setVideoProgressStatus('Downloading completed MP4 video...');
      const videoBlob = await downloadVideoBlob(operationName);
      const videoObjectUrl = URL.createObjectURL(videoBlob);

      const newVideo: GeneratedVideo = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        prompt: videoPrompt.trim() || 'Veo Cinematic Animation',
        sourceImageUrl: isTextMode ? undefined : (uploadedPhotoUrl || undefined),
        videoUrl: videoObjectUrl,
        aspectRatio: videoRatio,
        model: 'veo-3.1-fast-generate-preview',
        createdAt: Date.now(),
      };

      const updated = [newVideo, ...generatedVideos];
      saveVideosToStorage(updated);
      setActiveVideoModal(newVideo);
      setVideoProgressStatus('');
    } catch (err: any) {
      console.error('Veo video generation error:', err);
      setVideoErrorMsg(
        err?.message ||
          'Failed to generate video with veo-3.1-fast-generate-preview. Please try again.'
      );
    } finally {
      setIsGeneratingVideo(false);
      setVideoProgressStatus('');
    }
  };

  const handleDownloadImage = (img: GeneratedImage) => {
    const a = document.createElement('a');
    a.href = img.imageUrl;
    a.download = `ai-art-${img.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteVideo = (id: string) => {
    const updated = generatedVideos.filter((v) => v.id !== id);
    saveVideosToStorage(updated);
    if (activeVideoModal?.id === id) {
      setActiveVideoModal(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Studio Header & Navigation */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-fuchsia-950/50 via-purple-900/40 to-slate-900 border border-fuchsia-500/20 text-white relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 flex items-center justify-center shrink-0">
              {activeTab === 'image' ? <ImageIcon className="w-6 h-6" /> : <Film className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <span>Visual Studio</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-semibold border border-fuchsia-500/30">
                  {activeTab === 'image' ? 'gemini-3.1-flash-image-preview' : 'veo-3.1-fast-generate-preview'}
                </span>
              </h1>
              <p className="text-xs text-gray-300 mt-0.5">
                {activeTab === 'image'
                  ? 'Create new artworks or edit existing images with text prompts using gemini-3.1-flash-image-preview.'
                  : 'Generate cinematic videos from text prompts or animate photos into video using veo-3.1-fast-generate-preview (16:9 or 9:16).'}
              </p>
            </div>
          </div>

          {/* Main Tab Selector */}
          <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10 backdrop-blur-xs self-stretch sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab('image')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'image'
                  ? 'bg-fuchsia-600 text-white shadow-2xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Images</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'video'
                  ? 'bg-fuchsia-600 text-white shadow-2xs'
                  : 'text-gray-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Veo Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: GENERATE & EDIT IMAGE */}
      {activeTab === 'image' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-4">
            {/* Create vs Edit sub-mode toggle */}
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setImageSubMode('create')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    imageSubMode === 'create'
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create New Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImageSubMode('edit')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    imageSubMode === 'edit'
                      ? 'bg-fuchsia-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Existing Image</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-gray-400 hidden sm:inline">
                gemini-3.1-flash-image-preview
              </span>
            </div>

            {/* Source Image Selector for Edit Mode */}
            {imageSubMode === 'edit' && (
              <div className="p-3.5 rounded-xl bg-fuchsia-50/50 dark:bg-fuchsia-950/20 border border-fuchsia-200 dark:border-fuchsia-900/60 space-y-3">
                <input
                  type="file"
                  ref={editImageInputRef}
                  accept="image/*"
                  onChange={handleEditSourceUpload}
                  className="hidden"
                />

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-fuchsia-600" />
                    <span>Source Image to Edit:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => editImageInputRef.current?.click()}
                    className="text-xs text-fuchsia-600 dark:text-fuchsia-400 font-semibold hover:underline cursor-pointer"
                  >
                    {editSourceImage ? 'Change Image' : 'Upload Image'}
                  </button>
                </div>

                {editSourceImage ? (
                  <div className="relative inline-block rounded-xl overflow-hidden border border-gray-300 dark:border-gray-700 max-h-48">
                    <img src={editSourceImage} alt="Edit source" className="max-h-48 object-contain" />
                    <button
                      type="button"
                      onClick={() => setEditSourceImage(null)}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-red-600 text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => editImageInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center cursor-pointer hover:border-fuchsia-500 transition"
                  >
                    <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Click to upload an image to edit with AI
                    </p>
                    <p className="text-[10px] text-gray-500">Or click "Edit Image" on any artwork in your gallery below</p>
                  </div>
                )}
              </div>
            )}

            {/* Prompt Input with Audio Dictation */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  {imageSubMode === 'edit' ? 'Edit Instructions (Text Prompt):' : 'Image Prompt:'}
                </label>
                <button
                  type="button"
                  onClick={toggleImageRecording}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium cursor-pointer transition ${
                    isRecordingImage
                      ? 'bg-red-500 text-white animate-pulse'
                      : isTranscribingImage
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'text-gray-500 hover:text-fuchsia-600'
                  }`}
                  title="Speak prompt with microphone (transcribed by gemini-3.5-transcribe)"
                >
                  {isRecordingImage ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecordingImage ? 'Stop Recording' : isTranscribingImage ? 'Transcribing...' : 'Dictate'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  imageSubMode === 'edit'
                    ? 'e.g., Turn the background into a starry galaxy, add neon cyberpunk sunglasses...'
                    : 'Describe the image you want to create in rich visual detail...'
                }
                className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-hidden focus:border-fuchsia-500 leading-relaxed"
              />
            </div>

            {/* Style & Ratio */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-fuchsia-500" />
                  <span>Art Style Preset:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {STYLES.map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setSelectedStyle(style)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        selectedStyle === style
                          ? 'bg-fuchsia-600 text-white shadow-2xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5 flex items-center gap-1.5">
                  <Ratio className="w-3.5 h-3.5 text-fuchsia-500" />
                  <span>Aspect Ratio:</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ASPECT_RATIOS.map((ratio) => (
                    <button
                      key={ratio.id}
                      type="button"
                      onClick={() => setSelectedRatio(ratio.id)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition cursor-pointer ${
                        selectedRatio === ratio.id
                          ? 'bg-fuchsia-600 text-white shadow-2xs'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-gray-400 flex items-center gap-1">
                <Wand2 className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Powered by gemini-3.1-flash-image-preview</span>
              </div>

              <button
                type="button"
                onClick={() => handleGenerateImage()}
                disabled={isGeneratingImage || !prompt.trim() || (imageSubMode === 'edit' && !editSourceImage)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-700 hover:to-pink-700 text-white font-bold text-xs shadow-md shadow-fuchsia-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGeneratingImage ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{imageSubMode === 'edit' ? 'Editing Image with Gemini...' : 'Generating Image...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>{imageSubMode === 'edit' ? 'Apply AI Edits' : 'Generate Artwork'}</span>
                  </>
                )}
              </button>
            </div>

            {imageErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{imageErrorMsg}</span>
              </div>
            )}
          </div>

          {/* Inspiration Prompts */}
          <div className="space-y-2.5">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {imageSubMode === 'edit' ? 'Sample Edit Ideas' : 'Inspiration Prompts'}
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {(imageSubMode === 'edit' ? sampleEditPrompts : samplePrompts).map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPrompt(p);
                    if (imageSubMode === 'create') {
                      handleGenerateImage(p);
                    }
                  }}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-left text-xs text-gray-700 dark:text-gray-300 hover:border-fuchsia-400 dark:hover:border-fuchsia-600 transition flex items-start gap-2.5 cursor-pointer group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-fuchsia-400 shrink-0 mt-0.5 group-hover:scale-110 transition" />
                  <span className="line-clamp-2">{p}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: VEO VIDEO GENERATION (veo-3.1-fast-generate-preview) */}
      {activeTab === 'video' && (
        <div className="space-y-6">
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xs space-y-5">
            {/* Mode Switcher: Photo-to-Video vs Text-to-Video */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800 gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Film className="w-4 h-4 text-fuchsia-500" />
                  <span>Veo 3 Video Generator</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono font-medium">
                    veo-3.1-fast-generate-preview
                  </span>
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Generate video from text or animate photos into cinematic video in 16:9 or 9:16 aspect ratio.
                </p>
              </div>

              <div className="inline-flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 border border-gray-200 dark:border-gray-700 shrink-0">
                <button
                  type="button"
                  onClick={() => setVideoMode('photo')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    videoMode === 'photo'
                      ? 'bg-fuchsia-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Photo to Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => setVideoMode('text')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    videoMode === 'text'
                      ? 'bg-fuchsia-600 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:text-white'
                  }`}
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Text to Video</span>
                </button>
              </div>
            </div>

            {/* Photo Upload Zone (Only for Photo to Video mode) */}
            {videoMode === 'photo' && (
              <div className="space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  1. Source Photo:
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {uploadedPhotoUrl ? (
                  <div className="relative group rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-950 max-h-80 flex items-center justify-center">
                    <img
                      src={uploadedPhotoUrl}
                      alt="Source for animation"
                      className="max-h-80 object-contain mx-auto"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-lg bg-white/90 hover:bg-white text-gray-900 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Replace Photo</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setUploadedPhotoUrl(null);
                          setUploadedPhotoBase64(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-fuchsia-500 rounded-2xl p-8 text-center cursor-pointer transition bg-gray-50/50 dark:bg-gray-800/40 space-y-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center mx-auto border border-fuchsia-200 dark:border-fuchsia-900">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-800 dark:text-gray-200">
                        Click to upload a photo to animate into video
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Supports JPG, PNG, WEBP. High quality images yield the most dramatic motion.
                      </p>
                    </div>
                  </div>
                )}

                {/* Preset Sample Photos */}
                {!uploadedPhotoUrl && (
                  <div className="pt-2">
                    <div className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center justify-between">
                      <span>Or pick a preset sample photo:</span>
                      <span className="text-[10px] text-fuchsia-600 dark:text-fuchsia-400">1-click test</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {SAMPLE_PHOTO_PRESETS.map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setVideoErrorMsg('');
                            setUploadedPhotoUrl(preset.url);
                            const cleanB64 = preset.url.replace(/^data:[^;]+;base64,/, '');
                            setUploadedPhotoBase64(cleanB64);
                            setUploadedPhotoMime('image/svg+xml');
                            setVideoPrompt(preset.prompt);
                          }}
                          className="group flex flex-col items-start p-2 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-fuchsia-400 bg-white dark:bg-gray-800/60 text-left transition cursor-pointer"
                        >
                          <div className="w-full h-20 rounded-lg overflow-hidden mb-2 bg-gray-900 border border-gray-200 dark:border-gray-700">
                            <img
                              src={preset.url}
                              alt={preset.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-800 dark:text-gray-200 group-hover:text-fuchsia-600">
                            {preset.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Target Aspect Ratio (16:9 or 9:16) */}
            <div className="space-y-2 pt-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                {videoMode === 'photo' ? '2. Target Aspect Ratio:' : '1. Target Aspect Ratio:'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIDEO_RATIOS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVideoRatio(item.id)}
                    className={`p-3.5 rounded-xl border text-left transition cursor-pointer ${
                      videoRatio === item.id
                        ? 'bg-fuchsia-50 dark:bg-fuchsia-950/50 border-fuchsia-500 text-fuchsia-900 dark:text-fuchsia-200 shadow-2xs'
                        : 'bg-white dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-xs mb-1">
                      <span>{item.label}</span>
                      {videoRatio === item.id && (
                        <Check className="w-4 h-4 text-fuchsia-600 dark:text-fuchsia-400" />
                      )}
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400">{item.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Video Prompt Input with Voice Dictation */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  {videoMode === 'photo' ? '3. Animation Prompt (Optional):' : '2. Video Description Prompt:'}
                </label>
                <button
                  type="button"
                  onClick={toggleVideoRecording}
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md font-medium cursor-pointer transition ${
                    isRecordingVideo
                      ? 'bg-red-500 text-white animate-pulse'
                      : isTranscribingVideo
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                      : 'text-gray-500 hover:text-fuchsia-600'
                  }`}
                  title="Speak prompt with microphone (transcribed by gemini-3.5-transcribe)"
                >
                  {isRecordingVideo ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecordingVideo ? 'Stop Recording' : isTranscribingVideo ? 'Transcribing...' : 'Dictate'}</span>
                </button>
              </div>

              <textarea
                rows={2}
                value={videoPrompt}
                onChange={(e) => setVideoPrompt(e.target.value)}
                placeholder={
                  videoMode === 'photo'
                    ? 'Describe camera motion and animation (e.g. gentle ocean breeze, slow cinematic pan right)...'
                    : 'Describe the complete scene, motion, camera angle, and lighting for the video...'
                }
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-hidden focus:border-fuchsia-500"
              />
            </div>

            {/* Inspiration video prompts */}
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {sampleVideoPrompts.map((sp, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => setVideoPrompt(sp)}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:text-fuchsia-600 transition cursor-pointer"
                >
                  + {sp}
                </button>
              ))}
            </div>

            {videoErrorMsg && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{videoErrorMsg}</span>
              </div>
            )}

            {/* Generate Action Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-800">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-500" />
                <span>Model: <strong>veo-3.1-fast-generate-preview</strong> ({videoRatio})</span>
              </div>

              <button
                type="button"
                onClick={handleGenerateVideo}
                disabled={isGeneratingVideo || (videoMode === 'photo' && !uploadedPhotoBase64) || !videoPrompt.trim()}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 hover:from-fuchsia-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-fuchsia-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering Veo Video...</span>
                  </>
                ) : (
                  <>
                    <Film className="w-4 h-4" />
                    <span>{videoMode === 'photo' ? 'Animate Photo with Veo' : 'Generate Video from Text'}</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress status */}
            {isGeneratingVideo && (
              <div className="p-4 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-purple-900 dark:text-purple-200">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600 dark:text-purple-400" />
                  <span>{videoProgressStatus || 'Processing video generation with Veo...'}</span>
                </div>
                <div className="w-full bg-purple-200 dark:bg-purple-900/60 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-fuchsia-500 to-indigo-500 h-full rounded-full animate-pulse w-3/4" />
                </div>
              </div>
            )}
          </div>

          {/* Generated Veo Videos Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Clapperboard className="w-4 h-4 text-fuchsia-500" />
                <span>Generated Veo Videos ({generatedVideos.length})</span>
              </h2>
            </div>

            {generatedVideos.length === 0 ? (
              <div className="p-8 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 space-y-2 bg-gray-50/50 dark:bg-gray-900/30">
                <Film className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto" />
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  No videos generated yet. Upload a photo or select a sample above to create your first Veo video!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {generatedVideos.map((video) => (
                  <div
                    key={video.id}
                    className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div
                      className={`relative bg-black cursor-pointer overflow-hidden flex items-center justify-center ${
                        video.aspectRatio === '9:16' ? 'aspect-[9/16] max-h-96' : 'aspect-[16/9]'
                      }`}
                      onClick={() => setActiveVideoModal(video)}
                    >
                      <video
                        src={video.videoUrl}
                        className="w-full h-full object-cover"
                        loop
                        muted
                        playsInline
                        onMouseOver={(e) => (e.currentTarget as HTMLVideoElement).play()}
                        onMouseOut={(e) => {
                          const v = e.currentTarget as HTMLVideoElement;
                          v.pause();
                          v.currentTime = 0;
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 text-gray-900 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 ml-0.5" />
                        </div>
                      </div>
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white font-mono text-[10px]">
                        {video.aspectRatio}
                      </span>
                    </div>

                    <div className="p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 line-clamp-2">
                        {video.prompt}
                      </p>
                      <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
                        <span>{video.model}</span>
                        <div className="flex items-center gap-1">
                          <a
                            href={video.videoUrl}
                            download={`veo-video-${video.id}.mp4`}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-fuchsia-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            title="Download MP4"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteVideo(video.id)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                            title="Delete Video"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gallery of Generated Images */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-fuchsia-500" />
            <span>Artwork Gallery ({images.length})</span>
          </h2>
        </div>

        {images.length === 0 ? (
          <div className="p-10 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 space-y-2">
            <ImageIcon className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto" />
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">
              Your gallery is empty. Create your first artwork above!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {images.map((img) => (
              <div
                key={img.id}
                className="group rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between"
              >
                <div
                  className="relative bg-gray-950 cursor-pointer overflow-hidden aspect-square flex items-center justify-center"
                  onClick={() => setFullscreenImage(img)}
                >
                  <img
                    src={img.imageUrl}
                    alt={img.prompt}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFullscreenImage(img);
                      }}
                      className="p-2 rounded-xl bg-white/90 text-gray-900 hover:bg-white transition"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartEditImage(img);
                      }}
                      className="p-2 rounded-xl bg-white/90 text-fuchsia-700 hover:bg-white transition"
                      title="Edit this Image"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnimateGalleryImage(img);
                      }}
                      className="p-2 rounded-xl bg-fuchsia-600 text-white hover:bg-fuchsia-700 transition"
                      title="Animate into Video (Veo)"
                    >
                      <Film className="w-4 h-4" />
                    </button>
                  </div>
                  {img.isEdited && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-fuchsia-600/80 backdrop-blur-xs text-white text-[10px] font-semibold">
                      AI Edited
                    </span>
                  )}
                </div>

                <div className="p-3.5 space-y-2">
                  <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2">
                    {img.prompt}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400">
                    <span>{img.style} • {img.aspectRatio}</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditImage(img)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-fuchsia-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        title="Edit Image"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAnimateGalleryImage(img)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-fuchsia-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        title="Animate into Video (Veo)"
                      >
                        <Film className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadImage(img)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-fuchsia-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                        title="Download Artwork"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteImage(img.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer"
                        title="Delete Artwork"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Fullscreen Video Modal */}
      {activeVideoModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setActiveVideoModal(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl space-y-3 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-white">
              <div className="flex items-center gap-2">
                <Film className="w-4 h-4 text-fuchsia-400" />
                <span className="text-xs font-bold">{activeVideoModal.model}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-300">
                  {activeVideoModal.aspectRatio}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center bg-black rounded-xl overflow-hidden max-h-[70vh]">
              <video
                src={activeVideoModal.videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-gray-300 line-clamp-2 max-w-lg">
                {activeVideoModal.prompt}
              </p>
              <a
                href={activeVideoModal.videoUrl}
                download={`veo-video-${activeVideoModal.id}.mp4`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Download Video</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image Modal */}
      {fullscreenImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setFullscreenImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-800 text-white">
              <span className="text-xs font-bold text-gray-300 truncate max-w-md">
                {fullscreenImage.prompt}
              </span>
              <button
                type="button"
                onClick={() => setFullscreenImage(null)}
                className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center bg-black rounded-xl overflow-hidden max-h-[70vh]">
              <img
                src={fullscreenImage.imageUrl}
                alt={fullscreenImage.prompt}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-gray-400">
                {fullscreenImage.style} • {fullscreenImage.aspectRatio}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleStartEditImage(fullscreenImage);
                    setFullscreenImage(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAnimateGalleryImage(fullscreenImage);
                    setFullscreenImage(null);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-xs font-semibold"
                >
                  <Film className="w-3.5 h-3.5" />
                  <span>Animate into Video</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadImage(fullscreenImage)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
