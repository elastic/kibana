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
import { createAdAxesRubricEvaluator } from './evaluators/ad_axes_rubric_evaluator';
import { createChainCoverageEvaluator } from './evaluators/chain_coverage_evaluator';
import { isPersonaRubricJudgeEnabled } from './evaluators/persona_rubric_evaluator';

// Derived from the AD suite's rubric evaluator so this stays whatever client type it accepts.
type EvaluationInferenceClient = Parameters<
  typeof createAttackDiscoveryRubricEvaluator
>[0]['inferenceClient'];

/**
 * `@kbn/evals-suite-attack-discovery` exports no dataset or experiment name
 * constants (its names are inline literals), so this suite owns the one dataset
 * name it reports under.
 */
export const CHRYSALIS_AD_DATASET_NAME = 'Attack Discovery Chrysalis kill-chains (generate API)';

/** `criteria()` is the only handle on the shared judge model; this criterion is never scored. */
const AD_AXES_MODEL_PROBE_CRITERION = 'Accuracy: The output is technically correct.';

/**
 * Mirrors the attack-discovery suite's own experiment configuration
 * (`configureExperiment` in its `evaluate_dataset.ts`) so the original evaluator
 * names are unchanged; the two deterministic evaluators are appended, plus the
 * opt-in four-axis LLM judge when `PERSONA_MATRIX_RUBRIC_JUDGE=1`.
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
    ...(isPersonaRubricJudgeEnabled()
      ? [
          createAdAxesRubricEvaluator({
            inferenceClient: evaluationInferenceClient,
            log,
            // Report the judge's model the same way the criteria judge does.
            getModel: evaluators.criteria([AD_AXES_MODEL_PROBE_CRITERION]).getModel,
          }),
        ]
      : []),
  ];
};
