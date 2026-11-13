/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Nightshift wiki contracts. Types and constants live in `@kbn/agent-knowledge-common`;
 * this module re-exports the Nightshift-facing surface so existing imports keep working.
 *
 * `WikiEntityType` here is the Nightshift pack only. The shared plugin also knows AlertZero types.
 */
export {
  WIKI_AI_INDEX_DEST,
  WIKI_AI_INDEX_ID,
  WIKI_EDIT_ACTIONS,
  WIKI_ENTITY_TYPE_BUCKETS,
  WIKI_ENTITY_TYPES,
  WIKI_PAGE_STATUSES,
  WIKI_PROMOTION_CORROBORATIONS,
  WIKI_ROUND_KINDS,
  WIKI_SECTIONS_BY_TYPE,
} from '@kbn/agent-knowledge-common';

export type {
  GetWikiPageResponse,
  ListWikiPagesResponse,
  NightshiftWikiEntityType as WikiEntityType,
  WikiEditAction,
  WikiPageStatus,
  WikiRoundKind,
  WikiStats,
} from '@kbn/agent-knowledge-common';

import type {
  NightshiftWikiEntityType,
  WikiPage as SharedWikiPage,
  WikiPageSummary as SharedWikiPageSummary,
} from '@kbn/agent-knowledge-common';

export type WikiPageSummary = Omit<SharedWikiPageSummary, 'entity_type'> & {
  entity_type: NightshiftWikiEntityType;
};

export type WikiPage = Omit<SharedWikiPage, 'entity_type'> & {
  entity_type: NightshiftWikiEntityType;
};
