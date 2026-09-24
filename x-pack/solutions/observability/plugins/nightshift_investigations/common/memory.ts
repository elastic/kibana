/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Plugin-owned standard index. Must not use the `ai-index-idx-` prefix. */
export const MEMORY_INDEX = 'nightshift-semantic-memory';

export type StoredMemoryStatus = 'established' | 'tentative' | 'archived';

export type MemoryArchiveReason = 'merged' | 'harmful';

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
    status?: StoredMemoryStatus;
    impressions?: number;
    conversions?: number;
    last_impression_time?: string;
    categories?: string[];
    references?: string[];
    slug?: string;
    /** Space is the memory isolation boundary; `agent_id` is provenance metadata. */
    space_id?: string;
    agent_id?: string;
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
  status: StoredMemoryStatus;
  agent_id: string;
  source?: string;
  merged_from?: string[];
  archive_reason?: MemoryArchiveReason;
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
  decayed_conversions: number;
  decayed_impressions: number;
}

export interface ListMemoryPagesResponse {
  pages: MemoryPage[];
  stats: MemoryStats;
}
