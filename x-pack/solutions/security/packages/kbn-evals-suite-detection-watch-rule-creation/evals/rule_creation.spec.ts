/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';
import type { HttpHandler } from '@kbn/core/public';
import type { ToolingLog } from '@kbn/tooling-log';
import type { Client as EsClient } from '@elastic/elasticsearch';
import type { RuleCreationClient } from '../src/rule_creation_client';
import { armTraceEvaluators } from '../src/evaluators/tool_routing';
import { evaluate, tags } from '../src/evaluate';
import { createEvaluateDataset } from '../src/evaluators/dataset_evaluator';
import { createCanaryEvaluator } from '../src/evaluators/canary_evaluator';
import {
  assertDraftRanOnModel,
  assertWorkflowInstalled,
  bindModelUnderTest,
  ensureJudgeConnectorAccessible,
} from '../src/workflow_fixture';
import { goldenDataset } from '../datasets/golden';
import { hardCases } from '../datasets/hard_cases';
import { canaryDataset } from '../datasets/canary';

// Winnable gaps tried in order; the first the quality gate does not decline carries the probe.
const REACHABILITY_PROBE_INPUTS = [
  {
    technique: 'T1078.001',
    gap_description:
      'No rule covering repeated failed sudo authentication from a single Linux host.',
    evidence:
      'Hunt found 40+ sudo auth failures for one account on linux-web-01 within 10 minutes.',
    confidence: 0.9,
  },
  {
    technique: 'T1548.002',
    gap_description:
      'No rule for UAC bypass via Windows Firewall MMC snap-in hijack. ' +
      'Attackers use this to elevate privileges without a UAC prompt.',
    evidence:
      'Red team exercise reproduced the technique: mmc.exe spawning unexpected child processes ' +
      'when launched with WF.msc argument on Windows hosts.',
    confidence: 0.9,
  },
];

evaluate.describe('Rule Creation Worker', { tag: tags.serverless.security.complete }, () => {
  let restoreModelBinding: (() => Promise<void>) | undefined;

  evaluate.afterAll(async ({ log }: { log: ToolingLog }) => {
    await restoreModelBinding?.().catch((error: Error) =>
      log.warning(`Could not restore inference feature settings: ${error.message}`)
    );
  });

  evaluate.beforeAll(
    async ({
      fetch,
      connector,
      log,
      ruleCreationClient,
      traceEsClient,
    }: {
      fetch: HttpHandler;
      connector: EvalConnector;
      log: ToolingLog;
      ruleCreationClient: RuleCreationClient;
      traceEsClient: EsClient;
    }) => {
      await ensureJudgeConnectorAccessible({ fetch, connector, log });
      await assertWorkflowInstalled({ fetch, log });
      restoreModelBinding = await bindModelUnderTest({ fetch, connector, log });

      // Trace reachability assertion. A run whose executions carry no traceId — or whose
      // agent tool spans never reach the tracing cluster — silently degrades every
      // trace-based evaluator (Tool Routing, Trajectory: *) to N/A, and N/A is not a failure, so the suite
      // would still report a pass. Probe once here and fail setup loudly instead.
      //
      // The probe input must be WINNABLE: a vague probe can be correctly declined, produce no
      // tool call, and prove nothing about tracing. Verified 2026-08-31: an earlier
      // low-confidence probe passed on an execution that produced no rule at all.
      //
      // A probe the quality gate declines proves nothing about tracing, so armTraceEvaluators
      // re-probes with the next winnable gap and throws if every one is declined — it never
      // reports the evaluators armed on a skipped probe.
      const probe = await armTraceEvaluators({
        inputs: REACHABILITY_PROBE_INPUTS,
        traceEsClient,
        log,
        runProbe: async (input) => {
          const run = await ruleCreationClient.run({ input });
          // Every score below is attributed to `connector`; prove the draft ran on it.
          assertDraftRanOnModel({ connectorId: run.connectorId, expected: connector.id });
          if (!run.traceId) {
            throw new Error(
              'Workflow execution carried no traceId — trace-based evaluators (Tool Routing, Trajectory: *) would ' +
                'silently score N/A and the suite would report a false pass. This stack is not ' +
                'persisting OTEL trace ids (see #284701); fix the stack, not the suite.'
            );
          }
          if (!run.rule && !run.skipped) {
            throw new Error(
              'TraceId probe produced neither a rule nor an explicit skip on a winnable gap. The ' +
                'draft agent step is failing, so no tool spans exist to trace and every trace-based ' +
                'evaluator would score N/A on a broken run.'
            );
          }
          return run;
        },
      });
      log.info(`trace reachability verified (${probe.traceId}) — trace-based evaluators armed`);
    }
  );

  evaluate(
    'generates a valid ES|QL detection rule for the stated gap',
    async ({
      executorClient,
      evaluators,
      ruleCreationClient,
      esClient,
      traceEsClient,
      log,
      evaluationConnector,
    }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        traceEsClient,
        log,
        // Judge provenance: stamped into every Gap Addressed score document so a
        // self-judging model (judge connector == subject connector) is visible
        // in the data, not inferred later.
        judgeProvenance: {
          judgeConnectorId: evaluationConnector.id,
          judgeConnectorName: evaluationConnector.name,
        },
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
    async ({
      executorClient,
      evaluators,
      ruleCreationClient,
      esClient,
      traceEsClient,
      log,
      evaluationConnector,
    }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        traceEsClient,
        log,
        // Judge provenance: stamped into every Gap Addressed score document so a
        // self-judging model (judge connector == subject connector) is visible
        // in the data, not inferred later.
        judgeProvenance: {
          judgeConnectorId: evaluationConnector.id,
          judgeConnectorName: evaluationConnector.name,
        },
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
    async ({
      executorClient,
      evaluators,
      ruleCreationClient,
      esClient,
      traceEsClient,
      log,
      evaluationConnector,
    }) => {
      const evaluateDataset = createEvaluateDataset({
        ruleCreationClient,
        evaluators,
        executorClient,
        esClient,
        traceEsClient,
        log,
        // Judge provenance: stamped into every Gap Addressed score document so a
        // self-judging model (judge connector == subject connector) is visible
        // in the data, not inferred later.
        judgeProvenance: {
          judgeConnectorId: evaluationConnector.id,
          judgeConnectorName: evaluationConnector.name,
        },
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
