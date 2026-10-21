import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Copy,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Bot,
  User,
  Sparkles,
  ExternalLink,
  FileText,
  X,
  AlertTriangle,
  Play,
  Square,
  Globe,
  Loader2,
  Info,
  Download,
  FileCode,
  Printer,
  ChevronDown,
  MapPin,
  Cpu,
} from 'lucide-react';
import { AttachedFile, BuddyMode, ChatMessage, GroundingSource, MapPlace } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';
import { evaluatePromptSafety } from '../services/safety';
import { browserSpeechSynthesis, isSpeechSynthesisSupported } from '../services/speechSynthesis';
import { generateChatMarkdown, downloadMarkdown, exportChatToPdf } from '../services/exportChat';
import { useAudioTranscription } from '../utils/useAudioTranscription';

interface ChatViewProps {
  mode: BuddyMode;
  messages: ChatMessage[];
  sessionTitle?: string;
  sessionCreatedAt?: number;
  onSendMessage: (content: string, files: AttachedFile[], preferredModel?: string) => void;
  onRegenerate: () => void;
  isGenerating: boolean;
  voiceName?: string;
  speechRate?: number;
  autoPlaySpeech?: boolean;
  language?: string;
}

export const ChatView: React.FC<ChatViewProps> = ({
  mode,
  messages,
  sessionTitle = 'Chat Conversation',
  sessionCreatedAt,
  onSendMessage,
  onRegenerate,
  isGenerating,
  voiceName = 'Puck',
  speechRate = 1.0,
  autoPlaySpeech = false,
  language = 'en-US',
}) => {
  const [inputText, setInputText] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
  const [safetyWarnings, setSafetyWarnings] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'auto' | 'gemini-3.5-flash' | 'gemini-3.1-pro-preview' | 'gemini-3.1-flash-lite'>('auto');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const autoPlayHandledRef = useRef<string | null>(null);

  // Stop SpeechSynthesis when unmounting
  useEffect(() => {
    return () => {
      browserSpeechSynthesis.stop();
    };
  }, []);

  // Handle autoplay speech when new assistant message arrives
  useEffect(() => {
    if (!autoPlaySpeech || isGenerating || messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    if (
      lastMsg.role === 'assistant' &&
      !lastMsg.content.startsWith('⚠️ Error:') &&
      autoPlayHandledRef.current !== lastMsg.id
    ) {
      autoPlayHandledRef.current = lastMsg.id;
      handleTextToSpeech(lastMsg.id, lastMsg.content);
    }
  }, [messages, isGenerating, autoPlaySpeech]);

  // Audio transcription using gemini-3.5-transcribe
  const {
    isRecording: isTranscribingActive,
    isTranscribing,
    transcriptionError,
    toggleRecording: toggleTranscription,
  } = useAudioTranscription((transcribedText) => {
    setInputText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  });

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  // Elapsed timer when thinking
  useEffect(() => {
    if (isGenerating) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isGenerating]);

  // Textarea Change with Safety Evaluation
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);

    const safety = evaluatePromptSafety(text);
    if (safety.warnings.length > 0) {
      setSafetyWarnings(safety.warnings);
    } else {
      setSafetyWarnings([]);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if ((!inputText.trim() && attachedFiles.length === 0) || isGenerating) return;
    browserSpeechSynthesis.stop();
    setPlayingMessageId(null);
    onSendMessage(inputText.trim(), attachedFiles, selectedModel === 'auto' ? undefined : selectedModel);
    setInputText('');
    setAttachedFiles([]);
    setSafetyWarnings([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // File Upload Handler
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: AttachedFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      if (file.type.startsWith('image/')) {
        const base64 = await readFileAsBase64(file);
        newAttachments.push({
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          base64,
        });
      } else {
        const textContent = await readFileAsText(file);
        newAttachments.push({
          id,
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: textContent,
        });
      }
    }

    setAttachedFiles((prev) => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string) || '');
      reader.onerror = () => resolve(`[Binary or unreadable file: ${file.name}]`);
      reader.readAsText(file);
    });
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTextToSpeech = (id: string, text: string) => {
    if (!isSpeechSynthesisSupported()) {
      console.warn('Browser SpeechSynthesis API is not supported in this environment.');
      return;
    }

    if (playingMessageId === id) {
      browserSpeechSynthesis.stop();
      setPlayingMessageId(null);
      return;
    }

    setPlayingMessageId(id);

    browserSpeechSynthesis.speak(id, text, {
      rate: speechRate,
      voiceName,
      lang: language,
      onStart: () => {
        setPlayingMessageId(id);
      },
      onEnd: () => {
        setPlayingMessageId((curr) => (curr === id ? null : curr));
      },
      onError: (err) => {
        console.warn('SpeechSynthesis error:', err);
        setPlayingMessageId((curr) => (curr === id ? null : curr));
      },
    });
  };

  const handleExportMarkdown = () => {
    setIsExportMenuOpen(false);
    const md = generateChatMarkdown(sessionTitle, messages, {
      mode,
      createdAt: sessionCreatedAt,
    });
    downloadMarkdown(sessionTitle, md);
  };

  const handleExportPdf = () => {
    setIsExportMenuOpen(false);
    exportChatToPdf(sessionTitle, messages, {
      mode,
      createdAt: sessionCreatedAt,
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-900 overflow-hidden relative">
      {/* Top Toolbar */}
      <div className="h-11 px-4 sm:px-6 border-b border-gray-100 dark:border-gray-800/80 bg-gray-50/50 dark:bg-gray-900/50 flex items-center justify-between shrink-0 text-xs">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium truncate max-w-[60%] sm:max-w-[70%]">
          <span className="truncate font-semibold text-gray-800 dark:text-gray-200">{sessionTitle}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-200/50 dark:border-indigo-800/50">
            {mode.toUpperCase()}
          </span>
        </div>

        {/* Model & Export Actions */}
        <div className="flex items-center gap-2">
          {/* Model Selector Dropdown */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs">
            <Cpu className="w-3.5 h-3.5 text-indigo-500" />
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="bg-transparent text-gray-700 dark:text-gray-300 outline-hidden cursor-pointer text-xs font-medium"
            >
              <option value="auto">Auto Model</option>
              <option value="gemini-3.5-flash">gemini-3.5-flash (General & Grounding)</option>
              <option value="gemini-3.1-pro-preview">gemini-3.1-pro-preview (Complex Tasks)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Fast Tasks)</option>
            </select>
          </div>

          {/* Export Menu */}
          {messages.length > 0 && (
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-800 transition cursor-pointer font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl py-1.5 z-30 space-y-0.5">
                  <button
                    type="button"
                    onClick={handleExportMarkdown}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <FileCode className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Download Markdown (.md)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportPdf}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-rose-500" />
                    <span>Print / Save as PDF</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-900 shadow-sm">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                How can AI Buddy help you today?
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Multi-turn conversation with memory, Search & Maps grounding, code analysis, and model routing.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
              {[
                { title: 'Explain Quantum Computing', prompt: 'Explain quantum computing to me like I am 12 years old' },
                { title: 'Find Best Coffee Shops in Seattle', prompt: 'What are the top rated independent coffee shops in Seattle, Washington with maps?' },
                { title: 'Write a React Hook', prompt: 'Write a custom React TypeScript hook for window resize debouncing' },
                { title: 'Summarize Modern History', prompt: 'Give me a comprehensive timeline of the space race from 1957 to 1969' },
              ].map((s, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSendMessage(s.prompt, [])}
                  className="p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 hover:border-indigo-500 text-left text-xs transition cursor-pointer group"
                >
                  <span className="font-semibold text-gray-800 dark:text-gray-200 group-hover:text-indigo-600">
                    {s.title}
                  </span>
                  <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{s.prompt}</p>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isCopied = copiedId === msg.id;
            const isPlaying = playingMessageId === msg.id;
            const isError = msg.content.startsWith('⚠️ Error:');

            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                    isUser
                      ? 'bg-gradient-to-tr from-indigo-600 to-sky-500'
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Body */}
                <div className={`space-y-1.5 max-w-[85%] sm:max-w-[88%] ${isUser ? 'items-end' : 'items-start'}`}>
                  {/* Model tag if assistant */}
                  {!isUser && msg.modelUsed && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                      {msg.modelUsed}
                    </span>
                  )}

                  {/* Attached Files for user */}
                  {isUser && msg.attachedFiles && msg.attachedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-end mb-1">
                      {msg.attachedFiles.map((file) => (
                        <div
                          key={file.id}
                          className="flex items-center gap-1.5 p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-xs"
                        >
                          {file.base64 ? (
                            <img src={file.base64} alt={file.name} className="w-7 h-7 object-cover rounded" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          )}
                          <span className="text-[11px] font-medium text-indigo-900 dark:text-indigo-200 truncate max-w-[120px]">
                            {file.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content Bubble */}
                  {isError ? (
                    <div className="p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col gap-2.5">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <span className="font-medium text-xs sm:text-sm">
                          {msg.content.replace(/^⚠️ Error:\s*/, '')}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={onRegenerate}
                        disabled={isGenerating}
                        className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 dark:bg-rose-900/60 text-rose-700 dark:text-rose-200 text-xs font-medium transition cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Retry question</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`p-3.5 sm:p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-xs shadow-sm'
                          : 'bg-gray-100/90 dark:bg-gray-800/90 text-gray-900 dark:text-gray-100 rounded-tl-xs border border-gray-200/60 dark:border-gray-700/60 shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                  )}

                  {/* Google Maps Grounded Places */}
                  {msg.mapPlaces && msg.mapPlaces.length > 0 && (
                    <div className="mt-2 w-full p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-xs space-y-2">
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Grounded Google Maps Places ({msg.mapPlaces.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.mapPlaces.map((place, pIdx) => (
                          <div
                            key={pIdx}
                            className="p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-emerald-100 dark:border-emerald-900/60 space-y-1"
                          >
                            <a
                              href={place.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-xs text-emerald-700 dark:text-emerald-400 hover:underline flex items-center justify-between gap-1"
                            >
                              <span className="truncate">{place.title}</span>
                              <ExternalLink className="w-3 h-3 shrink-0" />
                            </a>
                            {place.address && (
                              <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1">
                                {place.address}
                              </p>
                            )}
                            {place.reviewSnippets && place.reviewSnippets.length > 0 && (
                              <p className="text-[10px] italic text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-1 rounded line-clamp-2">
                                "{place.reviewSnippets[0]}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Web Search Sources */}
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="mt-2 w-full p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-xs">
                      <div className="flex items-center gap-1.5 font-semibold text-blue-700 dark:text-blue-400 mb-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        <span>Sources & References ({msg.sources.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.sources.map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-300 hover:text-blue-800 border border-blue-200 dark:border-blue-800 text-[11px] truncate max-w-[220px] transition"
                            title={source.uri}
                          >
                            <span className="truncate">{source.title || source.uri}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Bar */}
                  {!isUser && (
                    <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer"
                        title="Copy message"
                        aria-label="Copy message"
                      >
                        {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>

                      {/* Text-to-Speech button using browser's SpeechSynthesis API */}
                      <button
                        type="button"
                        onClick={() => handleTextToSpeech(msg.id, msg.content)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer select-none ${
                          isPlaying
                            ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-300/80 dark:border-indigo-700/80 shadow-xs ring-1 ring-indigo-400/40'
                            : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title={isPlaying ? 'Stop Text-to-Speech' : 'Text-to-Speech: Read aloud assistant message'}
                        aria-label={isPlaying ? 'Stop Text-to-Speech' : 'Text-to-Speech: Read aloud assistant message'}
                      >
                        {isPlaying ? (
                          <>
                            <VolumeX className="w-3.5 h-3.5 animate-pulse text-indigo-600 dark:text-indigo-400" />
                            <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">Stop Speech</span>
                            {/* Animated sound wave bars */}
                            <span className="flex items-end gap-0.5 h-3 ml-0.5">
                              <span className="w-0.5 h-2 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                              <span className="w-0.5 h-3 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                              <span className="w-0.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-bounce" />
                            </span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 group-hover:text-indigo-500" />
                            <span className="text-[11px] hidden sm:inline">Text-to-speech</span>
                          </>
                        )}
                      </button>

                      {msg.id === messages[messages.length - 1]?.id && (
                        <button
                          type="button"
                          onClick={() => {
                            browserSpeechSynthesis.stop();
                            setPlayingMessageId(null);
                            onRegenerate();
                          }}
                          disabled={isGenerating}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 transition cursor-pointer disabled:opacity-50"
                          title="Regenerate response"
                          aria-label="Regenerate response"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Thinking indicator */}
        {isGenerating && (
          <div className="flex items-center gap-3 mr-auto max-w-3xl">
            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-gray-100 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2 border border-gray-200 dark:border-gray-700">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>AI Buddy is synthesizing reasoning ({elapsedSeconds}s)...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto space-y-2">
          {/* Safety warnings */}
          {safetyWarnings.length > 0 && (
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{safetyWarnings[0]}</span>
            </div>
          )}

          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pb-1">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs"
                >
                  {file.base64 ? (
                    <img src={file.base64} alt={file.name} className="w-6 h-6 object-cover rounded" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  )}
                  <span className="truncate max-w-[120px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(file.id)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Main Input Box */}
          <div className="relative flex items-end gap-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-2 focus-within:border-indigo-500 transition">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.txt,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.css"
              onChange={handleFileSelect}
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 rounded-xl text-gray-500 hover:text-indigo-600 transition"
              title="Attach documents, images, code files"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Audio transcription via gemini-3.5-transcribe */}
            <button
              type="button"
              onClick={toggleTranscription}
              disabled={isTranscribing}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isTranscribingActive
                  ? 'bg-red-500 text-white animate-pulse'
                  : isTranscribing
                  ? 'bg-amber-100 text-amber-700'
                  : 'text-gray-500 hover:text-rose-600'
              }`}
              title="Speak with microphone (transcribed by gemini-3.5-transcribe)"
            >
              {isTranscribingActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <textarea
              ref={textareaRef}
              rows={1}
              value={inputText}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI Buddy anything..."
              className="flex-1 bg-transparent py-1.5 px-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none outline-hidden max-h-40 leading-relaxed"
            />

            <button
              type="button"
              onClick={handleSend}
              disabled={(!inputText.trim() && attachedFiles.length === 0) || isGenerating}
              className="p-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition shadow-xs cursor-pointer shrink-0"
              title="Send message"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
