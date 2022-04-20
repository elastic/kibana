/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryCreateSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';

/**
 * This is a typical simple rule for testing that is easy for most basic testing
 * @param ruleId
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getSimpleRule = (ruleId = 'rule-1', enabled = false): QueryCreateSchema => ({
  name: 'Simple Rule Query',
  description: 'Simple Rule Query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index: ['auditbeat-*'],
  type: 'query',
  query: 'user.name: root or user.name: admin',
});
