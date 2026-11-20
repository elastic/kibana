/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { LRUCache } from 'lru-cache';
import type { AnalyticsSourceGeneration, AnalyticsUseCaseId } from '../../common/analytics';

export const GENERATION_CACHE_MAX_ENTRIES = 200;
export const GENERATION_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

export interface GenerationCacheKeyParts {
  /**
   * Who asked. Generated questions quote values the asker could read, and what a user can read
   * differs with document- and field-level security, so an answer is never shared between users.
   */
  userId: string;
  source: string;
  mappingHash: string;
  timeField: string | null;
  useCaseId?: AnalyticsUseCaseId;
  schemaOnly: boolean;
  connectorId: string;
  locale: string;
}

export const getGenerationCacheKey = ({
  userId,
  source,
  mappingHash,
  timeField,
  useCaseId,
  schemaOnly,
  connectorId,
  locale,
}: GenerationCacheKeyParts): string =>
  createHash('sha256')
    .update(
      JSON.stringify([
        userId,
        source,
        mappingHash,
        timeField,
        useCaseId ?? null,
        schemaOnly,
        connectorId,
        locale,
      ])
    )
    .digest('hex');

export interface GenerationCache {
  /**
   * The kept answer for the key, else the one `generate` resolves with, which is then kept.
   * Requests for the same key share one generation while it runs; a failed one keeps nothing.
   */
  getOrGenerate: (
    key: string,
    generate: () => Promise<AnalyticsSourceGeneration>,
    options?: { refresh?: boolean }
  ) => Promise<AnalyticsSourceGeneration>;
}

/** Validated answers kept in this Kibana process: bounded, expiring and lost on restart. */
export const createGenerationCache = ({
  maxEntries = GENERATION_CACHE_MAX_ENTRIES,
  ttlMs = GENERATION_CACHE_TTL_MS,
}: { maxEntries?: number; ttlMs?: number } = {}): GenerationCache => {
  const answers = new LRUCache<string, AnalyticsSourceGeneration>({ max: maxEntries, ttl: ttlMs });
  const running = new Map<string, Promise<AnalyticsSourceGeneration>>();

  return {
    getOrGenerate: async (key, generate, { refresh = false } = {}) => {
      const kept = refresh ? undefined : answers.get(key);
      if (kept !== undefined) {
        return { ...kept, cached: true };
      }

      const alreadyRunning = running.get(key);
      if (alreadyRunning !== undefined) {
        return alreadyRunning;
      }

      const generation = generate()
        .then((answer) => {
          // An answer with nothing usable is not kept, so the next visit tries again.
          if (answer.queries !== null || answer.panels !== null) {
            answers.set(key, answer);
          }
          return answer;
        })
        .finally(() => {
          running.delete(key);
        });
      running.set(key, generation);

      return generation;
    },
  };
};
