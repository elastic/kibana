/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Unread homepage Investigate starts, persisted per space until the finished
 * investigation is opened (severity-tile `+N` and card New marks).
 */
const STORAGE_PREFIX = 'nightshift.manualInvestigationFresh:';

const listeners = new Set<() => void>();

const storageKey = (spaceBasePath: string): string =>
  `${STORAGE_PREFIX}${spaceBasePath || 'default'}`;

const readIds = (spaceBasePath: string): Set<string> => {
  try {
    const raw = window.localStorage.getItem(storageKey(spaceBasePath));
    if (!raw) {
      return new Set();
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return new Set();
    }
    return new Set(parsed.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
};

const writeIds = (spaceBasePath: string, ids: Set<string>): void => {
  window.localStorage.setItem(storageKey(spaceBasePath), JSON.stringify([...ids]));
  for (const listener of listeners) {
    listener();
  }
};

/** Subscribe to fresh-id changes (register / dismiss) so the landing page can re-render. */
export const subscribeManualInvestigationFresh = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const registerManualInvestigationStart = (
  investigationId: string,
  spaceBasePath: string
): void => {
  const ids = readIds(spaceBasePath);
  if (ids.has(investigationId)) {
    return;
  }
  ids.add(investigationId);
  writeIds(spaceBasePath, ids);
};

export const dismissManualInvestigationFresh = (
  investigationId: string,
  spaceBasePath: string
): void => {
  const ids = readIds(spaceBasePath);
  if (!ids.has(investigationId)) {
    return;
  }
  ids.delete(investigationId);
  writeIds(spaceBasePath, ids);
};

export const isManualInvestigationFresh = (
  investigationId: string,
  spaceBasePath: string
): boolean => readIds(spaceBasePath).has(investigationId);
