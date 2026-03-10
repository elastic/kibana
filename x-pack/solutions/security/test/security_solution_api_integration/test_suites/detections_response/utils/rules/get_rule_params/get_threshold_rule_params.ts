/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThresholdRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { CreateRulePropsRewrites } from './types';

export function getThresholdRuleParams(
  rewrites?: CreateRulePropsRewrites<ThresholdRuleCreateProps>
): ThresholdRuleCreateProps {
  return {
    type: 'threshold',
    query: '*:*',
    threshold: {
      field: [],
      value: 1,
    },
    name: 'Threshold Rule',
    description: 'Threshold Rule description',
    severity: 'high',
    risk_score: 17,
    index: ['logs-*'],
    interval: '100m',
    from: 'now-50000h',
    ...rewrites,
  };
}
