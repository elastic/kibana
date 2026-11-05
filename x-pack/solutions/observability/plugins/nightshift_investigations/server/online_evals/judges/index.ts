/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { alertOutcomeRcaAccuracyJudge } from './alert_outcome_rca_accuracy';
import { conclusionQualityJudge } from './conclusion_quality';
import { investigationProcessJudge } from './investigation_process';
import { rcaRewardJudge } from './rca_reward';

/** The reference-free judges ported from Deductive's `judge_rca_scores`. */
export const referenceFreeJudges: readonly RegisteredEvaluatorDefinition[] = [
  rcaRewardJudge,
  investigationProcessJudge,
  conclusionQualityJudge,
];

/** Reference-based judges ported from Deductive's alert-outcome scoring. */
export const alertOutcomeJudges: readonly RegisteredEvaluatorDefinition[] = [
  alertOutcomeRcaAccuracyJudge,
];
