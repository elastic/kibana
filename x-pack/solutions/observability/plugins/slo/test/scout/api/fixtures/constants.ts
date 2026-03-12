/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLO_ERROR_BUDGET_ID } from '../../../../common/embeddables/error_budget/constants';
import { SLO_BURN_RATE_EMBEDDABLE_ID } from '../../../../common/embeddables/burn_rate/constants';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../../common/embeddables/overview/constants';

/** The base API path for dashboard endpoints (no leading slash for apiClient). */
export const DASHBOARD_API_PATH = 'api/dashboards';

/** SLO embeddable type IDs - imported from plugin constants to avoid drift when IDs change. */
export { SLO_ERROR_BUDGET_ID, SLO_BURN_RATE_EMBEDDABLE_ID, SLO_OVERVIEW_EMBEDDABLE_ID };

/** Common headers for Dashboard API requests (internal API version 1) */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '1',
} as const;
