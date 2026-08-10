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
import { goldenDataset } from '../datasets/rule_creation_golden';
import { hardCases } from '../datasets/hard_cases';

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
      log.info(`Verifying AI connector: ${connector.name} (${connector.id})`);
      try {
        await fetch(`/api/actions/connector/${encodeURIComponent(connector.id)}`, {
          method: 'GET',
        });
        log.info('AI connector is accessible — proceeding with eval run');
      } catch (err) {
        throw new Error(
          `AI connector "${connector.name}" (${connector.id}) is not accessible. ` +
            `Ensure it is configured and enabled in Stack Management > Connectors ` +
            `before running this eval suite. ` +
            `Original error: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  );

  evaluate(
    'generates a valid ES|QL detection rule for the stated gap',
    async ({ executorClient, evaluators, ruleCreationClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
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
    async ({ executorClient, evaluators, ruleCreationClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
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
});
