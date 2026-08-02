/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isManagedWatchId } from '../../../../../hooks/is_managed_watch_id';

/** The query param a watch's "View all runs" link puts the watch id in. */
export const RUNS_WATCH_ID_QUERY_PARAM = 'watchId';

/**
 * The watch the ledger is filtered to, read off the location's search string.
 *
 * The param exists so watch detail's "View all runs" lands on this page already
 * scoped to that watch, and so a filtered ledger is a shareable URL. It is passed
 * straight to `GET /internal/pnd/runs`, so it is checked against the five managed
 * watch ids first: the route bounds `watchId` at 256 characters and answers a
 * bounded-input `400`, and an unrecognised value would otherwise turn a normal
 * page into an error state. Anything unrecognised is ignored — the ledger then
 * shows every watch, which is the honest fallback rather than an empty table.
 */
export const readRunsWatchId = (search: string): string | undefined => {
  const value = new URLSearchParams(search).get(RUNS_WATCH_ID_QUERY_PARAM);

  return isManagedWatchId(value ?? undefined) ? (value as string) : undefined;
};

/** The search string that filters the ledger to one watch, keeping other params. */
export const buildRunsWatchIdSearch = (search: string, watchId: string): string => {
  const params = new URLSearchParams(search);
  params.set(RUNS_WATCH_ID_QUERY_PARAM, watchId);

  return `?${params.toString()}`;
};

/** The search string that clears the watch filter, keeping other params. */
export const clearRunsWatchIdSearch = (search: string): string => {
  const params = new URLSearchParams(search);
  params.delete(RUNS_WATCH_ID_QUERY_PARAM);

  const remaining = params.toString();

  return remaining === '' ? '' : `?${remaining}`;
};
