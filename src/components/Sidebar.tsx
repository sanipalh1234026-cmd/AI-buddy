import React, { useState } from 'react';
import {
  Bot,
  Home,
  MessageSquare,
  Code,
  GraduationCap,
  Search,
  Image as ImageIcon,
  Mic,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Pin,
  X,
  ChevronRight,
  Sparkles,
  Download,
  Keyboard,
  Film,
  Music,
  MapPin,
} from 'lucide-react';
import { BuddyMode, ChatSession } from '../types';
import { generateChatMarkdown, downloadMarkdown } from '../services/exportChat';

interface SidebarProps {
  currentMode: BuddyMode;
  onSelectMode: (mode: BuddyMode) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  sessions: ChatSession[];
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentMode,
  onSelectMode,
  isOpenMobile,
  onCloseMobile,
  sessions,
  activeSessionId,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onNewChat,
  onOpenSettings,
  onOpenShortcuts,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const navItems = [
    { mode: 'home' as BuddyMode, label: 'Home', icon: Home, badge: null, shortcut: 'Ctrl+H', color: 'text-indigo-500' },
    { mode: 'chat' as BuddyMode, label: 'AI Chat', icon: MessageSquare, badge: null, shortcut: null, color: 'text-sky-500' },
    { mode: 'code' as BuddyMode, label: 'Code Buddy', icon: Code, badge: 'Dev', shortcut: 'Ctrl+K', color: 'text-emerald-500' },
    { mode: 'study' as BuddyMode, label: 'Study Buddy', icon: GraduationCap, badge: 'Learn', shortcut: null, color: 'text-amber-500' },
    { mode: 'search' as BuddyMode, label: 'Search Buddy', icon: Search, badge: 'Web', shortcut: null, color: 'text-blue-500' },
    { mode: 'maps' as BuddyMode, label: 'Maps Grounding', icon: MapPin, badge: 'Places', shortcut: null, color: 'text-teal-500' },
    { mode: 'image' as BuddyMode, label: 'Image Studio', icon: ImageIcon, badge: 'Art', shortcut: 'Ctrl+I', color: 'text-fuchsia-500' },
    { mode: 'video' as BuddyMode, label: 'Veo Video', icon: Film, badge: 'Veo 3.1', shortcut: null, color: 'text-purple-500' },
    { mode: 'music' as BuddyMode, label: 'Music Studio', icon: Music, badge: 'Lyria', shortcut: null, color: 'text-violet-500' },
    { mode: 'voice' as BuddyMode, label: 'Voice Buddy', icon: Mic, badge: 'Live', shortcut: null, color: 'text-rose-500' },
    { mode: 'history' as BuddyMode, label: 'Chat History', icon: Clock, badge: sessions.length ? `${sessions.length}` : null, shortcut: null, color: 'text-slate-500' },
    { mode: 'settings' as BuddyMode, label: 'Settings', icon: Settings, badge: null, shortcut: 'Ctrl+/', color: 'text-gray-500' },
  ];

  const handleStartRename = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const handleFinishRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const recentSessions = sessions.slice(0, 10);

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-200 ease-in-out shrink-0 select-none ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-200 dark:border-gray-800">
          <div
            onClick={() => {
              onSelectMode('home');
              onCloseMobile();
            }}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-1">
                AI Buddy
                <Sparkles className="w-3 h-3 text-amber-400" />
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">All-in-One Companion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Chat Primary Button */}
        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              onNewChat();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-sm shadow-indigo-600/20 transition active:scale-[0.98] cursor-pointer"
            title="New Chat (Ctrl+N)"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </div>
            <kbd className="text-[10px] bg-indigo-700/80 px-1.5 py-0.5 rounded font-mono text-indigo-100 shadow-2xs">
              Ctrl+N
            </kbd>
          </button>
        </div>

        {/* Navigation Modes */}
        <div className="px-2 py-1 space-y-0.5">
          <div className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Buddies & Tools
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentMode === item.mode;
            return (
              <button
                key={item.mode}
                type="button"
                onClick={() => {
                  onSelectMode(item.mode);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-gray-800/90 text-indigo-600 dark:text-indigo-400 shadow-xs border border-gray-200/60 dark:border-gray-700/60'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : item.color}`} />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.shortcut && (
                    <kbd className="hidden lg:inline-block text-[9px] px-1.5 py-0.5 rounded bg-gray-200/60 dark:bg-gray-800 text-gray-400 dark:text-gray-500 font-mono">
                      {item.shortcut}
                    </kbd>
                  )}
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        isActive
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                          : 'bg-gray-200/60 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Recent Chats Section */}
        <div className="mt-4 flex-1 flex flex-col min-h-0 px-2">
          <div className="px-2 pb-1.5 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            <span>Recent Chats</span>
            {sessions.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectMode('history')}
                className="text-[10px] lowercase text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                view all
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {recentSessions.length === 0 ? (
              <div className="text-center py-6 px-3">
                <p className="text-xs text-gray-400 dark:text-gray-500">No recent conversations.</p>
                <button
                  type="button"
                  onClick={onNewChat}
                  className="mt-2 text-xs text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Start one now
                </button>
              </div>
            ) : (
              recentSessions.map((session) => {
                const isSelected = activeSessionId === session.id;
                const isEditing = editingId === session.id;

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onSelectSession(session.id);
                      onCloseMobile();
                    }}
                    className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 border border-indigo-200/50 dark:border-indigo-800/40 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/60'
                    }`}
                  >
                    {isEditing ? (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => handleFinishRename(session.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(session.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="w-full bg-white dark:bg-gray-800 px-1.5 py-0.5 text-xs rounded border border-indigo-400 text-gray-900 dark:text-white outline-hidden"
                      />
                    ) : (
                      <>
                        <div className="flex items-center gap-2 truncate pr-2">
                          <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="truncate">{session.title || 'Untitled Chat'}</span>
                        </div>

                        {/* Hover actions */}
                        <div className="hidden group-hover:flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const md = generateChatMarkdown(session.title, session.messages, {
                                mode: session.mode,
                                createdAt: session.createdAt,
                              });
                              downloadMarkdown(session.title, md);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                            title="Quick Export Markdown"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(session, e)}
                            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                            }}
                            className="p-1 rounded text-gray-400 hover:text-red-500 cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer info & Settings shortcut */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-1">
          <button
            type="button"
            onClick={() => {
              onOpenSettings();
              onCloseMobile();
            }}
            className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition cursor-pointer"
            title="Settings (Ctrl+/)"
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
            <kbd className="hidden lg:inline-block text-[9px] font-mono text-gray-400">Ctrl+/</kbd>
          </button>

          {onOpenShortcuts && (
            <button
              type="button"
              onClick={() => {
                onOpenShortcuts();
                onCloseMobile();
              }}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
              title="Keyboard Shortcuts Guide (Press ?)"
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Keys</span>
              <kbd className="text-[9px] font-mono px-1 py-0.2 bg-gray-200 dark:bg-gray-800 rounded">?</kbd>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
