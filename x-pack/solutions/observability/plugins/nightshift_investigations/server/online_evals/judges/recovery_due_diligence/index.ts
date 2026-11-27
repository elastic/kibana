/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegisteredEvaluatorDefinition } from '@kbn/evals-plugin/server';
import { recoveryCausalChecklistJudge } from './causal_checklist';
import { recoveryEvidenceFamiliesJudge } from './evidence_families';
import { recoveryRootCauseEvidenceJudge } from './root_cause_evidence';

/** Reference-free judges of the alert-recovery round itself: how thoroughly it analysed the recovery. */
export const recoveryDueDiligenceJudges: readonly RegisteredEvaluatorDefinition[] = [
  recoveryCausalChecklistJudge,
  recoveryRootCauseEvidenceJudge,
  recoveryEvidenceFamiliesJudge,
];
