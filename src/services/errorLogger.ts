import type { ErrorInfo } from 'react';

export interface Breadcrumb {
  timestamp: number;
  category: 'navigation' | 'action' | 'api' | 'user' | 'system';
  message: string;
  data?: Record<string, any>;
}

export interface ErrorTelemetryPayload {
  id: string;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
  context?: Record<string, any>;
  breadcrumbs: Breadcrumb[];
}

const MAX_BREADCRUMBS = 25;
const MAX_STORED_ERRORS = 50;
const DEDUPLICATION_WINDOW_MS = 1500;

// In-memory breadcrumb trail
const breadcrumbs: Breadcrumb[] = [];
// In-memory store of recent captured errors for developer debugging
const recentErrors: ErrorTelemetryPayload[] = [];
// Last logged error fingerprint for deduplication
let lastLoggedFingerprint = '';
let lastLoggedTimestamp = 0;

/**
 * Record a breadcrumb representing a user action, route change, or system event.
 */
export function addBreadcrumb(
  category: Breadcrumb['category'],
  message: string,
  data?: Record<string, any>
): void {
  breadcrumbs.push({
    timestamp: Date.now(),
    category,
    message,
    data,
  });

  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
}

/**
 * Normalizes any caught item into a standard Error object with message and stack.
 */
export function normalizeError(error: unknown): { name: string; message: string; stack: string } {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error occurred',
      stack: error.stack || '',
    };
  }

  if (typeof error === 'string') {
    return {
      name: 'Error',
      message: error,
      stack: new Error(error).stack || '',
    };
  }

  if (error && typeof error === 'object') {
    const candidateMsg = (error as any).message || (error as any).error || JSON.stringify(error);
    return {
      name: (error as any).name || 'ObjectError',
      message: String(candidateMsg),
      stack: (error as any).stack || '',
    };
  }

  return {
    name: 'UnknownError',
    message: String(error),
    stack: '',
  };
}

/**
 * Transmits the error telemetry payload to the backend telemetry endpoint.
 */
async function sendTelemetry(payload: ErrorTelemetryPayload): Promise<void> {
  const endpoint = '/api/telemetry/errors';

  try {
    const body = JSON.stringify(payload);

    // Prefer navigator.sendBeacon if available for non-blocking telemetry
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      const sent = navigator.sendBeacon(endpoint, blob);
      if (sent) return;
    }

    // Fallback to fetch with keepalive
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body,
      keepalive: true,
    }).catch((fetchErr) => {
      // Silently catch fetch errors so telemetry never crashes the app
      console.warn('[TelemetryService] Failed to send error payload to server:', fetchErr?.message || fetchErr);
    });
  } catch (err) {
    console.warn('[TelemetryService] Unexpected exception sending telemetry:', err);
  }
}

/**
 * Main error logging utility:
 * 1. Formats and prints structured stack traces and component trees to console.error
 * 2. Collects runtime breadcrumbs, environment metadata, and component stack
 * 3. Transmits telemetry payload to backend service
 * 4. Buffers recent errors in memory for dev tools inspection
 */
export function reportError(
  rawError: unknown,
  errorInfo?: ErrorInfo | null,
  context?: Record<string, any>
): ErrorTelemetryPayload {
  const { name, message, stack } = normalizeError(rawError);
  const componentStack = errorInfo?.componentStack?.trim() || undefined;
  const now = Date.now();
  const fingerprint = `${name}:${message}:${componentStack || stack?.slice(0, 100)}`;

  // Deduplicate rapid repeat errors (e.g., render loops)
  const isDuplicate = fingerprint === lastLoggedFingerprint && now - lastLoggedTimestamp < DEDUPLICATION_WINDOW_MS;
  lastLoggedFingerprint = fingerprint;
  lastLoggedTimestamp = now;

  const payload: ErrorTelemetryPayload = {
    id: `err-${now}-${Math.random().toString(36).substring(2, 9)}`,
    name,
    message,
    stack,
    componentStack,
    timestamp: new Date(now).toISOString(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    context,
    breadcrumbs: [...breadcrumbs],
  };

  // 1. Enhanced console.error logging for developers with structured grouping
  if (!isDuplicate) {
    console.group(`🚨 [AI Buddy Error Report] ${name}: ${message}`);
    console.error('Error Details:', {
      name,
      message,
      context,
      url: payload.url,
      timestamp: payload.timestamp,
    });
    if (stack) {
      console.error('Stack Trace:\n' + stack);
    }
    if (componentStack) {
      console.error('Component Hierarchy Stack:\n' + componentStack);
    }
    if (payload.breadcrumbs.length > 0) {
      console.info('Recent User/System Breadcrumbs:', payload.breadcrumbs);
    }
    console.groupEnd();
  }

  // 2. Buffer in recent errors
  recentErrors.unshift(payload);
  if (recentErrors.length > MAX_STORED_ERRORS) {
    recentErrors.pop();
  }

  // 3. Send to telemetry service
  if (!isDuplicate) {
    sendTelemetry(payload);
  }

  return payload;
}

/**
 * Retrieve recent errors collected in this session for debugging.
 */
export function getRecentErrors(): ErrorTelemetryPayload[] {
  return [...recentErrors];
}

/**
 * Clear buffered error logs.
 */
export function clearErrorLogs(): void {
  recentErrors.length = 0;
}

// Expose debugging helpers on global window in development/client environments
if (typeof window !== 'undefined') {
  (window as any).__AI_BUDDY_ERRORS__ = {
    getRecentErrors,
    clearErrorLogs,
    addBreadcrumb,
    reportError,
  };
}
