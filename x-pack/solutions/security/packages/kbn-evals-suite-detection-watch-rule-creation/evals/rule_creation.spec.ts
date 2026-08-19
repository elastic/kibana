/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import { evaluate, tags } from '../src/evaluate';
import { createEvaluateDataset } from '../src/evaluate_dataset';
import { createCanaryEvaluator } from '../src/canary_evaluator';
import { assertWorkflowInstalled, ensureConnectorAccessible } from '../src/workflow_fixture';
import { goldenDataset } from '../datasets/rule_creation_golden';
import { hardCases } from '../datasets/hard_cases';
import { canaryDataset } from '../datasets/canary';

evaluate.describe('Rule Creation Worker', { tag: tags.serverless.security.complete }, () => {
  evaluate.beforeAll(
    async ({
      fetch,
      connector,
      log,
    }: {
      fetch: HttpHandler;
      connector: AvailableConnectorWithId;
      log: ToolingLog;
    }) => {
      await ensureConnectorAccessible({ fetch, connector, log });
      await assertWorkflowInstalled({ fetch, log });
    }
  );

  evaluate(
    'generates a valid ES|QL detection rule for the stated gap',
    async ({ executorClient, evaluators, ruleCreationClient, esClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        log,
      });

      await evaluateDataset({
        dataset: {
          name: 'detection-watch-rule-creation: golden',
          description:
            'Evaluates the Rule Creation Worker against known detection gaps with ground-truth MITRE mappings',
          examples: goldenDataset,
        },
      });
    }
  );

  evaluate(
    'handles complex and multi-technique detection gaps',
    async ({ executorClient, evaluators, ruleCreationClient, esClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        log,
      });

      await evaluateDataset({
        dataset: {
          name: 'detection-watch-rule-creation: hard-cases',
          description:
            'Complex gaps: supply chain, cloud log tampering, and container administration. ' +
            'Adapted from kbn-evals-suite-security-ai-rules complex_pairs.',
          examples: hardCases,
        },
      });
    }
  );

  evaluate(
    'quality gate trips on a deliberately vague gap (canary)',
    async ({ executorClient, evaluators, ruleCreationClient, esClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        log,
      });

      await evaluateDataset({
        dataset: {
          name: 'detection-watch-rule-creation: canary',
          description:
            'Deliberately unwinnable input scored with an inverted expectation: 1 means the ' +
            'quality gate correctly penalized it, 0 means the gate stopped discriminating.',
          examples: canaryDataset,
        },
        evaluatorOverrides: [createCanaryEvaluator(evaluators)],
      });
    }
  );
});
