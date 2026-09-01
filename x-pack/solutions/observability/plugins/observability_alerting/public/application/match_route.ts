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

export type ObservabilityAlertingMountKey =
  | 'mountEpisodesApp'
  | 'mountRulesApp'
  | 'mountRuleLibraryApp'
  | 'mountActionPoliciesApp'
  | 'mountExecutionHistoryApp';

export type ObservabilityAlertingRouteMatch =
  | { type: 'redirect'; to: typeof OBSERVABILITY_ALERTING_INBOX_PATH }
  | { type: 'v1-rules' }
  | { type: 'mount'; path: string; mountKey: ObservabilityAlertingMountKey };

const MOUNT_ROUTES: Array<{ path: string; mountKey: ObservabilityAlertingMountKey }> = [
  { path: OBSERVABILITY_ALERTING_INBOX_PATH, mountKey: 'mountEpisodesApp' },
  { path: OBSERVABILITY_ALERTING_RULES_V2_PATH, mountKey: 'mountRulesApp' },
  { path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH, mountKey: 'mountRuleLibraryApp' },
  { path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH, mountKey: 'mountActionPoliciesApp' },
  { path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH, mountKey: 'mountExecutionHistoryApp' },
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

  const mountRoute = MOUNT_ROUTES.find(({ path }) => pathMatches(pathname, path));
  if (mountRoute) {
    return { type: 'mount', path: mountRoute.path, mountKey: mountRoute.mountKey };
  }

  return { type: 'redirect', to: OBSERVABILITY_ALERTING_INBOX_PATH };
};
