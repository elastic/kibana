/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryClient } from '@kbn/react-query';

/** How long after a start the events keep being read, until the new investigation is listed. */
const RECENT_START_WINDOW_MS = 60_000;

// Kept in the query cache so every events list and detail hook sees it without a provider of their
// own. No query observes it, and the cache keeps it past the one-minute window (gcTime is 5 minutes).
const INVESTIGATION_STARTED_AT_KEY = ['nightshift.investigationStartedAt'] as const;

export const markInvestigationStarted = (queryClient: QueryClient, now: number = Date.now()) => {
  queryClient.setQueryData(INVESTIGATION_STARTED_AT_KEY, now);
};

export const isRecentInvestigationStart = (
  queryClient: QueryClient,
  now: number = Date.now()
): boolean => {
  const startedAt = queryClient.getQueryData<number>(INVESTIGATION_STARTED_AT_KEY);
  return startedAt !== undefined && now - startedAt < RECENT_START_WINDOW_MS;
};
