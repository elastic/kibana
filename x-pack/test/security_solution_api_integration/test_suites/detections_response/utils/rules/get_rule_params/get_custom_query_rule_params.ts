/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { CreateRulePropsRewrites } from './types';

/**
 * Returns custom query rule params that is easy for most basic testing of output of alerts.
 * It starts out in an disabled state. The 'from' is set very far back to test the basics of signal
 * creation and testing by getting all the signals at once.
 *
 * @param rewrites rule params rewrites, see QueryRuleCreateProps for possible fields
 */
export function getCustomQueryRuleParams(
  rewrites?: CreateRulePropsRewrites<QueryRuleCreateProps>
): QueryRuleCreateProps {
  return {
    type: 'query',
    query: '*:*',
    name: 'Custom query rule',
    description: 'Custom query rule description',
    risk_score: 1,
    rule_id: 'rule-1',
    severity: 'high',
    index: ['logs-*'],
    interval: '100m',
    from: 'now-6m',
    enabled: false,
    setup: '# some setup markdown',
    ...rewrites,
  };
}
