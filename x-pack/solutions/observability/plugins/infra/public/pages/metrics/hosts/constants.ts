/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HostLimitOptions } from './types';
import {
  HOSTS_TABLE_DEFAULT_PAGE_SIZE,
  HOSTS_TABLE_PAGE_SIZE_OPTIONS,
} from '../../../../common/constants';

export const DEFAULT_HOST_LIMIT: HostLimitOptions = 100;
// Re-exported with the names the UI surface has used for years; the
// canonical definitions live in `common/constants.ts` so the server
// Phase B route can derive its cap from the same source — see the comment
// on `HOSTS_TABLE_PAGE_SIZE_OPTIONS`.
export const DEFAULT_PAGE_SIZE = HOSTS_TABLE_DEFAULT_PAGE_SIZE;
export const PAGE_SIZE_OPTIONS = [...HOSTS_TABLE_PAGE_SIZE_OPTIONS];
export const LOCAL_STORAGE_HOST_LIMIT_KEY = 'hostsView:hostLimitSelection';
export const LOCAL_STORAGE_PAGE_SIZE_KEY = 'hostsView:pageSizeSelection';

// PoC widening: 1000 / 2000 / 3000 / 10000 added on top of the historical
// [50, 100, 500] set so reviewers can drive the page well past the original
// safe ceiling. Phase A already validates `limit ≤ MAX_HOST_COUNT_LIMIT
// (10 000)` server-side, so the wider options are just exposed in the UI.
// 10 000 is the legacy `MAX_HOST_COUNT_LIMIT`; values above that are rejected
// at the route validator and would also blow the host-count `cardinality`
// agg's precision_threshold on real fleets.
export const HOST_LIMIT_OPTIONS = [50, 100, 500, 1000, 2000, 3000, 10000] as const;
export const HOST_METRICS_DOC_HREF = 'https://ela.st/docs-infra-host-metrics';
