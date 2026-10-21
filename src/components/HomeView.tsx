import React from 'react';
import {
  Bot,
  Code,
  GraduationCap,
  Search,
  Image as ImageIcon,
  Film,
  Mic,
  Plus,
  Clock,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  BookOpen,
  Terminal,
  Compass,
  Settings,
  Keyboard,
  Music,
  MapPin,
} from 'lucide-react';
import { BuddyMode, ChatSession } from '../types';

interface HomeViewProps {
  onSelectMode: (mode: BuddyMode) => void;
  onNewChat: (mode?: BuddyMode, initialPrompt?: string) => void;
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onOpenSettings: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onSelectMode,
  onNewChat,
  sessions,
  onSelectSession,
  onOpenSettings,
}) => {
  const quickActions = [
    {
      mode: 'chat' as BuddyMode,
      title: 'AI Chat',
      description: 'Ask questions, brainstorm creative ideas, or chat about anything.',
      icon: Bot,
      color: 'from-indigo-500 to-sky-500',
      badge: 'Conversational',
      prompt: 'Hello AI Buddy! Can you introduce yourself and tell me what you can help me with?',
    },
    {
      mode: 'code' as BuddyMode,
      title: 'Code Buddy',
      description: 'Write clean code, debug syntax errors, explain algorithms & architecture.',
      icon: Code,
      color: 'from-emerald-500 to-teal-500',
      badge: 'Developer',
      prompt: 'Write a TypeScript function that optimizes caching with LRU cache logic and full type safety.',
    },
    {
      mode: 'study' as BuddyMode,
      title: 'Study Buddy',
      description: 'Homework assistance, step-by-step topic breakdowns, and interactive quizzes.',
      icon: GraduationCap,
      color: 'from-amber-500 to-orange-500',
      badge: 'Academic',
      prompt: 'Explain the theory of Special Relativity using intuitive real-world train analogies for high school.',
    },
    {
      mode: 'search' as BuddyMode,
      title: 'Search Buddy',
      description: 'Live real-time web search with Google Grounding, verified sources and links.',
      icon: Search,
      color: 'from-blue-500 to-cyan-500',
      badge: 'gemini-3.5-flash',
      prompt: 'What are the most recent scientific breakthroughs and discoveries from the James Webb Space Telescope?',
    },
    {
      mode: 'maps' as BuddyMode,
      title: 'Maps Grounding',
      description: 'Explore places, businesses, restaurants and real locations grounded with Google Maps.',
      icon: MapPin,
      color: 'from-teal-500 to-emerald-500',
      badge: 'Google Maps',
      prompt: 'What are the best cozy cafes for remote work with outdoor seating in Kyoto, Japan?',
    },
    {
      mode: 'image' as BuddyMode,
      title: 'Image Studio',
      description: 'Create new artwork or edit existing images with text prompts using gemini-3.1-flash-image-preview.',
      icon: ImageIcon,
      color: 'from-fuchsia-500 to-pink-500',
      badge: 'Gemini Image',
      prompt: 'A futuristic floating greenhouse city covered in bioluminescent flora at sunset, digital concept art',
    },
    {
      mode: 'video' as BuddyMode,
      title: 'Veo Video Studio',
      description: 'Generate video from text or animate photos into video using Veo (veo-3.1-fast-generate-preview) in 16:9 or 9:16.',
      icon: Film,
      color: 'from-purple-500 via-fuchsia-500 to-indigo-500',
      badge: 'Veo 3.1 Fast',
      prompt: 'Upload a photo to create a cinematic video animation in 16:9 landscape or 9:16 portrait',
    },
    {
      mode: 'music' as BuddyMode,
      title: 'Music Studio',
      description: 'Generate custom audio tracks and loops using Lyria models (lyria-3-clip-preview & lyria-3-pro-preview).',
      icon: Music,
      color: 'from-violet-500 to-purple-600',
      badge: 'Lyria Music',
      prompt: 'Create an uplifting cinematic synthwave track with warm analog synthesizers',
    },
    {
      mode: 'voice' as BuddyMode,
      title: 'Voice Studio',
      description: 'Live two-way real-time audio conversation (gemini-3.8-live) and verbatim audio transcription (gemini-3.5-transcribe).',
      icon: Mic,
      color: 'from-rose-500 to-red-500',
      badge: 'gemini-3.8-live',
      prompt: 'Start hands-free voice mode and practice conversational speaking.',
    },
  ];

  const suggestedPrompts = [
    {
      text: 'Explain quantum computing to a 10-year-old',
      mode: 'chat' as BuddyMode,
      icon: Sparkles,
    },
    {
      text: 'Build a responsive React navigation bar with Tailwind CSS',
      mode: 'code' as BuddyMode,
      icon: Terminal,
    },
    {
      text: 'Generate a 4-question quiz on World War II with answers',
      mode: 'study' as BuddyMode,
      icon: BookOpen,
    },
    {
      text: 'What are the top space exploration milestones planned for this year?',
      mode: 'search' as BuddyMode,
      icon: Compass,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-8">
      {/* Hero Mascot Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-700/40">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-48 h-48 bg-sky-500/20 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Welcome to AI Buddy • Powered by Google Gemini</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            How can <span className="bg-gradient-to-r from-sky-400 via-indigo-300 to-amber-300 bg-clip-text text-transparent">AI Buddy</span> help you today?
          </h1>

          <p className="text-sm sm:text-base text-indigo-100/90 leading-relaxed max-w-xl">
            Your friendly companion for intelligent conversations, coding support, homework tutoring, real-time web search, visual artwork, and voice interactions.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNewChat('chat')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-indigo-900 font-semibold text-xs sm:text-sm shadow-md hover:bg-indigo-50 transition active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-600" />
              <span>Start New Chat</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('video')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600/80 hover:bg-purple-600 border border-purple-400/40 text-white font-medium text-xs sm:text-sm backdrop-blur-xs transition active:scale-95 cursor-pointer shadow-sm"
            >
              <Film className="w-4 h-4 text-purple-200" />
              <span>Animate into Video</span>
              <span className="text-[10px] bg-purple-900/80 px-1.5 py-0.5 rounded font-mono">Veo</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectMode('voice')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700/80 border border-indigo-400/30 text-white font-medium text-xs sm:text-sm backdrop-blur-xs transition active:scale-95 cursor-pointer"
            >
              <Mic className="w-4 h-4 text-rose-300" />
              <span>Voice Buddy</span>
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-indigo-200 hover:text-white hover:bg-indigo-800/40 text-xs sm:text-sm transition cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span>Buddy Modes & Quick Actions</span>
          </h2>
          <span className="text-xs text-gray-500 dark:text-gray-400">Click any card to start</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <div
                key={action.mode}
                onClick={() => onNewChat(action.mode, action.prompt)}
                className="group relative p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${action.color} flex items-center justify-center text-white shadow-sm`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                      {action.badge}
                    </span>
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition flex items-center justify-between">
                    <span>{action.title}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition" />
                  </h3>

                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {action.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-[11px] text-gray-400 dark:text-gray-500">
                  <span className="truncate max-w-[200px] italic">"{action.prompt}"</span>
                  <span className="text-indigo-600 dark:text-indigo-400 font-semibold shrink-0 ml-2">Try →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Suggested Starter Prompts */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Popular Ideas to Explore</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {suggestedPrompts.map((p, i) => {
            const Icon = p.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onNewChat(p.mode, p.text)}
                className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 text-left transition cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 truncate">
                  <p className="text-xs font-medium text-gray-800 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                    {p.text}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize">{p.mode} mode</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:translate-x-0.5 transition shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Chats Card */}
      {sessions.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Conversations</span>
            </h2>
            <button
              type="button"
              onClick={() => onSelectMode('history')}
              className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline cursor-pointer"
            >
              View Full History ({sessions.length})
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {sessions.slice(0, 6).map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className="p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-gray-50/50 dark:bg-gray-800/40 hover:bg-white dark:hover:bg-gray-800 transition cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] text-gray-400 mb-1">
                  <span className="capitalize font-medium text-indigo-600 dark:text-indigo-400">
                    {session.mode}
                  </span>
                  <span>{new Date(session.updatedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">
                  {session.title || 'Untitled conversation'}
                </p>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                  {session.messages[session.messages.length - 1]?.content || 'Empty conversation'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Hint Bar */}
      <div className="p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200 flex-wrap">
          <Keyboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <span className="font-semibold">Quick Shortcuts:</span>
          <span className="text-gray-600 dark:text-gray-400 hidden sm:inline">Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 shadow-2xs">Ctrl+N</kbd>
          <span className="text-gray-600 dark:text-gray-300">New Chat</span>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 shadow-2xs">Ctrl+K</kbd>
          <span className="text-gray-600 dark:text-gray-300">Code Mode</span>
          <span className="text-gray-300 dark:text-gray-700">•</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 font-mono text-[11px] font-semibold text-gray-800 dark:text-gray-200 shadow-2xs">Ctrl+/</kbd>
          <span className="text-gray-600 dark:text-gray-300">Settings</span>
        </div>
        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 font-medium">
          <span>Press</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-gray-800 border border-indigo-200 dark:border-indigo-800 font-mono text-[10px] font-semibold">?</kbd>
          <span>for all shortcuts</span>
        </div>
      </div>

      {/* Safety & Trust Footer Callout */}
      <div className="p-4 rounded-xl bg-gray-100/70 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900 dark:text-white">Privacy & Safety Protection</h4>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              AI Buddy automatically screens for sensitive information like credit cards and passwords to keep your data private.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
        >
          Manage Settings
        </button>
      </div>
    </div>
  );
};
