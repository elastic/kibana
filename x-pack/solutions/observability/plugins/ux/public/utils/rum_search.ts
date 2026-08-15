/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromQuery, toQuery } from '@kbn/observability-plugin/public';
import type { History } from 'history';

export interface RumFilterPatch {
  frustration?: string;
  pageUrl?: string;
  errorGroup?: string;
  sessionIds?: string;
  browser?: string;
  os?: string;
  location?: string;
  user?: string;
  click?: string;
  account?: string;
  sessionQuery?: string;
  includeBots?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  /** Replay playhead offset in ms (`?t=`). */
  t?: string;
  rangeFrom?: string;
  rangeTo?: string;
  compare?: string;
  includePii?: string;
  goalId?: string;
  includeRaw?: string;
  analyticsMode?: string;
  hasReplay?: string;
}

/** Merge filter params into the current search string. Empty values remove the key. */
export const mergeRumSearch = (search: string, patch: RumFilterPatch): string => {
  const current = toQuery(search) as Record<string, string | undefined>;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(current)) {
    if (value) {
      next[key] = value;
    }
  }
  for (const [key, value] of Object.entries(patch)) {
    if (value == null || value === '') {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return fromQuery(next);
};

export const pushRumPath = (history: History, pathname: string, patch: RumFilterPatch = {}) => {
  history.push({
    pathname,
    search: mergeRumSearch(history.location.search, patch),
  });
};

export interface RumAiLocationState {
  rumAiFollowUp?: string;
}

/** Open AI Analyst with a follow-up prompt, keeping the current filters. */
export const pushRumAiFollowUp = (history: History, prompt: string) => {
  history.push({
    pathname: '/ai',
    search: history.location.search,
    state: { rumAiFollowUp: prompt } satisfies RumAiLocationState,
  });
};

/** Exclusive sessions deep-link: set the given filters and clear the rest of the session-only keys. */
export const sessionsPatch = (patch: RumFilterPatch): RumFilterPatch => ({
  frustration: '',
  pageUrl: '',
  errorGroup: '',
  sessionIds: '',
  user: '',
  click: '',
  account: '',
  sessionQuery: '',
  location: '',
  hasReplay: '',
  ...patch,
});

/** Parse `?t=` replay offset (ms) from a location search string. */
export const parseReplayOffsetMs = (search: string): number | null => {
  const current = toQuery(search) as Record<string, string | undefined>;
  const raw = current.t;
  if (raw == null || raw === '') {
    return null;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
};
