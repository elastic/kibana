/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LRUCache } from 'lru-cache';
import type { AlertZeroEnvelopeRoot } from '../../telemetry';

interface VerifiedChainEntry {
  root: AlertZeroEnvelopeRoot;
  spaceId: string;
}

/**
 * Remembers verified Worker chains so repeat reports from one run skip the ancestor reads. Every
 * execution of a verified chain maps to the chain's root; an entry answers only in its own space.
 */
export interface VerifiedChainCache {
  get: (executionId: string, spaceId: string) => AlertZeroEnvelopeRoot | undefined;
  set: (executionIds: readonly string[], entry: VerifiedChainEntry) => void;
}

export interface CreateVerifiedChainCacheOptions {
  max?: number;
  /** Clock override for tests. */
  now?: () => number;
  ttlMs?: number;
}

const DEFAULT_MAX_ENTRIES = 500;
const DEFAULT_TTL_MS = 10 * 60 * 1000;

export const createVerifiedChainCache = ({
  max = DEFAULT_MAX_ENTRIES,
  now,
  ttlMs = DEFAULT_TTL_MS,
}: CreateVerifiedChainCacheOptions = {}): VerifiedChainCache => {
  const cache = new LRUCache<string, VerifiedChainEntry>({
    max,
    ttl: ttlMs,
    // Read the clock on every lookup instead of memoizing it behind a timer.
    ttlResolution: 0,
    ...(now ? { perf: { now } } : {}),
  });
  return {
    get: (executionId, spaceId) => {
      const entry = cache.get(executionId);
      return entry?.spaceId === spaceId ? entry.root : undefined;
    },
    set: (executionIds, entry) => {
      executionIds.forEach((executionId) => cache.set(executionId, entry));
    },
  };
};
