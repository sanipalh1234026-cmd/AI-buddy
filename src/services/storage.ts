import { AppSettings, ChatSession, GeneratedImage } from '../types';

const SESSIONS_KEY = 'ai_buddy_sessions_v1';
const SETTINGS_KEY = 'ai_buddy_settings_v1';
const IMAGES_KEY = 'ai_buddy_images_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  language: 'English',
  voice: 'Puck',
  speechRate: 1.0,
  autoPlaySpeech: false,
  soundEffects: true,
  contentSafetyFilter: true,
  piiWarnings: true,
};

// ==========================================
// IndexedDB Engine (Resilient, High-Capacity)
// ==========================================

const DB_NAME = 'ai_buddy_db_v1';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function getIDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.resolve(null);
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => {
          console.warn('[Storage] IndexedDB open error:', req.error);
          resolve(null);
        };
      } catch (e) {
        console.warn('[Storage] IndexedDB not available:', e);
        resolve(null);
      }
    });
  }
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

export async function idbSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(value, key);
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

export async function idbClear(): Promise<boolean> {
  try {
    const db = await getIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve(true);
        req.onerror = () => resolve(false);
      } catch {
        resolve(false);
      }
    });
  } catch {
    return false;
  }
}

// ==========================================
// Quota & LocalStorage Safety Helpers
// ==========================================

function isQuotaExceeded(err: any): boolean {
  return (
    err instanceof DOMException &&
    (err.code === 22 ||
      err.code === 1014 ||
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      (typeof err.message === 'string' && err.message.toLowerCase().includes('quota')))
  );
}

/**
 * Creates a lightweight copy of sessions for localStorage to stay well below 5MB:
 * - Large base64 image/file attachments are stripped from localStorage (preserved in IndexedDB).
 * - Only the most recent 20 sessions are kept in localStorage for fast immediate initial load.
 */
function sanitizeSessionsForLocalStorage(sessions: ChatSession[]): ChatSession[] {
  const recentSessions = sessions.slice(0, 20);

  return recentSessions.map((session) => ({
    ...session,
    messages: (session.messages || []).map((msg) => {
      if (!msg.attachedFiles || msg.attachedFiles.length === 0) return msg;
      return {
        ...msg,
        attachedFiles: msg.attachedFiles.map((file) => {
          // If attachment has a heavy base64 payload (> 500 chars), omit it from localStorage
          if (file.base64 && file.base64.length > 500) {
            return {
              ...file,
              base64: undefined,
            };
          }
          return file;
        }),
      };
    }),
  }));
}

/**
 * Creates a lightweight copy of generated images for localStorage:
 * - Large base64 data URIs are stripped from localStorage (preserved in IndexedDB).
 * - Only the 10 most recent images are kept in localStorage.
 */
function sanitizeImagesForLocalStorage(images: GeneratedImage[]): GeneratedImage[] {
  return images.slice(0, 10).map((img) => {
    if (img.imageUrl && img.imageUrl.startsWith('data:') && img.imageUrl.length > 1000) {
      return {
        ...img,
        imageUrl: '', // Preserved in IndexedDB
      };
    }
    return img;
  });
}

function safeSetLocalStorage(key: string, value: any): boolean {
  try {
    const serialized = JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    if (isQuotaExceeded(err)) {
      // Emergency quota recovery: purge heavy non-essential caches from localStorage
      try {
        if (key !== IMAGES_KEY) {
          localStorage.removeItem(IMAGES_KEY);
        }

        // Attempt saving a heavily pruned version
        if (key === SESSIONS_KEY && Array.isArray(value)) {
          const minimal = value.slice(0, 5).map((s: any) => ({
            id: s.id,
            title: s.title,
            mode: s.mode,
            createdAt: s.createdAt,
            updatedAt: s.updatedAt,
            messages: (s.messages || []).slice(-5).map((m: any) => ({
              id: m.id,
              role: m.role,
              content: typeof m.content === 'string' ? m.content.slice(0, 500) : '',
              timestamp: m.timestamp,
            })),
          }));
          localStorage.setItem(key, JSON.stringify(minimal));
          return true;
        }
      } catch {
        // IndexedDB is the source of truth; safe to skip localStorage if quota is locked
        return false;
      }
    }
    return false;
  }
}

// ==========================================
// Sessions Management
// ==========================================

export function loadStoredSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('[Storage] Failed to load chat sessions from localStorage:', err);
    return [];
  }
}

export async function loadStoredSessionsAsync(): Promise<ChatSession[] | null> {
  try {
    const fromIdb = await idbGet<ChatSession[]>(SESSIONS_KEY);
    if (fromIdb && Array.isArray(fromIdb) && fromIdb.length > 0) {
      return fromIdb;
    }

    // Migrate from localStorage if IndexedDB is currently empty
    const fromLocalStorage = loadStoredSessions();
    if (fromLocalStorage.length > 0) {
      idbSet(SESSIONS_KEY, fromLocalStorage).catch(() => {});
      return fromLocalStorage;
    }

    return [];
  } catch (err) {
    console.warn('[Storage] Failed to load sessions from IndexedDB:', err);
    return null;
  }
}

export function saveStoredSessions(sessions: ChatSession[]): void {
  // 1. Save full, uncompressed lossless data to IndexedDB
  idbSet(SESSIONS_KEY, sessions).catch((err) => {
    console.warn('[Storage] Failed to save sessions to IndexedDB:', err);
  });

  // 2. Save lightweight sanitized version to localStorage without exceeding quota
  const sanitized = sanitizeSessionsForLocalStorage(sessions);
  safeSetLocalStorage(SESSIONS_KEY, sanitized);
}

// ==========================================
// Settings Management
// ==========================================

export function loadStoredSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveStoredSettings(settings: AppSettings): void {
  safeSetLocalStorage(SETTINGS_KEY, settings);
  idbSet(SETTINGS_KEY, settings).catch(() => {});
}

// ==========================================
// Generated Images Management
// ==========================================

export function loadStoredImages(): GeneratedImage[] {
  try {
    const raw = localStorage.getItem(IMAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function loadStoredImagesAsync(): Promise<GeneratedImage[] | null> {
  try {
    const fromIdb = await idbGet<GeneratedImage[]>(IMAGES_KEY);
    if (fromIdb && Array.isArray(fromIdb) && fromIdb.length > 0) {
      return fromIdb;
    }

    const fromLocalStorage = loadStoredImages();
    if (fromLocalStorage.length > 0) {
      idbSet(IMAGES_KEY, fromLocalStorage).catch(() => {});
      return fromLocalStorage;
    }

    return [];
  } catch {
    return null;
  }
}

export function saveStoredImages(images: GeneratedImage[]): void {
  // 1. Save full image list with full base64 data URIs to IndexedDB
  idbSet(IMAGES_KEY, images).catch(() => {});

  // 2. Save lightweight version to localStorage
  const sanitized = sanitizeImagesForLocalStorage(images);
  safeSetLocalStorage(IMAGES_KEY, sanitized);
}

// ==========================================
// Full Purge
// ==========================================

export function clearAllStoredData(): void {
  try {
    localStorage.removeItem(SESSIONS_KEY);
    localStorage.removeItem(IMAGES_KEY);
  } catch {
    // ignore
  }
  idbClear().catch(() => {});
}
