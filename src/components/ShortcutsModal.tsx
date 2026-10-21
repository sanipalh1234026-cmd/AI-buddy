import React from 'react';
import {
  Keyboard,
  X,
  MessageSquare,
  Code,
  Settings,
  Home,
  Clock,
  ShieldCheck,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string) => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Navigation' | 'Quick Actions' | 'App Control';
  icon: any;
  actionId?: string;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose, onAction }) => {
  if (!isOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
  const modKey = isMac ? '⌘' : 'Ctrl';

  const shortcuts: ShortcutItem[] = [
    {
      keys: [modKey, 'N'],
      description: 'Start a fresh chat conversation',
      category: 'Quick Actions',
      icon: MessageSquare,
      actionId: 'new-chat',
    },
    {
      keys: [modKey, 'K'],
      description: 'Switch to Code Buddy development mode',
      category: 'Quick Actions',
      icon: Code,
      actionId: 'code-mode',
    },
    {
      keys: [modKey, '/'],
      description: 'Open Settings & Preferences',
      category: 'App Control',
      icon: Settings,
      actionId: 'settings',
    },
    {
      keys: [modKey, 'H'],
      description: 'Return to Home Dashboard',
      category: 'Navigation',
      icon: Home,
      actionId: 'home',
    },
    {
      keys: [modKey, 'I'],
      description: 'Open Image & Video Generative Studio',
      category: 'Navigation',
      icon: ImageIcon,
      actionId: 'image-mode',
    },
    {
      keys: [modKey, 'Shift', 'H'],
      description: 'Browse past conversations in History',
      category: 'Navigation',
      icon: Clock,
      actionId: 'history',
    },
    {
      keys: [modKey, 'Shift', 'S'],
      description: 'Open Safety, Privacy & PII Shield',
      category: 'App Control',
      icon: ShieldCheck,
      actionId: 'safety',
    },
    {
      keys: ['?'],
      description: 'Toggle this Keyboard Shortcuts guide',
      category: 'App Control',
      icon: Keyboard,
    },
    {
      keys: ['Esc'],
      description: 'Close active modal, popup, or overlay',
      category: 'App Control',
      icon: X,
    },
  ];

  const categories: Array<'Quick Actions' | 'Navigation' | 'App Control'> = [
    'Quick Actions',
    'Navigation',
    'App Control',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 via-white to-sky-50/50 dark:from-indigo-950/30 dark:via-gray-900 dark:to-sky-950/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span>Keyboard Shortcuts</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-semibold">
                  Quick Access
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Speed up your workflow and navigate AI Buddy with ease.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {categories.map((category) => {
            const items = shortcuts.filter((s) => s.category === category);
            return (
              <div key={category} className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-1">
                  {category}
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden bg-gray-50/50 dark:bg-gray-900/50">
                  {items.map((item, idx) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={idx}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-white dark:hover:bg-gray-800/70 transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                          <span className="text-xs text-gray-700 dark:text-gray-200 font-medium truncate">
                            {item.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {item.keys.map((k, kIdx) => (
                            <React.Fragment key={kIdx}>
                              <kbd className="px-2 py-1 text-[11px] font-mono font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md shadow-2xs">
                                {k}
                              </kbd>
                              {kIdx < item.keys.length - 1 && (
                                <span className="text-xs text-gray-400 font-mono">+</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Shortcuts are active across the entire application</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium transition cursor-pointer text-xs"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
