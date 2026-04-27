/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsqlRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { CreateRulePropsRewrites } from './types';

/**
 * Returns ES|QL rule params suitable for basic detection tests.
 *
 * @param rewrites rule params rewrites, see EsqlRuleCreateProps for possible fields
 */
export function getEsqlRuleParams(
  rewrites?: CreateRulePropsRewrites<EsqlRuleCreateProps>
): EsqlRuleCreateProps {
  return {
    type: 'esql',
    language: 'esql',
    query: 'from logs-* | limit 0',
    name: 'ES|QL rule',
    description: 'ES|QL rule description',
    severity: 'high',
    risk_score: 55,
    max_signals: 100,
    rule_id: 'rule-1',
    interval: '5m',
    from: 'now-6m',
    enabled: false,
    ...rewrites,
  };
}
