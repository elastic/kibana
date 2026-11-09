/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Managed Context Engine AI index that stores Cortex wiki pages as KIs. */
export const CORTEX_AI_INDEX_ID = 'nightshift-cortex';

/** Backing index for {@link CORTEX_AI_INDEX_ID}. Must use the `ai-index-idx-` prefix. */
export const CORTEX_AI_INDEX_DEST = 'ai-index-idx-nightshift-cortex';

export const CORTEX_ENTITY_TYPES = [
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

export type CortexEntityType = (typeof CORTEX_ENTITY_TYPES)[number];

export const CORTEX_PAGE_STATUSES = ['established', 'tentative', 'archived'] as const;

export type CortexPageStatus = (typeof CORTEX_PAGE_STATUSES)[number];

/** Confirmations from later runs a tentative page needs before it is promoted to established. */
export const CORTEX_PROMOTION_CORROBORATIONS = 1;

/**
 * What a round is to the optimizer. A follow-up may correct or extend the previous answer, so it
 * carries more weight than a single investigation, but one person's say-so never confirms a page.
 */
export const CORTEX_ROUND_KINDS = ['initial', 'follow_up'] as const;

export type CortexRoundKind = (typeof CORTEX_ROUND_KINDS)[number];

/** Edits the post-run optimizer can apply to a page. */
export const CORTEX_EDIT_ACTIONS = ['upsert', 'corroborate', 'archive'] as const;

export type CortexEditAction = (typeof CORTEX_EDIT_ACTIONS)[number];

export const CORTEX_ENTITY_TYPE_BUCKETS: Record<CortexEntityType, string> = {
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
export const CORTEX_SECTIONS_BY_TYPE: Record<CortexEntityType, readonly string[]> = {
  integration: [
    'Overview',
    'Access',
    'Capabilities',
    'Query conventions',
    'Tool failures',
    'Common pitfalls',
  ],
  service: ['Overview', 'Dependencies', 'Telemetry', 'Failure modes'],
  alert: ['Symptom', 'Likely causes', 'First-look checks'],
  runbook: ['Trigger', 'Investigation steps', 'Resolution'],
  query: ['Purpose', 'Query', 'Notes'],
  dashboard: ['URL', 'What it shows'],
  postmortem: ['Incident summary', 'Root cause', 'Detection signals', 'Remediation'],
  topic: ['Overview', 'Established facts', 'Open questions'],
  glossary: [],
  ontology: ['Nodes', 'Relations', 'Concepts'],
};

export interface CortexPageSummary {
  id: string;
  title: string;
  entity_type: CortexEntityType;
  status: CortexPageStatus;
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

export interface CortexPage extends CortexPageSummary {
  content: string;
  slug: string;
  /** Opaque stored-document version; pass it back on a write to reject concurrent changes. */
  version?: string;
}

export interface CortexStats {
  total: number;
  established: number;
  total_corroborations: number;
  last_updated?: string;
}

export interface ListCortexPagesResponse {
  pages: CortexPageSummary[];
  stats: CortexStats;
}

export interface GetCortexPageResponse {
  page: CortexPage;
}
