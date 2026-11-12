/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAnalytics } from '@elastic/ebt/client';
import { loggerMock } from '@kbn/logging-mocks';
import {
  NIGHTSHIFT_DECISION_TREE_CAUSAL_CHECK_EVENT,
  decisionTreeCausalCheckEvent,
  type DecisionTreeCausalCheckEvent,
} from './decision_tree_causal_check_event';

describe('decisionTreeCausalCheckEvent schema', () => {
  const createRegisteredAnalytics = () => {
    const analytics = createAnalytics({ isDev: true, logger: loggerMock.create() });
    analytics.registerEventType(decisionTreeCausalCheckEvent);
    return analytics;
  };

  it.each<DecisionTreeCausalCheckEvent>([
    {
      agent_id: 'nightshift.investigation',
      conversation_id: 'inv-1',
      round_id: 'round-2',
      workflow_execution_id: 'exec-1',
      outcome: 'confirmed',
      follow_up_source: 'slack',
      is_feedback: true,
      causal_confirmed: true,
      has_learning: true,
      tree_count: 1,
      opened_tree_count: 1,
      recorder_outcome: 'found',
      recorder_has_confirmed_cause: true,
      duration_ms: 1840,
    },
    {
      agent_id: 'nightshift.investigation',
      conversation_id: 'inv-1',
      round_id: 'round-3',
      workflow_execution_id: 'exec-2',
      outcome: 'unconfirmed_feedback',
      follow_up_source: 'direct',
      is_feedback: true,
      causal_confirmed: false,
      has_learning: true,
      tree_count: 2,
      opened_tree_count: 0,
      recorder_outcome: 'unchanged',
      recorder_has_confirmed_cause: false,
      duration_ms: 2100,
    },
    {
      agent_id: 'nightshift.investigation',
      conversation_id: 'inv-1',
      round_id: 'round-4',
      outcome: 'not_feedback',
      follow_up_source: 'alert_recovery',
      is_feedback: false,
      causal_confirmed: false,
      has_learning: false,
      tree_count: 1,
      opened_tree_count: 1,
      recorder_outcome: 'unknown',
      duration_ms: 950,
    },
    {
      agent_id: 'nightshift.investigation',
      conversation_id: 'inv-2',
      round_id: 'round-2',
      outcome: 'skipped_no_trees',
      follow_up_source: 'direct',
      tree_count: 0,
      opened_tree_count: 0,
      recorder_outcome: 'unknown',
    },
    {
      agent_id: 'nightshift.investigation',
      conversation_id: 'inv-3',
      round_id: 'round-2',
      workflow_execution_id: 'exec-5',
      outcome: 'failed',
      follow_up_source: 'slack',
      tree_count: 1,
      opened_tree_count: 0,
      duration_ms: 90_000,
      error_code: 'timeout',
    },
    {
      agent_id: 'nightshift.investigation',
      conversation_id: 'inv-3',
      round_id: 'round-3',
      outcome: 'failed',
      follow_up_source: 'direct',
      tree_count: 1,
      opened_tree_count: 1,
      duration_ms: 1200,
      error_code: 'cancelled',
    },
  ])('accepts %o', (event) => {
    const analytics = createRegisteredAnalytics();

    expect(() =>
      analytics.reportEvent(NIGHTSHIFT_DECISION_TREE_CAUSAL_CHECK_EVENT, event)
    ).not.toThrow();
  });

  it('rejects an event missing required outcome metadata', () => {
    const analytics = createRegisteredAnalytics();

    expect(() =>
      analytics.reportEvent(NIGHTSHIFT_DECISION_TREE_CAUSAL_CHECK_EVENT, {
        agent_id: 'nightshift.investigation',
        follow_up_source: 'direct',
        tree_count: 1,
        opened_tree_count: 0,
      })
    ).toThrow(/outcome/);
  });
});
