/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * How long the result of a tile query is kept and treated as fresh. A range that is left and
 * visited again within it is not fetched again. `cacheTime` must not be shorter than `staleTime`:
 * React Query drops an unused result after `cacheTime` (5 minutes by default), whatever its
 * `staleTime`, and the whole chain of counts, history check, previous period and series re-runs.
 */
export const TILE_QUERY_CACHE_MS = 60 * 60_000;

export const TILE_QUERY_CACHE_OPTIONS = {
  staleTime: TILE_QUERY_CACHE_MS,
  cacheTime: TILE_QUERY_CACHE_MS,
} as const;
