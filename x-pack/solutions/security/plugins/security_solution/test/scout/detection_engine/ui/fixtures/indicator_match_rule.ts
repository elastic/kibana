/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatMatchRule } from '@kbn/scout-security';

export const INDICATOR_MATCH_INDEX_FIELD = 'myhash.mysha256';
export const INDICATOR_MATCH_INDICATOR_FIELD = 'threat.indicator.file.hash.sha256';
export const MATCHING_INDICATOR_ATOMIC =
  'a04ac6d98ad989312783d4fe3456c53730b212c79a426fb215708b6c6daa3de3';

/** An Indicator match rule whose source event matches the document of the `threat_indicator` archive. */
export const getIndicatorMatchRule = (
  overrides: Partial<ThreatMatchRule> = {}
): ThreatMatchRule => ({
  name: 'Threat Indicator Rule Test',
  description: 'The threat indicator rule description.',
  enabled: false,
  risk_score: 20,
  rule_id: 'indicator-match-rule',
  severity: 'critical',
  type: 'threat_match',
  query: '*:*',
  index: ['auditbeat-suspicious-*'],
  threat_index: ['filebeat-*'],
  threat_query: '*:*',
  threat_mapping: [
    {
      entries: [
        {
          field: INDICATOR_MATCH_INDEX_FIELD,
          value: INDICATOR_MATCH_INDICATOR_FIELD,
          type: 'mapping',
        },
      ],
    },
  ],
  threat_indicator_path: 'threat.indicator',
  interval: '100m',
  from: '2000-01-01T00:00:00.000Z',
  timeline_id: '495ad7a7-316e-4544-8a0f-9c098daee76e',
  timeline_title: 'Generic Threat Match Timeline',
  ...overrides,
});
