/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildWorkerRows } from '../datasets/worker_rows';
import { SCENARIOS_ENV, COHORT_ENV } from '../src/constants';
import { evaluate, tags } from '../src/evaluate';
import { createEvaluateDataset } from '../src/evaluators/dataset_evaluator';
import { parseCohort } from '../src/cohort_routing';
import { selectScenarios } from '../src/select_scenarios';

/**
 * One row per audit scenario, through review: alerts retrieved, discoveries persisted,
 * fingerprints matched and dispatched, one review per unmatched attack, the Investigation
 * opened, the verdict against gold, true-positive and inconclusive verdicts parked at the
 * analyst gate, and the worker outcome reported. The cohort (`AD_WORKER_EVAL_COHORT`) decides
 * which stage runs the model under test.
 */
evaluate.describe('Attack Discovery Worker', { tag: tags.stateful.classic }, () => {
  evaluate(
    'scores every scenario through review',
    async ({
      adWorkerClient,
      adWorkerPreflight,
      evaluators,
      executorClient,
      esClient,
      fetch,
      inferenceClient,
      log,
      evaluationConnector,
    }) => {
      const { routing, floorWorkflowId } = adWorkerPreflight;
      // parseCohort re-reads AD_WORKER_EVAL_COHORT here so an unsupported value fails fast
      // (it throws) and the planned routing is checked against what was asked for.
      if (routing.cohort !== parseCohort(process.env[COHORT_ENV])) {
        throw new Error(
          `Cohort routing planned "${routing.cohort}" but expected the requested one`
        );
      }
      const evaluateDataset = createEvaluateDataset({
        client: adWorkerClient,
        evaluators,
        executorClient,
        esClient,
        fetch,
        inferenceClient,
        log,
        routing,
        floorWorkflowId,
        judge: {
          judgeConnectorId: evaluationConnector.id,
          judgeConnectorName: evaluationConnector.name,
        },
      });
      const examples = selectScenarios({
        rows: buildWorkerRows(routing),
        only: process.env[SCENARIOS_ENV],
        envName: SCENARIOS_ENV,
      });
      await evaluateDataset({
        dataset: {
          name: `attack-discovery-worker: ${routing.cohort}`,
          description: `Attack Discovery Worker through review, cohort ${routing.cohort}`,
          examples,
        },
      });
    }
  );
});
