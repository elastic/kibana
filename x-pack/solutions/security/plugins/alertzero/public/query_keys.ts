/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryKeys as platformQueryKeys } from '@kbn/proposals-plugin/public';

export const queryKeys = {
  /**
   * AlertZero-specific views over the shared proposals data.
   * Keys share the platform root so that the platform's invalidateQueries
   * on approve/dismiss sweeps these up without AlertZero needing its own mutations.
   */
  proposals: {
    chartsSummary: (windowHours: number, bucketMinutes: number) =>
      [...platformQueryKeys.proposals.all, 'charts-summary', windowHours, bucketMinutes] as const,
    /** No offset in the key: one entry holds every page Show more has appended. */
    byCategory: (category: string) =>
      [...platformQueryKeys.proposals.all, 'by-category', category] as const,
    closed: () => [...platformQueryKeys.proposals.all, 'closed'] as const,
    /** `size: 0` reads, so a collapsed accordion knows its size without its rows. */
    byCategoryCount: (category: string) =>
      [...platformQueryKeys.proposals.all, 'by-category-count', category] as const,
    closedCount: () => [...platformQueryKeys.proposals.all, 'closed-count'] as const,
  },
  watches: {
    all: ['alertzero', 'watches'] as const,
    list: () => [...queryKeys.watches.all, 'list'] as const,
    detail: (watchId: string | undefined) => [...queryKeys.watches.all, 'detail', watchId] as const,
  },
  /** Live registered Workers, including settings and revision. */
  workers: {
    all: ['alertzero', 'workers'] as const,
    list: () => [...queryKeys.workers.all, 'list'] as const,
  },
  /** Global skill catalog. */
  skills: {
    all: ['alertzero', 'skills'] as const,
    list: () => [...queryKeys.skills.all, 'list'] as const,
  },
  currentUser: {
    all: ['alertzero', 'current-user'] as const,
    get: () => [...queryKeys.currentUser.all, 'get'] as const,
  },
};
