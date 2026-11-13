/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import type { DefaultEvaluators } from '@kbn/evals';
import { createAttackDiscoveryBasicEvaluator } from '@kbn/evals-suite-attack-discovery/src/evaluators/attack_discovery_basic_evaluator';
import { createAttackDiscoveryCriteriaEvaluator } from '@kbn/evals-suite-attack-discovery/src/evaluators/attack_discovery_criteria_evaluator';
import { createAttackDiscoveryRubricEvaluator } from '@kbn/evals-suite-attack-discovery/src/evaluators/attack_discovery_rubric_evaluator';
import {
  CHRYSALIS_AD_DATASET_NAME,
  createChrysalisAdExperimentEvaluators,
} from './attack_discovery_experiment';
import { AD_FAILURE_CLASS_EVALUATOR_NAME } from './evaluators/ad_failure_class_evaluator';
import { CHAIN_COVERAGE_EVALUATOR_NAME } from './evaluators/chain_coverage_evaluator';

const traceStub = (name: string) => ({ name, kind: 'CODE', evaluate: jest.fn() });

const evaluators = {
  traceBasedEvaluators: {
    inputTokens: traceStub('Input Tokens'),
    outputTokens: traceStub('Output Tokens'),
    cachedTokens: traceStub('Cached Tokens'),
    toolCalls: traceStub('Tool Calls'),
    latency: traceStub('Latency'),
  },
  criteria: jest.fn(),
} as unknown as DefaultEvaluators;
const log = { info: jest.fn() } as unknown as ToolingLog;
const evaluationInferenceClient = {} as Parameters<
  typeof createChrysalisAdExperimentEvaluators
>[0]['evaluationInferenceClient'];

describe('Chrysalis AD experiment', () => {
  it('keeps the dataset name the matrix reports under', () => {
    expect(CHRYSALIS_AD_DATASET_NAME).toBe('Attack Discovery Chrysalis kill-chains (generate API)');
  });

  it('runs the original attack-discovery evaluators plus ChainCoverage and AD Failure Class', () => {
    const names = createChrysalisAdExperimentEvaluators({
      evaluators,
      evaluationInferenceClient,
      log,
    }).map(({ name }) => name);

    const originalAdNames = [
      createAttackDiscoveryBasicEvaluator().name,
      createAttackDiscoveryCriteriaEvaluator({ evaluators }).name,
      createAttackDiscoveryRubricEvaluator({ inferenceClient: evaluationInferenceClient, log })
        .name,
      'Tool Calls',
      'Latency',
      'Input Tokens',
      'Output Tokens',
      'Cached Tokens',
    ];
    expect(names).toEqual([
      ...originalAdNames,
      CHAIN_COVERAGE_EVALUATOR_NAME,
      AD_FAILURE_CLASS_EVALUATOR_NAME,
    ]);
    expect(names.slice(0, 3)).toEqual([
      'AttackDiscoveryBasic',
      'Criteria',
      'AttackDiscoveryRubric',
    ]);
  });
});
