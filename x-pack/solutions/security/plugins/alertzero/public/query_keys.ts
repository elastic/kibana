/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryKeys as platformQueryKeys } from '@kbn/agentic-investigations-plugin/public';
import type { ProposalsPageParams } from '../common/proposals/list';

export const queryKeys = {
  /**
   * AlertZero-specific views over the shared proposals data.
   * Keys share the platform root so that the platform's invalidateQueries
   * on approve/dismiss sweeps these up without AlertZero needing its own mutations.
   */
  proposals: {
    chartsSummary: (windowHours: number, bucketMinutes: number) =>
      [...platformQueryKeys.proposals.all, 'charts-summary', windowHours, bucketMinutes] as const,
    /**
     * Pending proposals for one action category — drives a queue accordion. The page
     * params are part of the key: a collapsed accordion asks for `size: 0`, and that
     * response must not shadow the rows an expanded one fetches.
     */
    byCategory: (category: string, page: ProposalsPageParams) =>
      [...platformQueryKeys.proposals.all, 'by-category', category, page] as const,
    /** Proposals decided in the last 72 h — drives the closed queue accordion. */
    closed: (page: ProposalsPageParams) =>
      [...platformQueryKeys.proposals.all, 'closed', page] as const,
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
};
