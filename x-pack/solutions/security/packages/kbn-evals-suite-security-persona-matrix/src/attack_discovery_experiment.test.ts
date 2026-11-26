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
import { AD_AXES_RUBRIC_EVALUATOR_NAME } from './evaluators/ad_axes_rubric_evaluator';
import { PERSONA_RUBRIC_JUDGE_ENV } from './evaluators/persona_rubric_evaluator';
import { AD_FAILURE_CLASS_EVALUATOR_NAME } from './evaluators/ad_failure_class_evaluator';
import { CHAIN_COVERAGE_EVALUATOR_NAME } from './evaluators/chain_coverage_evaluator';

const traceStub = (name: string) => ({ name, kind: 'CODE', evaluate: jest.fn() });

const judgeGetModel = jest.fn();
const evaluators = {
  traceBasedEvaluators: {
    inputTokens: traceStub('Input Tokens'),
    outputTokens: traceStub('Output Tokens'),
    cachedTokens: traceStub('Cached Tokens'),
    toolCalls: traceStub('Tool Calls'),
    latency: traceStub('Latency'),
  },
  criteria: jest.fn(() => ({ getModel: judgeGetModel })),
} as unknown as DefaultEvaluators;
const log = { info: jest.fn() } as unknown as ToolingLog;
const evaluationInferenceClient = {} as Parameters<
  typeof createChrysalisAdExperimentEvaluators
>[0]['evaluationInferenceClient'];

describe('Chrysalis AD experiment', () => {
  const originalFlag = process.env[PERSONA_RUBRIC_JUDGE_ENV];

  // The exact-list assertion below must not depend on the operator's shell.
  beforeEach(() => {
    delete process.env[PERSONA_RUBRIC_JUDGE_ENV];
  });

  afterEach(() => {
    if (originalFlag === undefined) {
      delete process.env[PERSONA_RUBRIC_JUDGE_ENV];
    } else {
      process.env[PERSONA_RUBRIC_JUDGE_ENV] = originalFlag;
    }
  });

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

  describe('AD axes judge flag', () => {
    const original = process.env[PERSONA_RUBRIC_JUDGE_ENV];
    const namesWithFlag = (value: string | undefined) => {
      if (value === undefined) {
        delete process.env[PERSONA_RUBRIC_JUDGE_ENV];
      } else {
        process.env[PERSONA_RUBRIC_JUDGE_ENV] = value;
      }
      return createChrysalisAdExperimentEvaluators({
        evaluators,
        evaluationInferenceClient,
        log,
      }).map(({ name }) => name);
    };

    afterEach(() => {
      if (original === undefined) {
        delete process.env[PERSONA_RUBRIC_JUDGE_ENV];
      } else {
        process.env[PERSONA_RUBRIC_JUDGE_ENV] = original;
      }
    });

    it('does not register the axes judge when the flag is off', () => {
      expect(namesWithFlag(undefined)).not.toContain(AD_AXES_RUBRIC_EVALUATOR_NAME);
      expect(namesWithFlag('0')).not.toContain(AD_AXES_RUBRIC_EVALUATOR_NAME);
    });

    it('registers the axes judge last when the flag is on', () => {
      const names = namesWithFlag('1');
      expect(names[names.length - 1]).toBe(AD_AXES_RUBRIC_EVALUATOR_NAME);
    });

    it('reports the shared judge model through getModel', () => {
      process.env[PERSONA_RUBRIC_JUDGE_ENV] = '1';
      const axes = createChrysalisAdExperimentEvaluators({
        evaluators,
        evaluationInferenceClient,
        log,
      }).find(({ name }) => name === AD_AXES_RUBRIC_EVALUATOR_NAME);
      expect(axes?.getModel).toBe(judgeGetModel);
    });
  });
});
