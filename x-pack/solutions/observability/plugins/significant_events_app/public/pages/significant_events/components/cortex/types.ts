/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  CORTEX_ENTITY_TYPES,
  CORTEX_PAGE_STATUSES,
  type CortexEntityType,
  type CortexPageStatus,
  type CortexPageSummary,
  type CortexPage,
  type CortexStats,
  type ListCortexPagesResponse,
  type GetCortexPageResponse,
} from '@kbn/nightshift-investigations-plugin/common';

import type { CortexPageStatus } from '@kbn/nightshift-investigations-plugin/common';

/** UI-only filter state: the page statuses plus an "all" option for the sidebar. */
export type CortexStatusFilter = 'all' | CortexPageStatus;
