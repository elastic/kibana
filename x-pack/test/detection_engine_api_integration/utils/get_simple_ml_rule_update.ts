/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleUpdateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

/**
 * This is a representative ML rule payload as expected by the server for an update
 * @param ruleId The rule id
 * @param enabled Set to tru to enable it, by default it is off
 */
export const getSimpleMlRuleUpdate = (ruleId = 'rule-1', enabled = false): RuleUpdateProps => ({
  name: 'Simple ML Rule',
  description: 'Simple Machine Learning Rule',
  enabled,
  anomaly_threshold: 44,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  machine_learning_job_id: ['some_job_id'],
  type: 'machine_learning',
});
