/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { evaluate } from '../../src/evaluate';
import { attackDiscoveryScenariosDataset } from '../../datasets';
import type { AttackDiscoveryExampleInputWithOverrides } from '../../src/clients';

/**
 * Criteria for evaluating Attack Discovery responses
 * Based on evaluators/attack_discovery_eval.md
 */
const ATTACK_DISCOVERY_CRITERIA = [
  'Is the submission non-empty and does it contain attack discovery insights?',
  'Does each attack discovery have a title that accurately describes the security incident or threat?',
  'Does each attack discovery have a summaryMarkdown that provides a coherent explanation of what happened?',
  'Does each attack discovery have an entitySummaryMarkdown that identifies the affected entities (hosts, users, etc.)?',
  'Are alert IDs properly associated with the discoveries they belong to?',
  'Is the analysis actionable - does it help a security analyst understand the threat and potential remediation steps?',
  'If expected insights are provided in the reference, does the submission capture similar attack patterns or security events?',
];

evaluate.describe('Attack Discovery', { tag: '@svlSecurity' }, () => {
  evaluate('all scenarios', async ({ evaluateAttackDiscoveryDataset }) => {
    await evaluateAttackDiscoveryDataset({
      dataset: {
        name: attackDiscoveryScenariosDataset.name,
        description: attackDiscoveryScenariosDataset.description,
        examples: attackDiscoveryScenariosDataset.examples.map((example) => ({
          input: example.input as AttackDiscoveryExampleInputWithOverrides,
          output: {
            reference: example.output.reference,
            criteria: ATTACK_DISCOVERY_CRITERIA,
            expectedInsights: example.output.expectedInsights,
          },
          metadata: example.metadata ?? {},
        })),
      },
      // Default alerts index pattern - can be overridden per test
      alertsIndexPattern: '.alerts-security.alerts-default',
      size: 100,
    });
  });
});
