/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchObservabilityAlertingRoute } from './match_route';
import {
  OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
  OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
  OBSERVABILITY_ALERTING_INBOX_PATH,
  OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
  OBSERVABILITY_ALERTING_RULES_V2_PATH,
} from '../constants';

describe('matchObservabilityAlertingRoute', () => {
  it('redirects the app root to inbox', () => {
    expect(matchObservabilityAlertingRoute('/')).toEqual({
      type: 'redirect',
      to: OBSERVABILITY_ALERTING_INBOX_PATH,
    });
    expect(matchObservabilityAlertingRoute('')).toEqual({
      type: 'redirect',
      to: OBSERVABILITY_ALERTING_INBOX_PATH,
    });
  });

  it('matches nested inbox, rules v2, and action-policy paths', () => {
    expect(matchObservabilityAlertingRoute('/inbox/episode-1')).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_INBOX_PATH,
      mountKey: 'mountEpisodesApp',
    });
    expect(matchObservabilityAlertingRoute('/rules/v2/rule-1')).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
      mountKey: 'mountRulesApp',
    });
    expect(matchObservabilityAlertingRoute('/action-policies/create')).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
      mountKey: 'mountActionPoliciesApp',
    });
    expect(matchObservabilityAlertingRoute('/action-policies/edit/policy-1')).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_ACTION_POLICIES_PATH,
      mountKey: 'mountActionPoliciesApp',
    });
  });

  it('matches list paths for library and execution history', () => {
    expect(matchObservabilityAlertingRoute(OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH)).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_RULE_LIBRARY_PATH,
      mountKey: 'mountRuleLibraryApp',
    });
    expect(matchObservabilityAlertingRoute(OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH)).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_EXECUTION_HISTORY_PATH,
      mountKey: 'mountExecutionHistoryApp',
    });
  });

  it('routes classic rules to the v1 rules app', () => {
    expect(matchObservabilityAlertingRoute('/rules/v1')).toEqual({ type: 'v1-rules' });
    expect(matchObservabilityAlertingRoute('/rules/v1/rule-1')).toEqual({ type: 'v1-rules' });
  });

  it('does not treat /rules/v2 as v1', () => {
    expect(matchObservabilityAlertingRoute('/rules/v2')).toEqual({
      type: 'mount',
      path: OBSERVABILITY_ALERTING_RULES_V2_PATH,
      mountKey: 'mountRulesApp',
    });
  });

  it('redirects unknown paths to inbox', () => {
    expect(matchObservabilityAlertingRoute('/unknown')).toEqual({
      type: 'redirect',
      to: OBSERVABILITY_ALERTING_INBOX_PATH,
    });
  });
});
