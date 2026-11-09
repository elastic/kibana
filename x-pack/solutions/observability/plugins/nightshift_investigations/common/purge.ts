/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The stores a purge touches; every scope is space-scoped. */
export const KNOWLEDGE_PURGE_SCOPES = [
  'memory_pages',
  'cortex_pages',
  'decision_trees',
  'investigations',
] as const;

export type KnowledgePurgeScope = (typeof KNOWLEDGE_PURGE_SCOPES)[number];

export type KnowledgePurgeCounts = Record<KnowledgePurgeScope, number>;

export interface KnowledgePurgeInvestigation {
  id: string;
  title: string;
  updated_at: string;
}

export interface KnowledgePurgePreview {
  since: string;
  counts: KnowledgePurgeCounts;
  /** The conversations a purge would remove, so the operator reviews names, not just a number. */
  investigations: KnowledgePurgeInvestigation[];
  /** Capped at {@link MAX_PURGE_INVESTIGATIONS}; more investigations match than are listed. */
  investigations_capped: boolean;
}

export interface KnowledgePurgeResult {
  since: string;
  deleted: KnowledgePurgeCounts;
  /** Scopes that failed; the other scopes were still purged. */
  failures: Array<{ scope: KnowledgePurgeScope; message: string }>;
}

/** Bounds both the preview list and the number of conversations one purge deletes. */
export const MAX_PURGE_INVESTIGATIONS = 500;

/** Typed into the confirmation field before the purge runs. */
export const KNOWLEDGE_PURGE_CONFIRMATION = 'PURGE';

export const emptyPurgeCounts = (): KnowledgePurgeCounts => ({
  memory_pages: 0,
  cortex_pages: 0,
  decision_trees: 0,
  investigations: 0,
});
