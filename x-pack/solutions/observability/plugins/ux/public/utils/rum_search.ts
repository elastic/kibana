/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromQuery, toQuery } from '@kbn/observability-plugin/public';
import type { History } from 'history';
import { serviceNameFromPath, uxAppPath } from './ux_app_path';

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
  botUa?: string;
  kuery?: string;
  breakpoint?: string;
  connection?: string;
  device?: string;
  serviceName?: string;
  environment?: string;
  platform?: string;
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
  hasBounced?: string;
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

export const serviceNameFromSearch = (search: string): string | undefined => {
  const current = toQuery(search) as { serviceName?: string };
  const name = current.serviceName?.trim();
  return name ? name : undefined;
};

export const uxQueryString = (search: string, patch: RumFilterPatch = {}): string => {
  const next = mergeRumSearch(search, patch);
  return next ? `?${next}` : '';
};

export const uxAppHref = (
  prepend: (path: string) => string,
  {
    serviceName,
    suffix = '',
    search,
    patch,
  }: {
    serviceName?: string;
    suffix?: string;
    search: string;
    patch?: RumFilterPatch;
  }
): string => {
  const path = uxAppPath(serviceName, suffix);
  const qs = uxQueryString(search, { ...patch, serviceName: '' });
  return prepend(`${path === '/' ? '/app/ux' : `/app/ux${path}`}${qs}`);
};

export const pushRumPath = (history: History, pathname: string, patch: RumFilterPatch = {}) => {
  const nextApp =
    patch.serviceName === undefined
      ? serviceNameFromPath(history.location.pathname)
      : patch.serviceName.trim() || undefined;
  const { serviceName: _serviceName, ...searchPatch } = patch;
  history.push({
    pathname: uxAppPath(nextApp, pathname === '/' ? '' : pathname),
    search: mergeRumSearch(history.location.search, { ...searchPatch, serviceName: '' }),
  });
};

export interface RumAiLocationState {
  rumAiFollowUp?: string;
}

/** Open AI Analyst with a follow-up prompt, keeping the current filters. */
export const pushRumAiFollowUp = (history: History, prompt: string) => {
  history.push({
    pathname: uxAppPath(serviceNameFromPath(history.location.pathname), '/ai'),
    search: mergeRumSearch(history.location.search, { serviceName: '' }),
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
  hasBounced: '',
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
