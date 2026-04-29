/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The base API path for dashboard endpoints (no leading slash for apiClient). */
export const DASHBOARD_API_PATH = 'api/dashboards';

/**
 * SLO embeddable type IDs. Must match common/embeddables/{overview,error_budget,burn_rate}/constants.ts.
 * Cannot import from plugin common/ here due to Scout API tsconfig rootDir boundaries.
 */
export const SLO_OVERVIEW_EMBEDDABLE_ID = 'slo_overview';
export const SLO_ERROR_BUDGET_ID = 'slo_error_budget';
export const SLO_BURN_RATE_EMBEDDABLE_ID = 'slo_burn_rate';
export const SLO_ALERTS_EMBEDDABLE_ID = 'slo_alerts';

/** Common headers for Dashboard API requests */
export const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
  'x-elastic-internal-origin': 'kibana',
  'elastic-api-version': '2023-10-31',
} as const;
