/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { DETECTION_ENGINE_RULES_URL } from '../../../../../common/constants';

export interface DeployEsqlRuleInput {
  name: string;
  description: string;
  query: string;
  severity: string;
  riskScore: number;
  tags?: string[];
}

export interface DeployEsqlRuleResult {
  ruleId: string;
  ruleName: string;
}

/**
 * Creates a disabled Detection Engine ES|QL rule from a hunt finding proposal.
 */
export const deployEsqlRule = async (
  http: CoreStart['http'],
  input: DeployEsqlRuleInput
): Promise<DeployEsqlRuleResult> => {
  const severity = ['low', 'medium', 'high', 'critical'].includes(input.severity)
    ? input.severity
    : 'medium';

  const body = {
    name: input.name,
    description: input.description,
    risk_score: input.riskScore,
    severity,
    type: 'esql',
    language: 'esql',
    query: input.query,
    enabled: false,
    interval: '5m',
    from: 'now-6m',
    to: 'now',
    tags: input.tags ?? ['threat-intel'],
    author: ['Threat Intelligence'],
    license: '',
    false_positives: [],
    references: [],
    threat: [],
    max_signals: 100,
  };

  const response = await http.post<{ id: string; name: string }>(DETECTION_ENGINE_RULES_URL, {
    body: JSON.stringify(body),
    version: '2023-10-31',
  });

  return {
    ruleId: response.id,
    ruleName: response.name,
  };
};
