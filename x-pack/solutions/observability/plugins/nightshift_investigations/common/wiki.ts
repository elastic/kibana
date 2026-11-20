/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Managed Context Engine AI index that stores Wiki pages as KIs. */
export const WIKI_AI_INDEX_ID = 'nightshift-wiki';

/** Backing index for {@link WIKI_AI_INDEX_ID}. Must use the `ai-index-idx-` prefix. */
export const WIKI_AI_INDEX_DEST = 'ai-index-idx-nightshift-wiki';

export const WIKI_ENTITY_TYPES = [
  'integration',
  'service',
  'alert',
  'runbook',
  'query',
  'dashboard',
  'postmortem',
  'topic',
  'glossary',
  'ontology',
] as const;

export type WikiEntityType = (typeof WIKI_ENTITY_TYPES)[number];

export const WIKI_PAGE_STATUSES = ['established', 'tentative', 'archived'] as const;

export type WikiPageStatus = (typeof WIKI_PAGE_STATUSES)[number];

/** Confirmations from later runs a tentative page needs before it is promoted to established. */
export const WIKI_PROMOTION_CORROBORATIONS = 1;

/**
 * What a round is to the optimizer. A follow-up may correct or extend the previous answer, so it
 * carries more weight than a single investigation, but one person's say-so never confirms a page.
 */
export const WIKI_ROUND_KINDS = ['initial', 'follow_up'] as const;

export type WikiRoundKind = (typeof WIKI_ROUND_KINDS)[number];

/** Edits the post-run optimizer can apply to a page. */
export const WIKI_EDIT_ACTIONS = ['upsert', 'corroborate', 'archive'] as const;

export type WikiEditAction = (typeof WIKI_EDIT_ACTIONS)[number];

export const WIKI_ENTITY_TYPE_BUCKETS: Record<WikiEntityType, string> = {
  integration: 'integrations',
  service: 'services',
  alert: 'alerts',
  runbook: 'runbooks',
  query: 'queries',
  dashboard: 'dashboards',
  postmortem: 'postmortems',
  topic: 'topics',
  glossary: 'glossary',
  ontology: 'ontology',
};

/**
 * The markdown sections each entity type's pages use, in order. The optimizer prompt is generated from
 * this so the sections it asks for are the ones the page checks and the UI read.
 */
export const WIKI_SECTIONS_BY_TYPE: Record<WikiEntityType, readonly string[]> = {
  integration: [
    'Overview',
    'Access',
    'Capabilities',
    'Query conventions',
    'Tool failures',
    'Common pitfalls',
  ],
  service: ['Overview', 'Dependencies', 'Telemetry', 'Failure modes', 'Related links'],
  alert: ['Symptom', 'Likely causes', 'First-look checks', 'Related links'],
  runbook: ['Trigger', 'Investigation steps', 'Resolution'],
  query: ['Purpose', 'Query', 'Notes'],
  dashboard: ['URL', 'What it shows'],
  postmortem: ['Incident summary', 'Root cause', 'Detection signals', 'Remediation'],
  topic: ['Overview', 'Established facts', 'Open questions', 'Related links'],
  glossary: [],
  ontology: ['Nodes', 'Relations', 'Concepts'],
};

export interface WikiPageSummary {
  id: string;
  title: string;
  entity_type: WikiEntityType;
  status: WikiPageStatus;
  corroborations: number;
  updated_at: string;
  description?: string;
  conversation_id?: string;
  round_id?: string;
  workflow_execution_id?: string;
  /**
   * Conversations that created or rewrote the page, unlike `conversation_id`, which names whoever
   * wrote it last, including a write that only corroborated it.
   */
  authored_by?: string[];
  doc_version?: number;
}

export interface WikiPage extends WikiPageSummary {
  content: string;
  slug: string;
  /** Opaque stored-document version; pass it back on a write to reject concurrent changes. */
  version?: string;
}

export interface WikiStats {
  total: number;
  established: number;
  total_corroborations: number;
  last_updated?: string;
}

export interface ListWikiPagesResponse {
  pages: WikiPageSummary[];
  stats: WikiStats;
}

export interface GetWikiPageResponse {
  page: WikiPage;
}
