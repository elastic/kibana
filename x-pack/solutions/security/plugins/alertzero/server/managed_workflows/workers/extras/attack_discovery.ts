/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPlainObject, type WorkerExtrasModule } from './types';

const DEFAULT_CANDIDATE_LIMIT = 100;
const ALLOWED_KEYS = new Set(['candidateLimit']);

const parseCandidateLimit = (value: unknown): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 1000
    ? value
    : DEFAULT_CANDIDATE_LIMIT;

export const attackDiscoveryExtras: WorkerExtrasModule = {
  createDefaults: () => ({ candidateLimit: DEFAULT_CANDIDATE_LIMIT }),
  parse: (raw) => {
    const bag = isPlainObject(raw) ? raw : {};
    return { candidateLimit: parseCandidateLimit(bag.candidateLimit) };
  },
  applyPatch: (current, patch) => {
    const unknownKeys = Object.keys(patch).filter((key) => !ALLOWED_KEYS.has(key));
    if (unknownKeys.length > 0) {
      return { rejected: `unknown extras (${unknownKeys.join(', ')})` };
    }
    if (
      patch.candidateLimit !== undefined &&
      parseCandidateLimit(patch.candidateLimit) !== patch.candidateLimit
    ) {
      return { rejected: 'a candidate limit' };
    }
    return {
      extras: {
        ...current,
        candidateLimit:
          patch.candidateLimit === undefined
            ? parseCandidateLimit(current.candidateLimit)
            : patch.candidateLimit,
      },
    };
  },
};
