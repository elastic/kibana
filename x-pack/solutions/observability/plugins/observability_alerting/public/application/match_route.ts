/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V1_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

export type ObservabilityAlertingSurface =
  | 'inbox'
  | 'rules'
  | 'ruleLibrary'
  | 'actionPolicies'
  | 'executionHistory';

export type ObservabilityAlertingRouteMatch =
  | { type: 'redirect'; to: typeof OBSERVABILITY_ALERTING_INBOX_PATH }
  | { type: 'v1-rules' }
  | { type: 'surface'; path: string; surface: ObservabilityAlertingSurface };

const SURFACE_ROUTES: Array<{ path: string; surface: ObservabilityAlertingSurface }> = [
  { path: OBSERVABILITY_ALERTING_INBOX_PATH, surface: 'inbox' },
  { path: OBSERVABILITY_ALERTING_RULES_V2_PATH, surface: 'rules' },
  { path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, surface: 'ruleLibrary' },
  { path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH, surface: 'actionPolicies' },
  { path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH, surface: 'executionHistory' },
];

const pathMatches = (pathname: string, basePath: string): boolean =>
  pathname === basePath || pathname.startsWith(`${basePath}/`);

export const matchObservabilityAlertingRoute = (
  pathname: string
): ObservabilityAlertingRouteMatch => {
  if (pathname === '/' || pathname === '') {
    return { type: 'redirect', to: OBSERVABILITY_ALERTING_INBOX_PATH };
  }

  if (pathMatches(pathname, OBSERVABILITY_ALERTING_RULES_V1_PATH)) {
    return { type: 'v1-rules' };
  }

  const surfaceRoute = SURFACE_ROUTES.find(({ path }) => pathMatches(pathname, path));
  if (surfaceRoute) {
    return { type: 'surface', path: surfaceRoute.path, surface: surfaceRoute.surface };
  }

  return { type: 'redirect', to: OBSERVABILITY_ALERTING_INBOX_PATH };
};
