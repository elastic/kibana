/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NewTermsRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import type { CreateRulePropsRewrites } from './types';

/**
 * Returns New Terms rule params suitable for basic detection tests.
 *
 * @param rewrites rule params rewrites, see NewTermsRuleCreateProps for possible fields
 */
export function getNewTermsRuleParams(
  rewrites?: CreateRulePropsRewrites<NewTermsRuleCreateProps>
): NewTermsRuleCreateProps {
  return {
    type: 'new_terms',
    new_terms_fields: ['user.name'],
    history_window_start: 'now-7d',
    index: ['logs-*'],
    query: '*:*',
    name: 'New Terms rule',
    description: 'New Terms rule description',
    severity: 'high',
    max_signals: 100,
    risk_score: 55,
    language: 'kuery',
    interval: '5m',
    from: 'now-6m',
    ...rewrites,
  };
}
