/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WikiPage as SharedWikiPage,
  WikiPageSummary as SharedWikiPageSummary,
  WikiStats,
} from '@kbn/agent-knowledge-wiki';

export {
  WIKI_PAGE_STATUSES,
  WIKI_PROMOTION_CORROBORATIONS,
  type WikiPageStatus,
  type WikiStats,
} from '@kbn/agent-knowledge-wiki';

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

export type WikiPageSummary = SharedWikiPageSummary<WikiEntityType>;

export type WikiPage = SharedWikiPage<WikiEntityType>;

export interface ListWikiPagesResponse {
  pages: WikiPageSummary[];
  stats: WikiStats;
}

export interface GetWikiPageResponse {
  page: WikiPage;
}
