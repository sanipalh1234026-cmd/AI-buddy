import React from 'react';
import {
  Bot,
  Menu,
  Moon,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sun,
  Sparkles,
  Code,
  GraduationCap,
  Search,
  Image as ImageIcon,
  Film,
  Mic,
  Clock,
  Settings,
  Home,
  Keyboard,
  Music,
  MapPin,
} from 'lucide-react';
import { BuddyMode } from '../types';

interface HeaderProps {
  currentMode: BuddyMode;
  onSelectMode: (mode: BuddyMode) => void;
  onNewChat: () => void;
  onResetChat?: () => void;
  theme: 'dark' | 'light' | 'system';
  onToggleTheme: () => void;
  onToggleSidebar: () => void;
  onOpenSafetyModal: () => void;
  onOpenShortcutsModal?: () => void;
  hasActiveMessages?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentMode,
  onSelectMode,
  onNewChat,
  onResetChat,
  theme,
  onToggleTheme,
  onToggleSidebar,
  onOpenSafetyModal,
  onOpenShortcutsModal,
  hasActiveMessages,
}) => {
  const getModeInfo = () => {
    switch (currentMode) {
      case 'chat':
        return { title: 'AI Chat', icon: Bot, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' };
      case 'code':
        return { title: 'Code Buddy', icon: Code, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' };
      case 'study':
        return { title: 'Study Buddy', icon: GraduationCap, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' };
      case 'search':
        return { title: 'Search Buddy', icon: Search, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' };
      case 'maps':
        return { title: 'Maps Grounding', icon: MapPin, color: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40' };
      case 'image':
        return { title: 'Image Studio', icon: ImageIcon, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/40' };
      case 'video':
        return { title: 'Veo Video Generator', icon: Film, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40' };
      case 'music':
        return { title: 'Music Studio', icon: Music, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40' };
      case 'voice':
        return { title: 'Voice Buddy', icon: Mic, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' };
      case 'history':
        return { title: 'Chat History', icon: Clock, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/50' };
      case 'settings':
        return { title: 'Settings', icon: Settings, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-800' };
      default:
        return { title: 'Home', icon: Home, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40' };
    }
  };

  const modeInfo = getModeInfo();
  const ModeIcon = modeInfo.icon;

  return (
    <header className="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 md:hidden transition cursor-pointer"
          title="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand identity */}
        <div
          onClick={() => onSelectMode('home')}
          className="flex items-center gap-2 cursor-pointer group select-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-sky-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
            <Bot className="w-5 h-5" />
          </div>
          <div className="hidden sm:block">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base bg-gradient-to-r from-indigo-600 to-sky-500 dark:from-indigo-400 dark:to-sky-300 bg-clip-text text-transparent">
                AI Buddy
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-semibold tracking-wide">
                v1.0
              </span>
            </div>
          </div>
        </div>

        {/* Current Active Mode Chip */}
        <div className="h-4 w-px bg-gray-200 dark:border-gray-800 mx-1 hidden sm:block" />
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${modeInfo.bg} ${modeInfo.color}`}
        >
          <ModeIcon className="w-3.5 h-3.5" />
          <span>{modeInfo.title}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Safety indicator */}
        <button
          type="button"
          onClick={onOpenSafetyModal}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition cursor-pointer"
          title="Content Safety & Privacy Shield Active"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span className="hidden md:inline">Safe</span>
        </button>

        {/* Clear chat / Reset if messages exist */}
        {hasActiveMessages && onResetChat && (
          <button
            type="button"
            onClick={onResetChat}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Clear current conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition active:scale-95 cursor-pointer"
          title="Start fresh conversation (Ctrl+N)"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New Chat</span>
          <kbd className="hidden lg:inline-block text-[10px] bg-indigo-800/60 px-1 py-0.2 rounded font-mono text-indigo-100">
            Ctrl+N
          </kbd>
        </button>

        {/* Keyboard Shortcuts modal toggle */}
        {onOpenShortcutsModal && (
          <button
            type="button"
            onClick={onOpenShortcutsModal}
            className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Keyboard Shortcuts (Press ?)"
          >
            <Keyboard className="w-4 h-4" />
          </button>
        )}

        {/* Dark/Light mode toggle */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
          title={`Toggle theme (Current: ${theme})`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-indigo-600" />
          )}
        </button>
      </div>
    </header>
  );
};
