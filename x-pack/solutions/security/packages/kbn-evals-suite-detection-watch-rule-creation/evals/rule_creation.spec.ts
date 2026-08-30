/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AvailableConnectorWithId } from '@kbn/gen-ai-functional-testing';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { RuleCreationClient } from '../src/rule_creation_client';
import { evaluate, tags } from '../src/evaluate';
import { createEvaluateDataset } from '../src/evaluators/dataset_evaluator';
import { createCanaryEvaluator } from '../src/evaluators/canary_evaluator';
import { assertWorkflowInstalled, ensureJudgeConnectorAccessible } from '../src/workflow_fixture';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';
import { canaryDataset } from '../datasets/canary';

evaluate.describe('Rule Creation Worker', { tag: tags.serverless.security.complete }, () => {
  evaluate.beforeAll(
    async ({
      fetch,
      connector,
      log,
      ruleCreationClient,
    }: {
      fetch: HttpHandler;
      connector: AvailableConnectorWithId;
      log: ToolingLog;
      ruleCreationClient: RuleCreationClient;
    }) => {
      await ensureJudgeConnectorAccessible({ fetch, connector, log });
      await assertWorkflowInstalled({ fetch, log });

      // TraceId presence assertion: a run whose executions carry no traceId silently
      // degrades every trace-based evaluator (Tool Routing) to N/A — and N/A is not
      // a failure, so the suite would still report a pass. Probe once here and fail
      // setup loudly instead. See #284701 for the EDOT fallback this depends on.
      const probe = await ruleCreationClient.run({
        input: {
          technique: 'T1078.001',
          gap_description: 'TraceId presence probe — deterministic minimal gap for setup.',
          evidence: 'None; this run exists to assert executions persist a traceId.',
          confidence: 0.1,
        },
      });
      if (!probe.traceId) {
        throw new Error(
          'Workflow execution carried no traceId — trace-based evaluators (Tool Routing) would ' +
            'silently score N/A and the suite would report a false pass. This stack is not ' +
            'persisting OTEL trace ids (see #284701); fix the stack, not the suite.'
        );
      }
      log.info(`traceId presence verified (${probe.traceId}) — trace-based evaluators armed`);
    }
  );

  evaluate(
    'generates a valid ES|QL detection rule for the stated gap',
    async ({ executorClient, evaluators, ruleCreationClient, esClient, traceEsClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        traceEsClient,
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
    async ({ executorClient, evaluators, ruleCreationClient, esClient, traceEsClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        traceEsClient,
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
    async ({ executorClient, evaluators, ruleCreationClient, esClient, traceEsClient, log }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        traceEsClient,
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
