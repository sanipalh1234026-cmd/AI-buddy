import React, { useState, useEffect, useRef } from 'react';
import { BuddyMode, ChatMessage, ChatSession, GeneratedImage, AttachedFile, AppSettings } from './types';
import {
  loadStoredSessions,
  loadStoredSessionsAsync,
  saveStoredSessions,
  loadStoredSettings,
  saveStoredSettings,
  loadStoredImages,
  loadStoredImagesAsync,
  saveStoredImages,
  clearAllStoredData,
  DEFAULT_SETTINGS,
} from './services/storage';
import { sendChatMessage } from './services/api';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { HomeView } from './components/HomeView';
import { ChatView } from './components/ChatView';
import { CodeBuddyView } from './components/CodeBuddyView';
import { StudyBuddyView } from './components/StudyBuddyView';
import { SearchBuddyView } from './components/SearchBuddyView';
import { ImageBuddyView } from './components/ImageBuddyView';
import { MusicBuddyView } from './components/MusicBuddyView';
import { VoiceBuddyView } from './components/VoiceBuddyView';
import { HistoryView } from './components/HistoryView';
import { SettingsModal } from './components/SettingsModal';
import { SafetyModal } from './components/SafetyModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { addBreadcrumb } from './services/errorLogger';

export default function App() {
  const [currentMode, setCurrentMode] = useState<BuddyMode>('home');
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [isGenerating, setIsGenerating] = useState(false);
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  const isHydratedRef = useRef(false);

  // Initialize from Storage (fast synchronous load + high-capacity IndexedDB hydration)
  useEffect(() => {
    // 1. Instant sync first-paint from localStorage
    const syncSessions = loadStoredSessions();
    const syncSettings = loadStoredSettings();
    const syncImages = loadStoredImages();

    if (syncSessions.length > 0) setSessions(syncSessions);
    setSettings(syncSettings);
    if (syncImages.length > 0) setImages(syncImages);
    applyTheme(syncSettings.theme);

    // 2. High-capacity IndexedDB hydration (preserves full base64 images and large attachments)
    Promise.all([loadStoredSessionsAsync(), loadStoredImagesAsync()])
      .then(([idbSessions, idbImages]) => {
        if (idbSessions && idbSessions.length > 0) {
          setSessions(idbSessions);
        }
        if (idbImages && idbImages.length > 0) {
          setImages(idbImages);
        }
      })
      .catch((err) => {
        console.warn('[App] Error during IndexedDB hydration:', err);
      })
      .finally(() => {
        isHydratedRef.current = true;
      });
  }, []);

  // Save changes to storage (only after initial hydration completes)
  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveStoredSessions(sessions);
  }, [sessions]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveStoredSettings(settings);
    applyTheme(settings.theme);
  }, [settings]);

  useEffect(() => {
    if (!isHydratedRef.current) return;
    saveStoredImages(images);
  }, [images]);

  // Track breadcrumbs for mode & session switching for debugging
  useEffect(() => {
    addBreadcrumb('navigation', `Switched mode to '${currentMode}'`, {
      mode: currentMode,
      activeSessionId,
    });
  }, [currentMode, activeSessionId]);

  const applyTheme = (theme: 'dark' | 'light' | 'system') => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    setSettings((prev) => ({ ...prev, theme: nextTheme }));
  };

  // Active Chat Session
  const activeSession = sessions.find((s) => s.id === activeSessionId) || null;

  // Create a new chat session
  const handleNewChat = (mode: BuddyMode = 'chat', initialPrompt?: string) => {
    const newSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newSession: ChatSession = {
      id: newSessionId,
      title: initialPrompt ? initialPrompt.slice(0, 30) : 'New Conversation',
      mode,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSessionId);
    setCurrentMode(mode);

    if (initialPrompt) {
      handleSendMessage(initialPrompt, [], newSessionId);
    }
  };

  // Select an existing chat session
  const handleSelectSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (target) {
      setActiveSessionId(id);
      setCurrentMode(target.mode || 'chat');
    }
  };

  // Delete chat session
  const handleDeleteSession = (id: string) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setCurrentMode('home');
    }
  };

  // Rename chat session
  const handleRenameSession = (id: string, newTitle: string) => {
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  // Clear current active conversation messages
  const handleResetActiveChat = () => {
    if (!activeSessionId) return;
    setSessions((prev) =>
      prev.map((s) => (s.id === activeSessionId ? { ...s, messages: [], updatedAt: Date.now() } : s))
    );
  };

  // Clear all data
  const handleClearAllData = () => {
    clearAllStoredData();
    setSessions([]);
    setActiveSessionId(null);
    setImages([]);
    setCurrentMode('home');
  };

  // Keyboard Shortcut Listener for Quick Actions: Ctrl+N, Ctrl+K, Ctrl+/, etc.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input, textarea, or contentEditable element
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      // Escape: Close any open modal or drawer
      if (e.key === 'Escape') {
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false);
          return;
        }
        if (settingsModalOpen) {
          setSettingsModalOpen(false);
          return;
        }
        if (safetyModalOpen) {
          setSafetyModalOpen(false);
          return;
        }
        if (sidebarOpenMobile) {
          setSidebarOpenMobile(false);
          return;
        }
      }

      // '?' key: Show keyboard shortcuts modal (only when not typing in text field)
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // Control or Meta (Command on Mac) modifier shortcuts
      const isMod = e.ctrlKey || e.metaKey;

      if (isMod) {
        const key = e.key.toLowerCase();

        // 1. 'Ctrl+N': New chat
        if (key === 'n' && !e.shiftKey) {
          e.preventDefault();
          handleNewChat('chat');
          return;
        }

        // 2. 'Ctrl+K': Code mode
        if (key === 'k' && !e.shiftKey) {
          e.preventDefault();
          handleNewChat('code');
          return;
        }

        // 3. 'Ctrl+/': Open settings
        if (e.key === '/' || e.code === 'Slash') {
          e.preventDefault();
          setSettingsModalOpen((prev) => !prev);
          return;
        }

        // 4. 'Ctrl+H': Home view
        if (key === 'h' && !e.shiftKey) {
          e.preventDefault();
          setCurrentMode('home');
          return;
        }

        // 5. 'Ctrl+Shift+H': History view
        if (key === 'h' && e.shiftKey) {
          e.preventDefault();
          setCurrentMode('history');
          return;
        }

        // 6. 'Ctrl+I': Image & Video generative studio
        if (key === 'i' && !e.shiftKey) {
          e.preventDefault();
          setCurrentMode('image');
          return;
        }

        // 7. 'Ctrl+Shift+S': Content safety shield
        if (key === 's' && e.shiftKey) {
          e.preventDefault();
          setSafetyModalOpen((prev) => !prev);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    shortcutsModalOpen,
    settingsModalOpen,
    safetyModalOpen,
    sidebarOpenMobile,
    handleNewChat,
  ]);

  // Send message in Chat mode
  const handleSendMessage = async (
    content: string,
    files: AttachedFile[] = [],
    targetSessionId?: string,
    preferredModel?: string
  ) => {
    let sId = targetSessionId || activeSessionId;

    // Create session on the fly if none active
    if (!sId) {
      const newSessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newSession: ChatSession = {
        id: newSessionId,
        title: content.slice(0, 32) || (files[0]?.name ?? 'Chat with File'),
        mode: currentMode === 'home' ? 'chat' : currentMode,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions((prev) => [newSession, ...prev]);
      setActiveSessionId(newSessionId);
      sId = newSessionId;
    }

    const userMsg: ChatMessage = {
      id: `${Date.now()}-user`,
      role: 'user',
      content,
      timestamp: Date.now(),
      attachedFiles: files,
    };

    // Update conversation with user message
    setSessions((prev) =>
      prev.map((s) => {
        if (s.id === sId) {
          const isFirst = s.messages.length === 0;
          return {
            ...s,
            title: isFirst ? content.slice(0, 32) || 'Conversation' : s.title,
            messages: [...s.messages, userMsg],
            updatedAt: Date.now(),
          };
        }
        return s;
      })
    );

    setIsGenerating(true);

    try {
      const currentSessionData = sessions.find((s) => s.id === sId);
      const historyToSend = currentSessionData
        ? [...currentSessionData.messages, userMsg]
        : [userMsg];

      const res = await sendChatMessage({
        messages: historyToSend.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
        mode: currentMode,
        language: settings.language,
        attachedFiles: files,
        useSearchGrounding: currentMode === 'search',
        useMapsGrounding: currentMode === 'maps',
        modelPreference: (preferredModel as any) || (settings.preferredModel as any) || 'auto',
      });

      const assistantMsg: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: res.text,
        timestamp: Date.now(),
        sources: res.sources,
        mapPlaces: res.mapPlaces,
        modelUsed: res.model,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sId
            ? { ...s, messages: [...s.messages, assistantMsg], updatedAt: Date.now() }
            : s
        )
      );
    } catch (err: any) {
      const errorAssistantMsg: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ Error: ${err?.message || 'Failed to generate response. Please try again.'}`,
        timestamp: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sId ? { ...s, messages: [...s.messages, errorAssistantMsg] } : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Regenerate last assistant response
  const handleRegenerate = async () => {
    if (!activeSession || isGenerating || activeSession.messages.length === 0) return;

    const messagesWithoutLast = [...activeSession.messages];
    if (messagesWithoutLast[messagesWithoutLast.length - 1].role === 'assistant') {
      messagesWithoutLast.pop();
    }

    if (messagesWithoutLast.length === 0) return;

    setSessions((prev) =>
      prev.map((s) =>
        s.id === activeSession.id ? { ...s, messages: messagesWithoutLast } : s
      )
    );

    setIsGenerating(true);
    try {
      const res = await sendChatMessage({
        messages: messagesWithoutLast.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        mode: activeSession.mode,
        language: settings.language,
      });

      const newAssistantMsg: ChatMessage = {
        id: `${Date.now()}-assistant`,
        role: 'assistant',
        content: res.text,
        timestamp: Date.now(),
        sources: res.sources,
        mapPlaces: res.mapPlaces,
        modelUsed: res.model,
      };

      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, messages: [...s.messages, newAssistantMsg], updatedAt: Date.now() }
            : s
        )
      );
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: `${Date.now()}-error`,
        role: 'assistant',
        content: `⚠️ Error: ${err?.message || 'Failed to regenerate response. Please try again.'}`,
        timestamp: Date.now(),
      };
      setSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...s, messages: [...s.messages, errorMsg], updatedAt: Date.now() }
            : s
        )
      );
    } finally {
      setIsGenerating(false);
    }
  };

  // Render view by mode
  const renderMainContent = () => {
    switch (currentMode) {
      case 'home':
        return (
          <HomeView
            onSelectMode={(m) => {
              setCurrentMode(m);
              if (m === 'chat' && !activeSessionId) {
                handleNewChat('chat');
              }
            }}
            onNewChat={handleNewChat}
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        );

      case 'chat':
        return (
          <ChatView
            mode="chat"
            messages={activeSession ? activeSession.messages : []}
            sessionTitle={activeSession?.title}
            sessionCreatedAt={activeSession?.createdAt}
            onSendMessage={handleSendMessage}
            onRegenerate={handleRegenerate}
            isGenerating={isGenerating}
            voiceName={settings.voice}
            speechRate={settings.speechRate}
            autoPlaySpeech={settings.autoPlaySpeech}
            language={settings.language}
          />
        );

      case 'code':
        return <CodeBuddyView />;

      case 'study':
        return <StudyBuddyView />;

      case 'search':
        return <SearchBuddyView initialTab="search" />;

      case 'maps':
        return <SearchBuddyView initialTab="maps" />;

      case 'image':
        return (
          <ImageBuddyView
            initialTab="image"
            images={images}
            onSaveImage={(img) => setImages((prev) => [img, ...prev])}
            onDeleteImage={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
          />
        );

      case 'video':
        return (
          <ImageBuddyView
            initialTab="video"
            images={images}
            onSaveImage={(img) => setImages((prev) => [img, ...prev])}
            onDeleteImage={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
          />
        );

      case 'music':
        return <MusicBuddyView />;

      case 'voice':
        return <VoiceBuddyView />;

      case 'history':
        return (
          <HistoryView
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            onRenameSession={handleRenameSession}
            onClearAllHistory={handleClearAllData}
            onNewChat={() => handleNewChat('chat')}
          />
        );

      case 'settings':
        return (
          <HomeView
            onSelectMode={(m) => setCurrentMode(m)}
            onNewChat={handleNewChat}
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        );

      default:
        return (
          <HomeView
            onSelectMode={(m) => setCurrentMode(m)}
            onNewChat={handleNewChat}
            sessions={sessions}
            onSelectSession={handleSelectSession}
            onOpenSettings={() => setSettingsModalOpen(true)}
          />
        );
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans antialiased">
      {/* Sidebar Navigation */}
      <Sidebar
        currentMode={currentMode}
        onSelectMode={(mode) => {
          setCurrentMode(mode);
          if (mode === 'chat' && !activeSessionId) {
            handleNewChat('chat');
          }
        }}
        isOpenMobile={sidebarOpenMobile}
        onCloseMobile={() => setSidebarOpenMobile(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onNewChat={() => handleNewChat('chat')}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenShortcuts={() => setShortcutsModalOpen(true)}
      />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-white dark:bg-gray-950">
        <Header
          currentMode={currentMode}
          onSelectMode={(mode) => setCurrentMode(mode)}
          onNewChat={() => handleNewChat(currentMode === 'home' ? 'chat' : currentMode)}
          onResetChat={activeSession && activeSession.messages.length > 0 ? handleResetActiveChat : undefined}
          theme={settings.theme}
          onToggleTheme={handleToggleTheme}
          onToggleSidebar={() => setSidebarOpenMobile(true)}
          onOpenSafetyModal={() => setSafetyModalOpen(true)}
          onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
          hasActiveMessages={Boolean(activeSession && activeSession.messages.length > 0)}
        />

        {/* Dynamic View Workspace */}
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <ErrorBoundary
            resetKeys={[currentMode, activeSessionId]}
            context={{
              currentMode,
              activeSessionId,
              theme: settings.theme,
              sessionCount: sessions.length,
            }}
            onGoHome={() => setCurrentMode('home')}
            onNewChat={() => handleNewChat(currentMode === 'home' ? 'chat' : currentMode)}
          >
            {renderMainContent()}
          </ErrorBoundary>
        </main>
      </div>

      {/* Modals */}
      <SettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings((prev) => ({ ...prev, ...newSettings }))}
        onClearAllData={handleClearAllData}
      />

      <SafetyModal
        isOpen={safetyModalOpen}
        onClose={() => setSafetyModalOpen(false)}
      />

      <ShortcutsModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />
    </div>
  );
}
