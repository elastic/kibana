/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Plugin-owned standard index. Must not use the `ai-index-idx-` prefix. */
export const MEMORY_INDEX = 'nightshift-semantic-memory';

/**
 * A memory is archived or it is not; there is no third state.
 *
 * `merged` and `harmful` are set by the optimizer. `manual` is set when a person
 * retires a memory from the UI (see the archive route).
 */
export const MEMORY_ARCHIVE_REASONS = ['merged', 'harmful', 'manual'] as const;

export type MemoryArchiveReason = (typeof MEMORY_ARCHIVE_REASONS)[number];

/**
 * How the UI filters the store. `active` is every memory that is not archived.
 *
 * This is a UI concern rather than a stored value: it is derived from whether
 * `archive_reason` is present, so there is only one source of truth.
 */
export const MEMORY_FILTERS = ['all', 'active', 'archived'] as const;

export type MemoryFilter = (typeof MEMORY_FILTERS)[number];

/**
 * Semantic Memory document. Recall key is `context` (the task that produced the
 * page). `title` / `content` are what the agent reads after recall.
 */
export interface StoredMemoryPage {
  '@timestamp'?: string;
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  /** User task at extract time — the field hydrate searches. */
  context?: string;
  tags?: string[];
  attributes: {
    /**
     * Legacy corroboration gate, removed. Only read so documents written before
     * the change still report as archived; never written.
     *
     * @deprecated derive archived state from `archive_reason` instead.
     */
    status?: 'established' | 'tentative' | 'archived';
    impressions?: number;
    conversions?: number;
    last_impression_time?: string;
    categories?: string[];
    references?: string[];
    slug?: string;
    /** Space is the Semantic Memory isolation boundary. */
    space_id?: string;
    /** Agent that produced the memory. Metadata only — never a tenancy boundary. */
    agent_id?: string;
    /** Agent Builder conversation that produced the memory, for provenance. */
    conversation_id?: string;
    source?: string;
    merged_from?: string[];
    archive_reason?: MemoryArchiveReason;
    created_at?: string;
    updated_at?: string;
    created_by?: string;
    updated_by?: string;
  };
}

export interface MemoryPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  content: string;
  context?: string;
  tags: string[];
  /** True when `archive_reason` is set, or when a legacy document says `status: 'archived'`. */
  archived: boolean;
  source?: string;
  merged_from?: string[];
  archive_reason?: MemoryArchiveReason;
  /** Agent Builder conversation that produced this memory. */
  conversation_id?: string;
  /** Agent that produced this memory. Metadata only. */
  agent_id?: string;
  categories: string[];
  references: string[];
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
  telemetry: {
    impressions: number;
    conversions: number;
    last_impression_time: string;
  };
}

export interface MemoryStats {
  total: number;
  archived: number;
  decayed_conversions: number;
  decayed_impressions: number;
}

export interface MemoryPageSummary extends Omit<MemoryPage, 'content'> {
  /** Read-time usefulness (conversion rate), decayed. What the UI shows. */
  usefulness: number;
  /** Beta credible-interval confidence in [0, 1]. What the UI shows. */
  confidence: number;
}

export interface ListMemoryPagesResponse {
  pages: MemoryPageSummary[];
  stats: MemoryStats;
  /** Total matching pages across every page, not just this one. */
  total: number;
  /** Opaque `search_after` token for the next page; absent when exhausted. */
  cursor?: string;
}

export interface GetMemoryPageResponse {
  page: MemoryPage;
  /** Decayed display telemetry, so the UI need not recompute the bandit maths. */
  usefulness: number;
  confidence: number;
}

