/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getRuleForAlertTesting } from '../../../../../common/utils/security_solution';

/**
 * This is a typical signal testing rule that is easy for most basic testing of output of Threshold alerts.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of signal
 * creation for Threshold and testing by getting all the alerts at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getThresholdRuleForAlertTesting = (
  index: string[],
  ruleId = 'threshold-rule',
  enabled = true
): ThresholdRuleCreateProps => ({
  ...getRuleForAlertTesting(index, ruleId, enabled),
  type: 'threshold',
  language: 'kuery',
  query: '*:*',
  threshold: {
    field: 'process.name',
    value: 21,
  },
  alert_suppression: undefined,
});
