/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Severity, SeverityCounts } from '@kbn/nightshift-investigations-plugin/common';

/**
 * Unread homepage Investigate starts, persisted per space until the finished
 * investigation is opened (severity-tile `+N` and card New marks).
 */
const STORAGE_PREFIX = 'nightshift.manualInvestigationFresh:';

const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

interface FreshEntry {
  id: string;
  /** Set once the investigation is observed in a finished severity bucket. */
  severity?: Severity;
}

const listeners = new Set<() => void>();
/**
 * Session state used when localStorage cannot be read, or when a write failed while
 * reads still succeed (quota). Pending writes take precedence until a write succeeds.
 */
const memoryBySpace = new Map<string, FreshEntry[]>();
const writeFailedBySpace = new Set<string>();

const storageKey = (spaceBasePath: string): string =>
  `${STORAGE_PREFIX}${spaceBasePath || 'default'}`;

const isSeverity = (value: unknown): value is Severity =>
  typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);

const parseEntries = (raw: string): FreshEntry[] => {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  const entries: FreshEntry[] = [];
  for (const item of parsed) {
    if (typeof item === 'string') {
      // Migrate the original id-only array shape.
      entries.push({ id: item });
      continue;
    }
    if (
      item &&
      typeof item === 'object' &&
      'id' in item &&
      typeof (item as { id: unknown }).id === 'string'
    ) {
      entries.push({
        id: (item as { id: string }).id,
        severity: isSeverity((item as { severity?: unknown }).severity)
          ? (item as { severity: Severity }).severity
          : undefined,
      });
    }
  }
  return entries;
};

const copyEntries = (entries: FreshEntry[]): FreshEntry[] =>
  entries.map((entry) => ({ ...entry }));

/**
 * Prefer live localStorage for multi-tab correctness. If a write previously failed while
 * getItem still works, keep serving the pending in-memory list until a write succeeds.
 */
const readEntries = (spaceBasePath: string): FreshEntry[] => {
  const key = storageKey(spaceBasePath);
  if (writeFailedBySpace.has(key)) {
    return copyEntries(memoryBySpace.get(key) ?? []);
  }
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? parseEntries(raw) : [];
  } catch {
    return copyEntries(memoryBySpace.get(key) ?? []);
  }
};

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const writeEntries = (spaceBasePath: string, entries: FreshEntry[]): void => {
  const key = storageKey(spaceBasePath);
  const next = copyEntries(entries);
  memoryBySpace.set(key, next);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
    writeFailedBySpace.delete(key);
  } catch {
    // Keep pending memory so later reads / severity remembers do not loop on stale storage.
    writeFailedBySpace.add(key);
  }
  notify();
};

const onStorageEvent = (event: StorageEvent): void => {
  if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) {
    return;
  }
  // Another tab wrote successfully — drop this tab's pending/fallback for that space.
  memoryBySpace.delete(event.key);
  writeFailedBySpace.delete(event.key);
  notify();
};

let storageListenerAttached = false;

const ensureStorageListener = (): void => {
  if (storageListenerAttached || typeof window === 'undefined') {
    return;
  }
  window.addEventListener('storage', onStorageEvent);
  storageListenerAttached = true;
};

/** Subscribe to fresh-id changes (register / dismiss / severity) so the landing page can re-render. */
export const subscribeManualInvestigationFresh = (listener: () => void): (() => void) => {
  ensureStorageListener();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const registerManualInvestigationStart = (
  investigationId: string,
  spaceBasePath: string
): void => {
  const entries = readEntries(spaceBasePath);
  if (entries.some(({ id }) => id === investigationId)) {
    return;
  }
  entries.push({ id: investigationId });
  writeEntries(spaceBasePath, entries);
};

/**
 * Remember which severity bucket a finished unread investigation landed in, so `+N` can
 * survive once that row scrolls off the first page of the section.
 */
export const rememberManualInvestigationSeverity = (
  investigationId: string,
  severity: Severity,
  spaceBasePath: string
): void => {
  const entries = readEntries(spaceBasePath);
  const entry = entries.find(({ id }) => id === investigationId);
  if (!entry || entry.severity === severity) {
    return;
  }
  entry.severity = severity;
  writeEntries(spaceBasePath, entries);
};

/** Drop a remembered severity when the investigation is observed running again. */
export const clearManualInvestigationSeverity = (
  investigationId: string,
  spaceBasePath: string
): void => {
  const entries = readEntries(spaceBasePath);
  const entry = entries.find(({ id }) => id === investigationId);
  if (!entry?.severity) {
    return;
  }
  delete entry.severity;
  writeEntries(spaceBasePath, entries);
};

export const dismissManualInvestigationFresh = (
  investigationId: string,
  spaceBasePath: string
): void => {
  const entries = readEntries(spaceBasePath);
  const next = entries.filter(({ id }) => id !== investigationId);
  if (next.length === entries.length) {
    return;
  }
  writeEntries(spaceBasePath, next);
};

export const isManualInvestigationFresh = (
  investigationId: string,
  spaceBasePath: string
): boolean => readEntries(spaceBasePath).some(({ id }) => id === investigationId);

export const getManualInvestigationFreshSeverity = (
  investigationId: string,
  spaceBasePath: string
): Severity | undefined =>
  readEntries(spaceBasePath).find(({ id }) => id === investigationId)?.severity;

/** Tile `+N` counts from remembered severities (not only currently loaded section rows). */
export const getManualInvestigationFreshCounts = (spaceBasePath: string): SeverityCounts => {
  const counts: SeverityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const { severity } of readEntries(spaceBasePath)) {
    if (severity) {
      counts[severity] += 1;
    }
  }
  return counts;
};

/** Clears session fallback between unit tests. */
export const resetManualInvestigationFreshForTests = (): void => {
  memoryBySpace.clear();
  writeFailedBySpace.clear();
};
