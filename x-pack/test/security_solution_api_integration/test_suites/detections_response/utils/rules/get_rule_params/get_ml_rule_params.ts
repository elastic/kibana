/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MachineLearningRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { CreateRulePropsRewrites } from './types';

export function getMLRuleParams(
  rewrites?: CreateRulePropsRewrites<MachineLearningRuleCreateProps>
): MachineLearningRuleCreateProps {
  return {
    type: 'machine_learning',
    machine_learning_job_id: ['some_job_id'],
    name: 'ML Rule',
    description: 'Machine Learning Rule',
    anomaly_threshold: 44,
    risk_score: 1,
    rule_id: 'ml-rule-1',
    severity: 'high',
    enabled: false,
    ...rewrites,
  };
}
