import React, { useState } from 'react';
import {
  Code,
  Terminal,
  Play,
  Copy,
  Check,
  RotateCcw,
  Bug,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileCode,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { sendChatMessage } from '../services/api';

const PROGRAMMING_LANGUAGES = [
  'TypeScript',
  'JavaScript',
  'Python',
  'HTML/CSS',
  'SQL',
  'Java',
  'C++',
  'Rust',
  'Go',
  'PHP',
  'Bash',
  'JSON',
];

export const CodeBuddyView: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState('TypeScript');
  const [action, setAction] = useState<'write' | 'explain' | 'fix' | 'refactor'>('write');
  const [promptInput, setPromptInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [generatedOutput, setGeneratedOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const samplePrompts = {
    write: [
      'Write a debounce hook in TypeScript with generic type support and cancelation',
      'Create an SQL schema and indexing strategy for an e-commerce order management system',
      'Write a Python script that parses CSV files, calculates statistical metrics, and generates a summary',
    ],
    explain: [
      'Explain the difference between Promise.all, Promise.allSettled, and Promise.race with examples',
      'Explain how binary search trees operate and analyze best/worst time and space complexities',
      'Explain how React 19 server components and use hook work under the hood',
    ],
    fix: [
      'Fix TypeError: Cannot read properties of undefined (reading "map") in React state update',
      'Fix Python recursion depth exceeded error when computing Fibonacci numbers',
      'Fix SQL query syntax error with GROUP BY and HAVING clauses',
    ],
    refactor: [
      'Refactor nested callback hell into clean async/await with error boundaries',
      'Refactor repetitive conditional switch statements into a strategy design pattern',
      'Optimize database query to eliminate N+1 query problem using eager loading',
    ],
  };

  const handleGenerate = async (customPrompt?: string) => {
    const activePrompt = customPrompt || promptInput;
    if (!activePrompt.trim() && !codeInput.trim()) return;

    setIsLoading(true);
    setErrorMsg('');
    try {
      let combinedContent = activePrompt;
      if (codeInput.trim()) {
        combinedContent += `\n\n\`\`\`${selectedLanguage.toLowerCase()}\n${codeInput.trim()}\n\`\`\``;
      }

      const res = await sendChatMessage({
        messages: [{ role: 'user', content: combinedContent }],
        mode: 'code',
        codeLanguage: selectedLanguage,
        codeAction: action,
      });

      setGeneratedOutput(res.text || 'No response returned.');
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to process request.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedOutput);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-gray-900 to-slate-900 border border-emerald-500/20 text-white">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Code className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>Code Buddy</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">
                Developer Studio
              </span>
            </h1>
            <p className="text-xs text-gray-300 mt-0.5">
              Write, explain, fix, and optimize code in any language with expert precision.
            </p>
          </div>
        </div>

        {/* Language Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Language:</span>
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-medium focus:ring-1 focus:ring-emerald-500 outline-hidden cursor-pointer"
          >
            {PROGRAMMING_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Selector Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-3">
        {[
          { key: 'write' as const, label: 'Write Code', icon: Wand2, desc: 'Generate new functions & components' },
          { key: 'explain' as const, label: 'Explain Code', icon: HelpCircle, desc: 'Understand logic & complexity' },
          { key: 'fix' as const, label: 'Fix Errors', icon: Bug, desc: 'Debug errors and resolve bugs' },
          { key: 'refactor' as const, label: 'Refactor & Optimize', icon: Sparkles, desc: 'Improve performance & style' },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = action === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setAction(item.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-gray-100 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Two-Column Editor / Output Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Input & Prompt Area (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
              {action === 'write'
                ? 'What do you want to build?'
                : action === 'explain'
                ? 'What should I explain?'
                : action === 'fix'
                ? 'What error or bug are you seeing?'
                : 'What would you like to refactor?'}
            </label>
            <textarea
              rows={3}
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder={
                action === 'write'
                  ? 'E.g., Write a function that calculates compound interest with monthly contributions...'
                  : action === 'explain'
                  ? 'E.g., Explain how async generator functions work with for-await-of...'
                  : action === 'fix'
                  ? 'E.g., I am getting "UnhandledPromiseRejection" on line 42 when fetching API...'
                  : 'E.g., Refactor this code to follow clean architecture and reduce duplicate logic...'
              }
              className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white placeholder-gray-400 resize-none outline-hidden focus:border-emerald-500 leading-relaxed"
            />

            {/* Optional Code Snippet input */}
            {(action === 'explain' || action === 'fix' || action === 'refactor') && (
              <div className="space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400">
                  Paste Code / Error Trace:
                </label>
                <textarea
                  rows={6}
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  placeholder="// Paste your code or error logs here..."
                  className="w-full p-3 rounded-xl font-mono text-xs bg-gray-950 text-gray-200 border border-gray-800 resize-none outline-hidden focus:border-emerald-500 leading-relaxed"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => handleGenerate()}
              disabled={isLoading || (!promptInput.trim() && !codeInput.trim())}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing with Code Buddy...</span>
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  <span>Execute ({action.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Preset Ideas */}
          <div className="p-4 rounded-2xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-800 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
              Quick {action} Presets
            </span>
            <div className="space-y-1.5">
              {samplePrompts[action].map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setPromptInput(sample);
                    handleGenerate(sample);
                  }}
                  className="w-full text-left p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700/60 hover:border-emerald-400 text-[11px] text-gray-700 dark:text-gray-300 hover:text-emerald-600 dark:hover:text-emerald-400 transition cursor-pointer truncate"
                  title={sample}
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Output Result View (7 cols) */}
        <div className="lg:col-span-7">
          <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 min-h-[460px] flex flex-col justify-between shadow-xs">
            <div>
              {/* Output Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                    Code Buddy Analysis & Solution
                  </span>
                </div>

                {generatedOutput && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:text-emerald-500 transition cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-500">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Output</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Error Message if any */}
              {errorMsg && (
                <div className="p-3 mb-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                  {errorMsg}
                </div>
              )}

              {/* Output Content */}
              {isLoading ? (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center animate-spin">
                    <Terminal className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    Generating optimal code solution...
                  </p>
                  <p className="text-[11px] text-gray-400">Checking syntax, edge cases, and best practices.</p>
                </div>
              ) : generatedOutput ? (
                <div className="overflow-x-auto text-sm">
                  <MarkdownRenderer content={generatedOutput} />
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center text-gray-400 space-y-2 select-none">
                  <FileCode className="w-10 h-10 text-gray-300 dark:text-gray-700" />
                  <p className="text-xs font-medium">Ready when you are!</p>
                  <p className="text-[11px] max-w-sm">
                    Enter a prompt or select a preset to generate code, explain complex syntax, or fix errors.
                  </p>
                </div>
              )}
            </div>

            {/* Footer Features */}
            {generatedOutput && (
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Production Ready Code
                </span>
                <span>Language: {selectedLanguage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
