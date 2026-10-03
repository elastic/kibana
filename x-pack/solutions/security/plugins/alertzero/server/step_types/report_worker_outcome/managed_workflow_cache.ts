/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';

/**
 * Remembers the workflows the managed check verified, per workflow id and execution space, so the
 * repeat reports of a Worker skip the managed-state reads. Only a verified workflow is remembered:
 * a workflow that failed the check, or could not be checked, is checked again on its next report.
 */
export interface ManagedWorkflowCache {
  has: (workflowId: string, spaceId: string) => boolean;
  remember: (workflowId: string, spaceId: string) => void;
}

export interface CreateManagedWorkflowCacheOptions {
  max?: number;
  /** Clock override for tests. */
  now?: () => number;
  ttlMs?: number;
}

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

const toKey = (workflowId: string, spaceId: string): string =>
  JSON.stringify([workflowId, spaceId]);

export const createManagedWorkflowCache = ({
  max = DEFAULT_MAX_ENTRIES,
  now,
  ttlMs = DEFAULT_TTL_MS,
}: CreateManagedWorkflowCacheOptions = {}): ManagedWorkflowCache => {
  const cache = new LRUCache<string, true>({
    max,
    ttl: ttlMs,
    // Read the clock on every lookup instead of memoizing it behind a timer.
    ttlResolution: 0,
    ...(now ? { perf: { now } } : {}),
  });
  return {
    has: (workflowId, spaceId) => cache.has(toKey(workflowId, spaceId)),
    remember: (workflowId, spaceId) => {
      cache.set(toKey(workflowId, spaceId), true);
    },
  };
};
