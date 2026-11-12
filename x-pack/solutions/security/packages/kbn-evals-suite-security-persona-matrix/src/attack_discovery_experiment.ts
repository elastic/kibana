/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { DefaultEvaluators, Evaluator, TaskOutput } from '@kbn/evals';
import { createAttackDiscoveryBasicEvaluator } from '@kbn/evals-suite-attack-discovery/src/evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryCriteriaEvaluator } from '@kbn/evals-suite-attack-discovery/src/evaluators/attack_discovery_criteria_evaluator';
import { createAttackDiscoveryRubricEvaluator } from '@kbn/evals-suite-attack-discovery/src/evaluators/attack_discovery_rubric_evaluator';
import type {
  AttackDiscoveryDatasetExample,
  AttackDiscoveryTaskOutput,
} from '@kbn/evals-suite-attack-discovery/src/types';
import { createAdFailureClassEvaluator } from './evaluators/ad_failure_class_evaluator';
import { createChainCoverageEvaluator } from './evaluators/chain_coverage_evaluator';

// Derived from the rubric evaluator so this package needs no direct inference dependency.
type EvaluationInferenceClient = Parameters<
  typeof createAttackDiscoveryRubricEvaluator
>[0]['inferenceClient'];

/**
 * `@kbn/evals-suite-attack-discovery` exports no dataset or experiment name
 * constants (its names are inline literals), so this suite owns the one dataset
 * name it reports under.
 */
export const CHRYSALIS_AD_DATASET_NAME = 'Attack Discovery Chrysalis kill-chains (generate API)';

/**
 * Mirrors the attack-discovery suite's own experiment configuration
 * (`configureExperiment` in its `evaluate_dataset.ts`) so the original evaluator
 * names are unchanged; the two deterministic evaluators are appended.
 */
export const createChrysalisAdExperimentEvaluators = ({
  evaluators,
  evaluationInferenceClient,
  log,
}: {
  evaluators: DefaultEvaluators;
  evaluationInferenceClient: EvaluationInferenceClient;
  log: ToolingLog;
}): Array<Evaluator<AttackDiscoveryDatasetExample, AttackDiscoveryTaskOutput>> => {
  const { inputTokens, outputTokens, cachedTokens, toolCalls, latency } =
    evaluators.traceBasedEvaluators;

  return [
    createAttackDiscoveryBasicEvaluator(),
    createAttackDiscoveryCriteriaEvaluator({ evaluators }),
    createAttackDiscoveryRubricEvaluator({ inferenceClient: evaluationInferenceClient, log }),
    toolCalls as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
    latency as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
    inputTokens as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
    outputTokens as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
    cachedTokens as Evaluator<AttackDiscoveryDatasetExample, TaskOutput>,
    createChainCoverageEvaluator(),
    createAdFailureClassEvaluator(),
  ];
};
