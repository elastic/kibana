/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const queryKeys = {
  watches: {
    all: ['pnd', 'watches'] as const,
    list: () => [...queryKeys.watches.all, 'list'] as const,
    /** Also carries the watch's settings — they come back on the same request. */
    detail: (watchId: string | undefined) => [...queryKeys.watches.all, 'detail', watchId] as const,
  },
  /** Global worker catalog. Kept separate from skills — they are different things. */
  workers: {
    all: ['pnd', 'workers'] as const,
    list: () => [...queryKeys.workers.all, 'list'] as const,
  },
  /** Global skill catalog. */
  skills: {
    all: ['pnd', 'skills'] as const,
    list: () => [...queryKeys.skills.all, 'list'] as const,
  },
  investigations: {
    all: ['pnd', 'investigations'] as const,
    list: () => [...queryKeys.investigations.all, 'list'] as const,
    detail: (id: string | undefined) => [...queryKeys.investigations.all, 'detail', id] as const,
    proposals: (id: string | undefined) =>
      [...queryKeys.investigations.all, 'proposals', id] as const,
  },
};
