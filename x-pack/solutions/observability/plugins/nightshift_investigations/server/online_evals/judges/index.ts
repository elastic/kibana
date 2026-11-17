/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { alertOutcomeBenignClassificationJudge } from './alert_outcome_benign_classification';
import { alertOutcomeRcaAccuracyJudge } from './alert_outcome_rca_accuracy';
import { alertOutcomeRcaReportingGapJudge } from './alert_outcome_rca_reporting_gap';
import { conclusionQualityJudge } from './conclusion_quality';
import { wikiPageInfluenceJudge } from './wiki_page_influence';
import { wikiPagesReadJudge } from './wiki_pages_read';
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
  alertOutcomeBenignClassificationJudge,
  alertOutcomeRcaReportingGapJudge,
];

/** Judges of how an investigation used the Wiki pages it read. */
export const wikiJudges: readonly RegisteredEvaluatorDefinition[] = [
  wikiPagesReadJudge,
  wikiPageInfluenceJudge,
];
