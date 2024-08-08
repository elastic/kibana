/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of alerts.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation and testing by getting all the alerts at once.
 * @param ruleId The optional ruleId which is rule-1 by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getRuleForAlertTesting = (
  index: string[],
  ruleId = 'rule-1',
  enabled = true
): QueryRuleCreateProps => ({
  name: 'Alert Testing Query',
  description: 'Tests a simple query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index,
  type: 'query',
  query: '*:*',
  from: '1900-01-01T00:00:00.000Z',
});

export const getLuceneRuleForTesting = (): QueryRuleCreateProps => ({
  rule_id: 'lucene-rule-1',
  enabled: true,
  name: 'Incident 496 test rule',
  description: 'Ensures lucene rules generate alerts',
  risk_score: 1,
  severity: 'high',
  type: 'query',
  index: ['auditbeat-*'],
  query:
    '((event.category: (network OR network_traffic) AND type: (tls OR http)) OR event.dataset: (network_traffic.tls OR network_traffic.http)) AND destination.domain:/[a-z]{3}.stage.[0-9]{8}..*/',
  language: 'lucene',
  from: '1900-01-01T00:00:00.000Z',
});
