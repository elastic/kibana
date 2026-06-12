/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { CreateRulePropsRewrites } from './types';

/**
 * Returns EQL rule params suitable for basic detection tests.
 *
 * @param rewrites rule params rewrites, see EqlRuleCreateProps for possible fields
 */
export function getEqlRuleParams(
  rewrites?: CreateRulePropsRewrites<EqlRuleCreateProps>
): EqlRuleCreateProps {
  return {
    type: 'eql',
    language: 'eql',
    query: 'any where true',
    name: 'EQL rule',
    description: 'EQL rule description',
    risk_score: 1,
    severity: 'high',
    index: ['logs-*'],
    rule_id: 'rule-1',
    interval: '100m',
    from: 'now-6m',
    enabled: false,
    ...rewrites,
  };
}
