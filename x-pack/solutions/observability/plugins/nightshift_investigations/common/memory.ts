/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Managed Context Engine AI index that stores Semantic Memory pages as KIs. */
export const MEMORY_AI_INDEX_ID = 'nightshift-semantic-memory';

/** Backing index for {@link MEMORY_AI_INDEX_ID}; must keep the `ai-index-idx-` prefix. */
export const MEMORY_INDEX = 'ai-index-idx-nightshift-semantic-memory';

/** `merged`/`harmful` are set by the optimizer, `manual` by the UI archive route. */
export const MEMORY_ARCHIVE_REASONS = ['merged', 'harmful', 'manual'] as const;

export type MemoryArchiveReason = (typeof MEMORY_ARCHIVE_REASONS)[number];

/** UI-only: `active` means `archive_reason` is absent, so there is one source of truth. */
export const MEMORY_FILTERS = ['all', 'active', 'archived'] as const;

export type MemoryFilter = (typeof MEMORY_FILTERS)[number];

/** Task-recall context lives in `description`, the managed AI-index mapping's field for it. */
export interface StoredMemoryPage {
  '@timestamp'?: string;
  type?: string;
  title?: string;
  description?: string;
  content?: string;
  tags?: string[];
  attributes: {
    impressions?: number;
    conversions?: number;
    last_impression_time?: string;
    categories?: string[];
    references?: string[];
    slug?: string;
    /** Space is the Semantic Memory isolation boundary. */
    space_id?: string;
    /** Provenance only — never a tenancy boundary. */
    agent_id?: string;
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
  content: string;
  context?: string;
  tags: string[];
  archived: boolean;
  source?: string;
  merged_from?: string[];
  archive_reason?: MemoryArchiveReason;
  conversation_id?: string;
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
}

export interface MemoryPageSummary extends Omit<MemoryPage, 'content'> {
  usefulness: number;
  /** Beta credible-interval confidence in [0, 1]. */
  confidence: number;
}

export interface ListMemoryPagesResponse {
  pages: MemoryPageSummary[];
  stats: MemoryStats;
  total: number;
  cursor?: string;
}

export interface MemoryPageRevision {
  seq_no: number;
  primary_term: number;
}

export interface GetMemoryPageResponse {
  page: MemoryPage;
  usefulness: number;
  confidence: number;
  /** The revision this page was read at, which a destructive write must name. */
  version: MemoryPageRevision;
}
