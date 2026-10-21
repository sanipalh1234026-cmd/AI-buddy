import React, { useState } from 'react';
import {
  X,
  Moon,
  Sun,
  Laptop,
  Globe,
  Volume2,
  VolumeX,
  Play,
  Square,
  Bell,
  Shield,
  Trash2,
  Info,
  Check,
  Bot,
} from 'lucide-react';
import { AppSettings } from '../types';
import { browserSpeechSynthesis, isSpeechSynthesisSupported } from '../services/speechSynthesis';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onClearAllData: () => void;
}

const LANGUAGES = [
  'English',
  'Spanish (Español)',
  'French (Français)',
  'German (Deutsch)',
  'Japanese (日本語)',
  'Chinese (中文)',
  'Hindi (हिन्दी)',
  'Portuguese (Português)',
  'Arabic (العربية)',
  'Korean (한국어)',
];

const VOICES: Array<{ id: 'Puck' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Charon'; label: string }> = [
  { id: 'Puck', label: 'Puck (Natural, Friendly)' },
  { id: 'Kore', label: 'Kore (Calm, Warm)' },
  { id: 'Fenrir', label: 'Fenrir (Deep, Confident)' },
  { id: 'Zephyr', label: 'Zephyr (Bright, Modern)' },
  { id: 'Charon', label: 'Charon (Smooth, Thoughtful)' },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onClearAllData,
}) => {
  const [isTestingSpeech, setIsTestingSpeech] = useState(false);

  if (!isOpen) return null;

  const handleTestSpeech = () => {
    if (isTestingSpeech) {
      browserSpeechSynthesis.stop();
      setIsTestingSpeech(false);
      return;
    }

    setIsTestingSpeech(true);
    browserSpeechSynthesis.speak(
      'settings-test',
      `Hello! This is a test of the browser text to speech synthesis in AI Buddy. You can use this to listen to assistant messages.`,
      {
        voiceName: settings.voice,
        rate: settings.speechRate || 1.0,
        lang: settings.language,
        onEnd: () => setIsTestingSpeech(false),
        onError: () => setIsTestingSpeech(false),
      }
    );
  };

  const handleClose = () => {
    if (isTestingSpeech) {
      browserSpeechSynthesis.stop();
      setIsTestingSpeech(false);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-lg w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">AI Buddy Settings</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure appearance, language, voice, and privacy</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-sm">
          {/* 1. Theme Setting */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Interface Theme
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'light' as const, label: 'Light', icon: Sun },
                { id: 'dark' as const, label: 'Dark', icon: Moon },
                { id: 'system' as const, label: 'System', icon: Laptop },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                        : 'border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Language Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>Preferred Language</span>
            </label>
            <select
              value={settings.language}
              onChange={(e) => onUpdateSettings({ language: e.target.value })}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-hidden focus:border-indigo-500 cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {/* 3. Voice Settings */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Voice & Speech Synthesis</span>
              </label>

              {/* Test speech button */}
              <button
                type="button"
                onClick={handleTestSpeech}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  isTestingSpeech
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                {isTestingSpeech ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5 animate-pulse" />
                    <span>Stop Test</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Test Voice</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-xs text-gray-600 dark:text-gray-400">Default AI Voice Persona:</span>
              <select
                value={settings.voice}
                onChange={(e) => onUpdateSettings({ voice: e.target.value as any })}
                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-2.5 text-xs text-gray-900 dark:text-white outline-hidden focus:border-indigo-500 cursor-pointer"
              >
                {VOICES.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Speech rate slider */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600 dark:text-gray-400 font-medium">Speech Rate / Speed:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                  {(settings.speechRate || 1.0).toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={settings.speechRate || 1.0}
                onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600 cursor-pointer h-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none"
              />
              <div className="flex justify-between text-[10px] text-gray-400">
                <span>0.5x (Slow)</span>
                <span>1.0x (Normal)</span>
                <span>2.0x (Fast)</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Autoplay Speech</p>
                <p className="text-[11px] text-gray-500">Automatically speak responses out loud in chat</p>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPlaySpeech}
                onChange={(e) => onUpdateSettings({ autoPlaySpeech: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* 4. Safety & PII Warnings */}
          <div className="space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>Privacy & Guardrails</span>
            </label>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">PII Detection Warning</p>
                <p className="text-[11px] text-gray-500">Alert before sending credit cards, SSN, or passwords</p>
              </div>
              <input
                type="checkbox"
                checked={settings.piiWarnings}
                onChange={(e) => onUpdateSettings({ piiWarnings: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">Content Safety Filter</p>
                <p className="text-[11px] text-gray-500">Enforce safe, ethical, and helpful AI answers</p>
              </div>
              <input
                type="checkbox"
                checked={settings.contentSafetyFilter}
                onChange={(e) => onUpdateSettings({ contentSafetyFilter: e.target.checked })}
                className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
              />
            </div>
          </div>

          {/* 5. Clear All Data */}
          <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-700 dark:text-red-400">Clear Local Storage</span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear all conversations and saved images?')) {
                    onClearAllData();
                    onClose();
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer"
              >
                Clear Data
              </button>
            </div>
            <p className="text-[11px] text-red-600 dark:text-red-300">
              Permanently clears all conversation logs, images, and preferences stored in your browser.
            </p>
          </div>

          {/* About Section */}
          <div className="pt-2 border-t border-gray-200 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              <span>About AI Buddy v1.0</span>
            </p>
            <p className="text-[11px]">
              AI Buddy is an all-in-one companion powered by Google Gemini models for conversational reasoning, code generation, tutoring, live web search grounding, image generation, and speech synthesis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
