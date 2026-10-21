import React, { useState } from 'react';
import { Check, Copy, Terminal } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Helper to parse code blocks and text segments
  const parseBlocks = (text: string) => {
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    const parts: Array<{ type: 'code' | 'text'; language?: string; code?: string; text?: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          text: text.substring(lastIndex, match.index),
        });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'plaintext',
        code: match[2],
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({
        type: 'text',
        text: text.substring(lastIndex),
      });
    }

    return parts;
  };

  // Render text with inline formatting (bold, italic, inline code, headings, lists, links)
  const renderFormattedText = (rawText: string) => {
    const lines = rawText.split('\n');

    return lines.map((line, idx) => {
      // Headings
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base font-bold text-gray-900 dark:text-gray-100 mt-4 mb-1">
            {formatInline(line.replace('### ', ''))}
          </h3>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2 pb-1 border-b border-gray-200 dark:border-gray-800">
            {formatInline(line.replace('## ', ''))}
          </h2>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl font-extrabold text-gray-900 dark:text-white mt-5 mb-2 pb-1.5 border-b border-gray-200 dark:border-gray-800">
            {formatInline(line.replace('# ', ''))}
          </h1>
        );
      }

      // Blockquotes
      if (line.startsWith('> ')) {
        return (
          <blockquote
            key={idx}
            className="border-l-4 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/20 px-3 py-1.5 rounded-r my-2 text-gray-700 dark:text-gray-300 italic text-sm"
          >
            {formatInline(line.replace('> ', ''))}
          </blockquote>
        );
      }

      // Unordered lists
      if (/^\s*[-*]\s+/.test(line)) {
        const itemContent = line.replace(/^\s*[-*]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-gray-800 dark:text-gray-200 my-0.5 leading-relaxed">
            {formatInline(itemContent)}
          </li>
        );
      }

      // Ordered lists
      if (/^\s*\d+\.\s+/.test(line)) {
        const itemContent = line.replace(/^\s*\d+\.\s+/, '');
        return (
          <li key={idx} className="ml-4 list-decimal text-sm text-gray-800 dark:text-gray-200 my-0.5 leading-relaxed">
            {formatInline(itemContent)}
          </li>
        );
      }

      // Empty line / paragraph break
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }

      // Standard paragraph
      return (
        <p key={idx} className="text-sm text-gray-800 dark:text-gray-200 my-1 leading-relaxed">
          {formatInline(line)}
        </p>
      );
    });
  };

  // Helper for inline markup: bold, italic, code, links
  const formatInline = (text: string): React.ReactNode => {
    // Regex matches inline code `code`, bold **text**, italic *text*, links [text](url)
    const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
    const parts = text.split(tokenRegex);

    return parts.map((part, i) => {
      if (!part) return null;

      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 mx-0.5 bg-gray-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 font-mono text-xs rounded border border-gray-200 dark:border-gray-700"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-gray-900 dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-gray-800 dark:text-gray-200">
            {part.slice(1, -1)}
          </em>
        );
      }
      if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
        const linkMatch = /\[([^\]]+)\]\(([^)]+)\)/.exec(part);
        if (linkMatch) {
          return (
            <a
              key={i}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium inline-flex items-center gap-0.5"
            >
              {linkMatch[1]}
            </a>
          );
        }
      }
      return part;
    });
  };

  const blocks = parseBlocks(content);

  return (
    <div className="space-y-2 max-w-full overflow-hidden leading-relaxed">
      {blocks.map((block, index) => {
        if (block.type === 'code' && block.code) {
          const isCopied = copiedIndex === index;
          return (
            <div
              key={index}
              className="my-3 rounded-xl overflow-hidden border border-gray-700/80 bg-gray-950 text-gray-100 shadow-md font-mono text-xs"
            >
              <div className="flex items-center justify-between px-3.5 py-1.5 bg-gray-900/90 border-b border-gray-800 text-gray-400">
                <span className="flex items-center gap-1.5 text-xs font-medium text-gray-300">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  {block.language || 'code'}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(block.code || '', index)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded text-xs text-gray-300 hover:text-white hover:bg-gray-800 transition cursor-pointer"
                  title="Copy code"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto text-xs leading-relaxed text-gray-200">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        return <div key={index}>{renderFormattedText(block.text || '')}</div>;
      })}
    </div>
  );
};
