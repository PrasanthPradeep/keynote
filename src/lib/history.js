/**
 * history.js — localStorage persistence for past analyses.
 *
 * Stores up to 20 entries. Each entry:
 *   { id, fileName, date, topics, transcript }
 */

const STORAGE_KEY = 'keynote-history';
const MAX_ENTRIES = 20;

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeStore(entries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // storage full or unavailable — fail silently
  }
}

/** Load all saved analyses, newest first. */
export function loadHistory() {
  return readStore().sort((a, b) => b.date - a.date);
}

/** Save a new analysis. Returns the saved entry with its id. */
export function saveAnalysis({ fileName, topics, transcript }) {
  const entry = {
    id: crypto.randomUUID?.() ?? Date.now().toString(36),
    fileName: fileName ?? 'recording',
    date: Date.now(),
    topics,
    transcript,
  };

  const entries = readStore();
  entries.unshift(entry);

  // Prune oldest if over limit
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  writeStore(entries);
  return entry;
}

/** Delete a single entry by id. */
export function deleteAnalysis(id) {
  const entries = readStore().filter((e) => e.id !== id);
  writeStore(entries);
}

/** Clear all saved analyses. */
export function clearHistory() {
  writeStore([]);
}
