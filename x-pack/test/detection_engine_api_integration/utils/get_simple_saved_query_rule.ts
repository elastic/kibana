/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedQueryRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

/**
 * This is a typical simple saved_query rule for e2e testing
 * @param ruleId
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getSimpleSavedQueryRule = (
  ruleId = 'rule-1',
  enabled = false
): SavedQueryRuleCreateProps => ({
  name: 'Simple Saved Query Rule',
  description: 'Simple Saved Query Rule',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'saved_query',
  saved_id: 'mock_id',
  query: 'user.name: root or user.name: admin',
});
