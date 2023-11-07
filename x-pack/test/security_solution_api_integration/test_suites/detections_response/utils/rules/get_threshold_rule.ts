/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { CreateRulePropsRewrites } from './types';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Threshold signals.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for Threshold and testing by getting all the signals at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getThresholdRule = (
  rewrites?: CreateRulePropsRewrites<ThresholdRuleCreateProps>
): ThresholdRuleCreateProps => ({
  type: 'threshold',
  query: '*:*',
  index: ['auditbeat-*'],
  name: 'Threshold Rule',
  description: 'The new rule description.',
  severity: 'high',
  risk_score: 17,
  tags: ['test', 'newRule'],
  references: ['http://example.com/', 'https://example.com/'],
  false_positives: ['False1', 'False2'],
  note: '# test markdown',
  threshold: {
    field: 'process.name',
    value: 21,
  },
  interval: '100m',
  from: 'now-6m',
  max_signals: 100,
  enabled: false,
  ...rewrites,
});
