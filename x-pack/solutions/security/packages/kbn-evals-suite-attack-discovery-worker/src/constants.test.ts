/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import {
  BATCHED_GENERATION_WORKFLOW_ID,
  FP_TP_WORKFLOW_ID,
  REVIEW_WORKFLOW_ID,
  RUNNER_WORKFLOW_ID,
} from './constants';

describe('workflow ids', () => {
  it('match the managed workflow definitions', () => {
    expect(RUNNER_WORKFLOW_ID).toBe(ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID);
    expect(REVIEW_WORKFLOW_ID).toBe(ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID);
    expect(FP_TP_WORKFLOW_ID).toBe(ALERTZERO_ATTACK_DISCOVERY_FP_TP_ANALYSIS_WORKFLOW_ID);
    expect(BATCHED_GENERATION_WORKFLOW_ID).toBe(
      ALERTZERO_ATTACK_DISCOVERY_BATCHED_GENERATION_WORKFLOW_ID
    );
  });
});
