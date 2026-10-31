/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { conclusionQualityJudge } from './conclusion_quality';
import { investigationProcessJudge } from './investigation_process';
import {
  MEMORY_READ_JUDGE_VERSION,
  memoryReadJudge,
  memoryReadJudgeReferenceDataSchema,
  READ_JUDGE_EVALUATOR_NAME,
  type MemoryReadJudgeReferenceData,
} from './memory_read';
import {
  MEMORY_WRITE_JUDGE_VERSION,
  memoryWriteJudge,
  memoryWriteJudgeReferenceDataSchema,
  WRITE_JUDGE_EVALUATOR_NAME,
  type MemoryWriteJudgeReferenceData,
} from './memory_write';
import { rcaRewardJudge } from './rca_reward';

export {
  MEMORY_READ_JUDGE_VERSION,
  MEMORY_WRITE_JUDGE_VERSION,
  memoryReadJudge,
  memoryReadJudgeReferenceDataSchema,
  memoryWriteJudge,
  memoryWriteJudgeReferenceDataSchema,
  READ_JUDGE_EVALUATOR_NAME,
  WRITE_JUDGE_EVALUATOR_NAME,
  type MemoryReadJudgeReferenceData,
  type MemoryWriteJudgeReferenceData,
};

/** The reference-free judges ported from Deductive's `judge_rca_scores`. */
export const referenceFreeJudges: readonly RegisteredEvaluatorDefinition[] = [
  rcaRewardJudge,
  investigationProcessJudge,
  conclusionQualityJudge,
];

/** The memory read and write evaluators scored at the end of `agent_optimize`. */
export const memoryJudges: readonly RegisteredEvaluatorDefinition[] = [
  memoryReadJudge as RegisteredEvaluatorDefinition,
  memoryWriteJudge as RegisteredEvaluatorDefinition,
];

/** All online eval judges Nightshift registers with the evals plugin. */
export const onlineEvalJudges: readonly RegisteredEvaluatorDefinition[] = [
  ...referenceFreeJudges,
  ...memoryJudges,
];
