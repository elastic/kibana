/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  WIKI_ENTITY_TYPES,
  WIKI_PAGE_STATUSES,
  type WikiEntityType,
  type WikiPageStatus,
  type WikiPageSummary,
  type WikiPage,
  type WikiStats,
  type ListWikiPagesResponse,
  type GetWikiPageResponse,
} from '@kbn/nightshift-investigations-plugin/common';

import type { WikiPageStatus } from '@kbn/nightshift-investigations-plugin/common';

/** UI-only filter state: the page statuses plus an "all" option for the sidebar. */
export type WikiStatusFilter = 'all' | WikiPageStatus;
