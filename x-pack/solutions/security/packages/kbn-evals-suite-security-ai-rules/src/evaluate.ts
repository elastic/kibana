/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Phoenix executor is omitted intentionally — this suite runs against a local
// Kibana instance, not an external Phoenix/Arize tracing endpoint.
import type { BoundInferenceClient } from '@kbn/inference-common';
import type { ReportDisplayOptions } from '@kbn/evals';
import { evaluate as base } from '@kbn/evals';
import { SecurityRuleGenerationClient } from './chat_client';

export const evaluate = base.extend<
  {},
  {
    chatClient: SecurityRuleGenerationClient;
    evaluationInferenceClient: BoundInferenceClient;
  }
>({
  chatClient: [
    async ({ fetch, log, connector }, use) => {
      await use(new SecurityRuleGenerationClient(fetch, log, connector.id));
    },
    {
      scope: 'worker',
    },
  ],
  evaluationInferenceClient: [
    async ({ inferenceClient, evaluationConnector }, use) => {
      await use(inferenceClient.bindTo({ connectorId: evaluationConnector.id }));
    },
    {
      scope: 'worker',
    },
  ],
  reportDisplayOptions: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use) => {
      const options: ReportDisplayOptions = {
        evaluatorDisplayOptions: new Map([
          ['Query Syntax Validity', { statsToInclude: ['mean'] }],
          ['Field Coverage', { statsToInclude: ['mean'] }],
          ['Rule Type & Language', { statsToInclude: ['mean'] }],
          ['MITRE Accuracy', { statsToInclude: ['mean', 'median'] }],
          ['Severity Validity', { statsToInclude: ['mean'] }],
          ['Risk Score Validity', { statsToInclude: ['mean'] }],
          ['Interval Format', { statsToInclude: ['mean'] }],
          ['Lookback Gap', { statsToInclude: ['mean'] }],
          ['Severity Match', { statsToInclude: ['mean'] }],
          ['Risk Score Match', { statsToInclude: ['mean', 'median'] }],
          ['ES|QL Functional Equivalence', { statsToInclude: ['mean'] }],
          ['Rejection', { statsToInclude: ['mean'] }],
        ]),
        evaluatorDisplayGroups: [
          {
            evaluatorNames: [
              'Query Syntax Validity',
              'Rule Type & Language',
              'Severity Validity',
              'Risk Score Validity',
              'Interval Format',
              'Lookback Gap',
            ],
            combinedColumnName: 'Structural Validity',
          },
          {
            evaluatorNames: ['MITRE Accuracy', 'Severity Match', 'Risk Score Match'],
            combinedColumnName: 'Reference Match',
          },
        ],
      };
      await use(options);
    },
    { scope: 'worker' },
  ],
});
