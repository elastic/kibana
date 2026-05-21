/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatMatchRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { CreateRulePropsRewrites } from './types';

export function getThreatMatchRuleParams(
  rewrites?: CreateRulePropsRewrites<ThreatMatchRuleCreateProps>
): ThreatMatchRuleCreateProps {
  return {
    type: 'threat_match',
    threat_query: '*:*',
    query: '*:*',
    threat_mapping: [
      {
        entries: [
          {
            field: 'host.name',
            type: 'mapping',
            value: 'host.name',
            negate: false,
          },
        ],
      },
    ],
    name: 'Threshold Rule',
    description: 'Threshold Rule description',
    severity: 'high',
    risk_score: 17,
    threat_index: ['logs_ti*'],
    index: ['logs-*'],
    interval: '100m',
    from: 'now-50000h',
    ...rewrites,
  };
}
