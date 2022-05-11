/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreatMatchCreateSchema } from '@kbn/security-solution-plugin/common/detection_engine/schemas/request';

/**
 * This is a typical simple indicator match/threat match for testing that is easy for most basic testing
 * @param ruleId
 * @param enabled Enables the rule on creation or not. Defaulted to false.
 */
export const getSimpleThreatMatch = (
  ruleId = 'rule-1',
  enabled = false
): ThreatMatchCreateSchema => ({
  description: 'Detecting root and admin users',
  name: 'Query with a rule id',
  severity: 'high',
  enabled,
  index: ['auditbeat-*'],
  type: 'threat_match',
  risk_score: 55,
  language: 'kuery',
  rule_id: ruleId,
  from: '1900-01-01T00:00:00.000Z',
  query: '*:*',
  threat_query: '*:*',
  threat_index: ['auditbeat-*'],
  threat_mapping: [
    // We match host.name against host.name
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_filters: [],
});
