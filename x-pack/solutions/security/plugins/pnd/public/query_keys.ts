/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface AttachmentsKeyParams {
  correlationId: string;
  conversationId: string;
}

interface ListConversationsKeyParams {
  kind?: 'incident' | 'investigation' | 'thread' | 'tuning';
  page?: number;
  perPage?: number;
}

interface ListRunsKeyParams {
  size?: number;
  watchId?: string;
}

/**
 * Every react-query key PND uses, rooted at `pnd` so nothing collides with
 * another plugin's cache.
 *
 * One namespace per route family. Responding to a gate has to invalidate
 * `proposals` **and** `runs`, because `_respond` returns only
 * `{ sourceId, resumed }` — there is no new run id to key off.
 */
export const queryKeys = {
  /**
   * Agent Builder attachments on one PND thread. Keyed on **both** ids because the route requires
   * both: the same conversation read for a different discovery is a different request, and the S11
   * guard is what makes the second one a 404 rather than the same body.
   */
  attachments: {
    all: ['pnd', 'attachments'] as const,
    list: ({ correlationId, conversationId }: AttachmentsKeyParams) =>
      [...queryKeys.attachments.all, 'list', { correlationId, conversationId }] as const,
  },
  autonomy: {
    all: ['pnd', 'autonomy'] as const,
    /** The level is stored per watch, in a `pnd:autonomy:<watchId>` uiSetting. */
    detail: (watchId: string | undefined) =>
      [...queryKeys.autonomy.all, 'detail', watchId] as const,
  },
  conversations: {
    all: ['pnd', 'conversations'] as const,
    list: ({ kind, page, perPage }: ListConversationsKeyParams = {}) =>
      [...queryKeys.conversations.all, 'list', { kind, page, perPage }] as const,
  },
  /**
   * The blast radius and normalized risk score behind annotations 3 and 5 — one derivation on one
   * key, feeding both surfaces (decision D10).
   *
   * Keyed on the discoveries it enriches, because the response is: the entities belong to the
   * proposals that were on screen when it was read, so a narrowed watch filter is a different
   * question rather than a stale answer to the same one. Its own namespace, never the queue's: a
   * refused enrichment leaves the pending decisions untouched.
   */
  discoveryContext: {
    all: ['pnd', 'discoveryContext'] as const,
    list: (correlationIds: readonly string[]) =>
      [...queryKeys.discoveryContext.all, 'list', correlationIds] as const,
  },
  executions: {
    all: ['pnd', 'executions'] as const,
    detail: (correlationId: string | undefined) =>
      [...queryKeys.executions.all, 'detail', correlationId] as const,
  },
  /**
   * ⚠️ Restored for [#284440](https://github.com/elastic/kibana/pull/284440), whose
   * `use_investigations_api` hooks key off it (register #45).
   *
   * Epic 2 removed this namespace because the lane it cached served fixtures, and a real
   * investigation is surfaced by `proposals`, `runs` and `executions`. That is still where the
   * truth lives — `kibana-phf4.29` repoints the investigation-scoped proposals route at the same
   * parked-gate projection `proposals` reads, so the two namespaces stop disagreeing. Keyed apart
   * from `proposals` in the meantime precisely so a fixture read cannot evict the real queue.
   */
  investigations: {
    all: ['pnd', 'investigations'] as const,
    list: () => [...queryKeys.investigations.all, 'list'] as const,
    detail: (id: string | undefined) => [...queryKeys.investigations.all, 'detail', id] as const,
    proposals: (id: string | undefined) =>
      [...queryKeys.investigations.all, 'proposals', id] as const,
  },
  proposals: {
    all: ['pnd', 'proposals'] as const,
    /**
     * The 24h hourly series behind the KPI sparklines. Its own key, never the queue's: the series
     * counts gates **opened** per hour while the queue counts what is **still waiting**, so the two
     * reads answer different questions from different routes. A failed series must leave the
     * pending decisions on screen untouched, which only separate keys guarantee.
     *
     * Unparameterized, because the route is: the series is the space's global opening rate and does
     * not track the watch filter the headline counts respond to.
     */
    activity: () => [...queryKeys.proposals.all, 'activity'] as const,
    /** The answered gates, cached apart from the queue so opening a tab cannot evict the other. */
    history: () => [...queryKeys.proposals.all, 'history'] as const,
    list: () => [...queryKeys.proposals.all, 'list'] as const,
  },
  runs: {
    all: ['pnd', 'runs'] as const,
    list: ({ size, watchId }: ListRunsKeyParams = {}) =>
      [...queryKeys.runs.all, 'list', { size, watchId }] as const,
  },
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
};
