/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PreviewRulesSchema } from '../../../plugins/security_solution/common/detection_engine/schemas/request';

/**
 * This is a typical simple preview rule for testing that is easy for most basic testing
 * @param ruleId
 * @param invocationCount The number of times the rule will be run through the executors. Defaulted to 12,
 * the execution time for the default interval time of 5m.
 */
export const getSimplePreviewRule = (
  ruleId = 'preview-rule-1',
  invocationCount = 12
): PreviewRulesSchema => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'query',
  query: 'user.name: root or user.name: admin',
  invocationCount,
});
