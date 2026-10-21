import React, { useState, useMemo } from 'react';
import {
  Clock,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  MessageSquare,
  Bot,
  Code,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Calendar,
  FileCode,
  Printer,
  FileText,
} from 'lucide-react';
import { BuddyMode, ChatMessage, ChatSession } from '../types';
import { generateChatMarkdown, downloadMarkdown, exportChatToPdf } from '../services/exportChat';

interface HistoryViewProps {
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onRenameSession: (id: string, newTitle: string) => void;
  onClearAllHistory: () => void;
  onNewChat: () => void;
}

/**
 * Extracts a contextual snippet around the first keyword match in a session's messages
 */
function getMatchingMessageSnippet(
  messages: ChatMessage[],
  query: string
): { snippet: string; role: string; messageIndex: number } | null {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const idx = msg.content.toLowerCase().indexOf(trimmed);
    if (idx !== -1) {
      const start = Math.max(0, idx - 45);
      const end = Math.min(msg.content.length, idx + trimmed.length + 65);
      const prefix = start > 0 ? '…' : '';
      const suffix = end < msg.content.length ? '…' : '';
      return {
        snippet: prefix + msg.content.slice(start, end).replace(/\s+/g, ' ') + suffix,
        role: msg.role === 'user' ? 'User' : 'AI Buddy',
        messageIndex: i + 1,
      };
    }
  }
  return null;
}

/**
 * Highlights occurrences of a search keyword within a string
 */
function HighlightText({ text, query }: { text: string; query: string }) {
  const trimmed = query.trim();
  if (!trimmed) return <>{text}</>;

  try {
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, index) =>
          part.toLowerCase() === trimmed.toLowerCase() ? (
            <mark
              key={index}
              className="bg-amber-200 dark:bg-amber-900/70 text-amber-950 dark:text-amber-200 font-semibold px-0.5 rounded-sm"
            >
              {part}
            </mark>
          ) : (
            part
          )
        )}
      </>
    );
  } catch {
    return <>{text}</>;
  }
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  sessions,
  onSelectSession,
  onDeleteSession,
  onRenameSession,
  onClearAllHistory,
  onNewChat,
}) => {
  const [searchFilter, setSearchFilter] = useState('');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const trimmedQuery = searchFilter.trim();

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const q = trimmedQuery.toLowerCase();
      const matchesSearch =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.messages.some(
          (m) =>
            m.content.toLowerCase().includes(q) ||
            (m.attachedFiles && m.attachedFiles.some((f) => f.name.toLowerCase().includes(q)))
        );
      const matchesMode = modeFilter === 'all' || s.mode === modeFilter;
      return matchesSearch && matchesMode;
    });
  }, [sessions, trimmedQuery, modeFilter]);

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

  const handleExportMarkdown = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const md = generateChatMarkdown(session.title, session.messages, {
      mode: session.mode,
      createdAt: session.createdAt,
    });
    downloadMarkdown(session.title, md);
  };

  const handleExportPdf = (session: ChatSession, e: React.MouseEvent) => {
    e.stopPropagation();
    exportChatToPdf(session.title, session.messages, {
      mode: session.mode,
      createdAt: session.createdAt,
    });
  };

  const clearSearch = () => {
    setSearchFilter('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
      {/* Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-gray-900 to-indigo-950 border border-gray-800 text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>Chat History</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 font-medium">
                {sessions.length} Conversations
              </span>
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">
              Browse, search by title or message contents, rename, export, or resume your previous conversations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sessions.length > 0 && (
            <button
              type="button"
              onClick={onClearAllHistory}
              className="px-3 py-1.5 rounded-xl border border-red-500/40 text-red-300 hover:bg-red-500/20 text-xs font-medium transition cursor-pointer"
            >
              Clear All
            </button>
          )}
          <button
            type="button"
            onClick={onNewChat}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            Start New Chat
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-2.5">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  clearSearch();
                }
              }}
              placeholder="Search conversations by title or message contents..."
              className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-hidden focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition shadow-2xs"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-md transition cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {['all', 'chat', 'code', 'study', 'search'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setModeFilter(m)}
                className={`text-xs px-3 py-2 rounded-xl capitalize font-medium transition cursor-pointer shrink-0 ${
                  modeFilter === m
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Filter Feedback indicator */}
        {(trimmedQuery || modeFilter !== 'all') && (
          <div className="flex items-center justify-between text-xs px-1 text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span>
                Found <strong className="text-gray-900 dark:text-white">{filteredSessions.length}</strong> {filteredSessions.length === 1 ? 'match' : 'matches'}
                {trimmedQuery && (
                  <>
                    {' '}for &ldquo;<span className="text-indigo-600 dark:text-indigo-400 font-medium">{trimmedQuery}</span>&rdquo;
                  </>
                )}
                {modeFilter !== 'all' && (
                  <span className="capitalize"> in {modeFilter} mode</span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSearchFilter('');
                setModeFilter('all');
              }}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
            >
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Conversations List */}
      {filteredSessions.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-8 space-y-3 bg-gray-50/50 dark:bg-gray-900/30">
          <MessageSquare className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {trimmedQuery
                ? `No conversations match "${trimmedQuery}"`
                : modeFilter !== 'all'
                ? `No conversations found in "${modeFilter}" mode`
                : 'No chat history found'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {trimmedQuery
                ? 'Try searching with different keywords or check across all conversation modes.'
                : 'Your saved sessions and past interactions will appear here.'}
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            {(trimmedQuery || modeFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchFilter('');
                  setModeFilter('all');
                }}
                className="px-3.5 py-1.5 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
              >
                Clear Search
              </button>
            )}
            <button
              type="button"
              onClick={onNewChat}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition cursor-pointer shadow-2xs"
            >
              Start New Chat
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSessions.map((session) => {
            const isEditing = editingId === session.id;
            const lastMsg = session.messages[session.messages.length - 1];
            const titleMatches =
              trimmedQuery && session.title.toLowerCase().includes(trimmedQuery.toLowerCase());
            const matchedSnippet = trimmedQuery
              ? getMatchingMessageSnippet(session.messages, trimmedQuery)
              : null;

            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className="group p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-indigo-400 dark:hover:border-indigo-500 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex-1 min-w-0 space-y-1.5 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                      {session.mode}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(session.updatedAt).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <span className="text-xs text-gray-400">
                      • {session.messages.length} {session.messages.length === 1 ? 'message' : 'messages'}
                    </span>
                  </div>

                  {isEditing ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-2 pt-1"
                    >
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleFinishRename(session.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 border border-indigo-500 text-xs text-gray-900 dark:text-white outline-hidden"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleFinishRename(session.id)}
                        className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate">
                      {trimmedQuery && titleMatches ? (
                        <HighlightText text={session.title || 'Untitled Chat'} query={trimmedQuery} />
                      ) : (
                        session.title || 'Untitled Chat'
                      )}
                    </h3>
                  )}

                  {/* Matching Snippet in Message Content */}
                  {trimmedQuery && matchedSnippet ? (
                    <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-xs text-gray-700 dark:text-gray-300">
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                        <MessageSquare className="w-3 h-3" />
                        <span>Matched in {matchedSnippet.role} message #{matchedSnippet.messageIndex}:</span>
                      </div>
                      <p className="line-clamp-2 italic text-gray-600 dark:text-gray-300">
                        &ldquo;
                        <HighlightText text={matchedSnippet.snippet} query={trimmedQuery} />
                        &rdquo;
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                      {lastMsg ? lastMsg.content : 'No messages in this conversation'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={(e) => handleExportMarkdown(session, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                    title="Export as Markdown (.md)"
                  >
                    <FileCode className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleExportPdf(session, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                    title="Export as PDF (.pdf)"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleStartRename(session, e)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                    title="Rename"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                    title="Delete conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-700 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

