/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/detection_engine/rule_schema';

export const getRuleForSignalTestingWithTimestampOverride = (
  index: string[],
  ruleId = 'rule-1',
  enabled = true,
  timestampOverride = 'event.ingested'
): QueryRuleCreateProps => ({
  name: 'Signal Testing Query',
  description: 'Tests a simple query',
  enabled,
  risk_score: 1,
  rule_id: ruleId,
  severity: 'high',
  index,
  type: 'query',
  query: '*:*',
  timestamp_override: timestampOverride,
  from: '1900-01-01T00:00:00.000Z',
});
