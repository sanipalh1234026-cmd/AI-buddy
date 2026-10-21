import { ChatMessage, ChatSession } from '../types';

/**
 * Cleanly format markdown text for export
 */
export function generateChatMarkdown(
  title: string,
  messages: ChatMessage[],
  metadata?: { mode?: string; createdAt?: number }
): string {
  const dateStr = metadata?.createdAt
    ? new Date(metadata.createdAt).toLocaleString()
    : new Date().toLocaleString();
  const modeStr = metadata?.mode ? metadata.mode.toUpperCase() : 'AI BUDDY';

  let md = `# ${title || 'AI Buddy Conversation'}\n\n`;
  md += `> **Export Date:** ${dateStr}  \n`;
  md += `> **Mode:** ${modeStr}  \n`;
  md += `> **Total Messages:** ${messages.length}\n\n`;
  md += `---\n\n`;

  messages.forEach((msg, index) => {
    const isUser = msg.role === 'user';
    const roleName = isUser ? '👤 User' : '🤖 AI Buddy';
    const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';

    md += `### ${roleName} ${timeStr ? `_(${timeStr})_` : ''}\n\n`;

    // Attached files mention
    if (msg.attachedFiles && msg.attachedFiles.length > 0) {
      md += `*Attached Files:* ` + msg.attachedFiles.map((f) => `\`${f.name}\``).join(', ') + `\n\n`;
    }

    // Message body
    md += `${msg.content}\n\n`;

    // Sources if any
    if (msg.sources && msg.sources.length > 0) {
      md += `**Sources & References:**\n`;
      msg.sources.forEach((src) => {
        const link = src.uri || (src as any).url || '';
        md += `- [${src.title || link}](${link})\n`;
      });
      md += `\n`;
    }

    if (index < messages.length - 1) {
      md += `---\n\n`;
    }
  });

  return md;
}

/**
 * Downloads a string as a Markdown (.md) file
 */
export function downloadMarkdown(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = (filename || 'conversation')
    .replace(/[^a-z0-9_-]/gi, '_')
    .slice(0, 50);
  a.download = `${safeFilename}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Escapes HTML characters for safe printable markup
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Formats simple markdown bold/code/newlines into clean HTML for print preview
 */
function formatSimpleMarkdownToHtml(content: string): string {
  let html = escapeHtml(content);

  // Code blocks: ```lang ... ```
  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre style="background: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace; font-size: 12px; overflow-x: auto; border: 1px solid #e2e8f0; margin: 10px 0;"><code>${code.trim()}</code></pre>`;
  });

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, '<code style="background: #f1f5f9; padding: 2px 5px; border-radius: 4px; font-family: monospace; font-size: 12px; border: 1px solid #e2e8f0;">$1</code>');

  // Bold: **text**
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Italics: *text*
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Line breaks to paragraphs / br
  const paragraphs = html.split(/\n\n+/);
  return paragraphs
    .map((p) => `<p style="margin: 0 0 10px 0; line-height: 1.6; word-break: break-word;">${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}

/**
 * Exports conversation to a high-quality, formatted printable PDF using browser print engine.
 * Opens an isolated print iframe/window styled specifically for PDF printing.
 */
export function exportChatToPdf(
  title: string,
  messages: ChatMessage[],
  metadata?: { mode?: string; createdAt?: number }
): void {
  const dateStr = metadata?.createdAt
    ? new Date(metadata.createdAt).toLocaleString()
    : new Date().toLocaleString();
  const modeStr = metadata?.mode ? metadata.mode.toUpperCase() : 'AI BUDDY';
  const cleanTitle = title || 'AI Buddy Conversation';

  // Construct print document HTML
  let messagesHtml = '';
  messages.forEach((msg) => {
    const isUser = msg.role === 'user';
    const senderTitle = isUser ? 'User' : 'AI Buddy';
    const senderColor = isUser ? '#4f46e5' : '#0284c7';
    const bgBubble = isUser ? '#f8fafc' : '#ffffff';
    const borderColor = isUser ? '#cbd5e1' : '#e2e8f0';
    const timeFormatted = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : '';

    let attachedHtml = '';
    if (msg.attachedFiles && msg.attachedFiles.length > 0) {
      attachedHtml = `
        <div style="font-size: 11px; color: #64748b; margin-bottom: 8px;">
          <strong>Attachments:</strong> ${msg.attachedFiles.map((f) => escapeHtml(f.name)).join(', ')}
        </div>
      `;
    }

    let sourcesHtml = '';
    if (msg.sources && msg.sources.length > 0) {
      sourcesHtml = `
        <div style="margin-top: 10px; padding: 8px 12px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; font-size: 11px; color: #1e40af;">
          <div style="font-weight: bold; margin-bottom: 4px;">Sources & Citations:</div>
          <ul style="margin: 0; padding-left: 18px;">
            ${msg.sources
              .map((s) => {
                const link = s.uri || (s as any).url || '';
                return `<li><a href="${escapeHtml(link)}" style="color: #2563eb; text-decoration: none;">${escapeHtml(s.title || link)}</a></li>`;
              })
              .join('')}
          </ul>
        </div>
      `;
    }

    messagesHtml += `
      <div style="margin-bottom: 18px; page-break-inside: avoid;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 13px; color: ${senderColor};">
            ${isUser ? '👤' : '🤖'} ${senderTitle}
          </div>
          <div style="font-size: 11px; color: #94a3b8;">
            ${timeFormatted}
          </div>
        </div>
        <div style="background: ${bgBubble}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 12px 14px; font-size: 13px; color: #1e293b;">
          ${attachedHtml}
          ${formatSimpleMarkdownToHtml(msg.content)}
          ${sourcesHtml}
        </div>
      </div>
    `;
  });

  const printDocument = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(cleanTitle)}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm 15mm 20mm 15mm;
          }
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            line-height: 1.5;
            background: #fff;
            margin: 0;
            padding: 0;
          }
          .header-box {
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
          }
          .logo-badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: #4f46e5;
            color: #ffffff;
            font-weight: 700;
            font-size: 13px;
            padding: 4px 10px;
            border-radius: 6px;
          }
          .meta-info {
            font-size: 11px;
            color: #64748b;
            text-align: right;
            line-height: 1.4;
          }
          .doc-title {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin: 10px 0 4px 0;
          }
          .footer-box {
            margin-top: 30px;
            border-top: 1px solid #e2e8f0;
            padding-top: 10px;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }
        </style>
      </head>
      <body>
        <div class="header-box">
          <div>
            <div class="logo-badge">⚡ AI Buddy</div>
            <div class="doc-title">${escapeHtml(cleanTitle)}</div>
            <div style="font-size: 12px; color: #64748b;">Mode: <strong>${escapeHtml(modeStr)}</strong></div>
          </div>
          <div class="meta-info">
            <div><strong>Generated:</strong> ${dateStr}</div>
            <div><strong>Messages:</strong> ${messages.length}</div>
          </div>
        </div>

        <div class="content-box">
          ${messagesHtml || '<p style="color: #94a3b8; text-align: center;">No messages in this conversation.</p>'}
        </div>

        <div class="footer-box">
          <div>AI Buddy Export Document</div>
          <div>Page 1 • Confidential</div>
        </div>
      </body>
    </html>
  `;

  // Create invisible iframe for seamless print triggering without popups
  const printIframe = document.createElement('iframe');
  printIframe.style.position = 'fixed';
  printIframe.style.right = '0';
  printIframe.style.bottom = '0';
  printIframe.style.width = '0';
  printIframe.style.height = '0';
  printIframe.style.border = '0';
  document.body.appendChild(printIframe);

  const doc = printIframe.contentWindow?.document || printIframe.contentDocument;
  if (!doc) {
    // Fallback if iframe access fails
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printDocument);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
        win.close();
      }, 500);
    }
    return;
  }

  doc.open();
  doc.write(printDocument);
  doc.close();

  // Wait for rendering then print
  setTimeout(() => {
    try {
      printIframe.contentWindow?.focus();
      printIframe.contentWindow?.print();
    } catch (e) {
      console.error('Failed to trigger print dialog:', e);
    } finally {
      // Remove iframe after user interacts with print dialog
      setTimeout(() => {
        if (document.body.contains(printIframe)) {
          document.body.removeChild(printIframe);
        }
      }, 2000);
    }
  }, 400);
}
