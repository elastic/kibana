/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InvestigationSummary } from '@kbn/agentic-investigations-plugin/common';

/** Demo-only: closed investigations older than this are treated as archived. */
export const DEMO_RECENTLY_CLOSED_MS = 7 * 24 * 60 * 60 * 1000;

const storageKey = (spaceKey: string): string =>
  `nightshift.demoArchiveIds:${spaceKey || 'default'}`;

const listeners = new Set<() => void>();

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

/** Subscribe to archive store changes (localStorage writes in this tab). */
export const subscribeDemoArchiveStore = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const readIds = (spaceKey: string): Set<string> => {
  try {
    const raw = window.localStorage.getItem(storageKey(spaceKey));
    if (!raw) {
      return new Set();
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
};

const writeIds = (spaceKey: string, ids: Set<string>): void => {
  window.localStorage.setItem(storageKey(spaceKey), JSON.stringify([...ids]));
  notify();
};

export const getDemoArchivedIds = (spaceKey: string): Set<string> => readIds(spaceKey);

export const archiveDemoInvestigation = (spaceKey: string, id: string): void => {
  const ids = readIds(spaceKey);
  ids.add(id);
  writeIds(spaceKey, ids);
};

export const unarchiveDemoInvestigation = (spaceKey: string, id: string): void => {
  const ids = readIds(spaceKey);
  if (!ids.delete(id)) {
    return;
  }
  writeIds(spaceKey, ids);
};

const ageMs = (investigation: InvestigationSummary, now: number): number | null => {
  const updated = Date.parse(investigation.updated_at);
  if (!Number.isFinite(updated)) {
    return null;
  }
  return now - updated;
};

/**
 * Archived for the demo: explicitly archived in localStorage, or closed and older than the
 * recently-closed window (unless the id was never seeded / is still “recent”).
 */
export const isDemoArchived = (
  investigation: InvestigationSummary,
  spaceKey: string,
  now: number = Date.now()
): boolean => {
  if (readIds(spaceKey).has(investigation.id)) {
    return true;
  }
  if (investigation.metadata.status !== 'closed') {
    return false;
  }
  const age = ageMs(investigation, now);
  return age != null && age > DEMO_RECENTLY_CLOSED_MS;
};

export const isDemoRecentlyClosed = (
  investigation: InvestigationSummary,
  spaceKey: string,
  now: number = Date.now()
): boolean =>
  investigation.metadata.status === 'closed' && !isDemoArchived(investigation, spaceKey, now);

/**
 * First visit: if nothing is archived yet, mark older closed investigations as archived so the
 * archived-match notice works without setup.
 */
export const seedDemoArchivedFromClosed = (
  spaceKey: string,
  investigations: InvestigationSummary[],
  now: number = Date.now()
): void => {
  if (readIds(spaceKey).size > 0) {
    return;
  }
  const toArchive = investigations.filter(
    (investigation) =>
      investigation.metadata.status === 'closed' &&
      (() => {
        const age = ageMs(investigation, now);
        return age != null && age > DEMO_RECENTLY_CLOSED_MS;
      })()
  );
  if (toArchive.length === 0) {
    return;
  }
  writeIds(spaceKey, new Set(toArchive.map(({ id }) => id)));
};
