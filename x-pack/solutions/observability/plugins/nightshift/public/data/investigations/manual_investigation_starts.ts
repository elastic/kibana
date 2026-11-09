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
 *
 * Model: a list of `{ id, severity? }`. Severity is filled in once the home list
 * observes the id in a finished bucket (so `+N` survives pagination), and cleared
 * if that id is later seen running again.
 */
const STORAGE_PREFIX = 'nightshift.manualInvestigationFresh:';

const SEVERITIES: readonly Severity[] = ['critical', 'high', 'medium', 'low'];

export interface ManualInvestigationFreshEntry {
  id: string;
  severity?: Severity;
}

/** Minimal section shape the home page syncs against. */
export interface ManualInvestigationFreshSection {
  id: string;
  investigations: ReadonlyArray<{ id: string }>;
}

const listeners = new Set<() => void>();
/** Session mirror / pending writes when localStorage is blocked or setItem fails. */
const memoryBySpace = new Map<string, ManualInvestigationFreshEntry[]>();
const writeFailedBySpace = new Set<string>();

const storageKey = (spaceBasePath: string): string =>
  `${STORAGE_PREFIX}${spaceBasePath || 'default'}`;

const isSeverity = (value: unknown): value is Severity =>
  typeof value === 'string' && (SEVERITIES as readonly string[]).includes(value);

const emptyCounts = (): SeverityCounts => ({ critical: 0, high: 0, medium: 0, low: 0 });

const parseEntries = (raw: string): ManualInvestigationFreshEntry[] => {
  const parsed: unknown = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    return [];
  }
  const entries: ManualInvestigationFreshEntry[] = [];
  for (const item of parsed) {
    if (typeof item === 'string') {
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

const copyEntries = (entries: ManualInvestigationFreshEntry[]): ManualInvestigationFreshEntry[] =>
  entries.map((entry) => ({ ...entry }));

const readEntries = (spaceBasePath: string): ManualInvestigationFreshEntry[] => {
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

const writeEntries = (
  spaceBasePath: string,
  entries: ManualInvestigationFreshEntry[]
): void => {
  const key = storageKey(spaceBasePath);
  const next = copyEntries(entries);
  memoryBySpace.set(key, next);
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
    writeFailedBySpace.delete(key);
  } catch {
    writeFailedBySpace.add(key);
  }
  notify();
};

const onStorageEvent = (event: StorageEvent): void => {
  if (!event.key || !event.key.startsWith(STORAGE_PREFIX)) {
    return;
  }
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
  writeEntries(spaceBasePath, [...entries, { id: investigationId }]);
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

/**
 * One pass over loaded home sections: attach severity for finished unread rows, clear it
 * again if that row is back under In progress. Batched into a single write.
 */
export const syncManualInvestigationFreshFromSections = (
  spaceBasePath: string,
  sections: ReadonlyArray<ManualInvestigationFreshSection>
): void => {
  const entries = readEntries(spaceBasePath);
  if (entries.length === 0) {
    return;
  }

  let changed = false;
  for (const section of sections) {
    if (section.id === 'in-progress') {
      for (const { id } of section.investigations) {
        const entry = entries.find((candidate) => candidate.id === id);
        if (entry?.severity) {
          delete entry.severity;
          changed = true;
        }
      }
      continue;
    }
    if (!isSeverity(section.id)) {
      continue;
    }
    for (const { id } of section.investigations) {
      const entry = entries.find((candidate) => candidate.id === id);
      if (entry && entry.severity !== section.id) {
        entry.severity = section.id;
        changed = true;
      }
    }
  }

  if (changed) {
    writeEntries(spaceBasePath, entries);
  }
};

/** Tile `+N` from remembered severities (unfiltered home). */
export const getManualInvestigationFreshCounts = (spaceBasePath: string): SeverityCounts => {
  const counts = emptyCounts();
  for (const { severity } of readEntries(spaceBasePath)) {
    if (severity) {
      counts[severity] += 1;
    }
  }
  return counts;
};

/** Tile `+N` limited to unread ids present in the currently loaded (e.g. search-filtered) rows. */
export const getManualInvestigationFreshCountsFromSections = (
  spaceBasePath: string,
  sections: ReadonlyArray<ManualInvestigationFreshSection>
): SeverityCounts => {
  const counts = emptyCounts();
  for (const section of sections) {
    if (!isSeverity(section.id)) {
      continue;
    }
    for (const { id } of section.investigations) {
      if (isManualInvestigationFresh(id, spaceBasePath)) {
        counts[section.id] += 1;
      }
    }
  }
  return counts;
};

/**
 * Whether opening this unread id should clear New / `+N`. Uses live list membership and/or a
 * by-id `in_progress` fetch — never “missing from In progress” alone, never remembered severity.
 */
export const shouldDismissManualInvestigationFresh = ({
  investigationId,
  sections,
  fetchedInProgress,
}: {
  investigationId: string;
  sections: ReadonlyArray<ManualInvestigationFreshSection>;
  fetchedInProgress?: boolean;
}): boolean => {
  const seenInProgress = sections.some(
    (section) =>
      section.id === 'in-progress' &&
      section.investigations.some(({ id }) => id === investigationId)
  );
  if (seenInProgress || fetchedInProgress === true) {
    return false;
  }
  const seenFinished = sections.some(
    (section) =>
      (isSeverity(section.id) || section.id === 'not-rated') &&
      section.investigations.some(({ id }) => id === investigationId)
  );
  return seenFinished || fetchedInProgress === false;
};

/** Clears session fallback between unit tests. */
export const resetManualInvestigationFreshForTests = (): void => {
  memoryBySpace.clear();
  writeFailedBySpace.clear();
};
