/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID } from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import { CHANGED_STATUS, INVESTIGATION_ID } from './shipped_yaml_contract.test_helpers';

/** A runner run with its generation and fan-out counts. */
export const runnerContext = ({
  batchesFailed,
  batchesTotal,
  generated,
  persisted,
}: {
  batchesFailed: number;
  batchesTotal: number;
  generated: number;
  persisted: number;
}): Record<string, unknown> => ({
  steps: {
    resolve_fanout: { output: { attack_count: persisted } },
    run_generation: {
      output: {
        alerts_analyzed: batchesTotal * 100,
        batches_failed: batchesFailed,
        batches_total: batchesTotal,
        discoveries_generated: generated,
      },
    },
  },
});

interface ReviewScenario {
  analysisFailed?: boolean;
  rereview?: boolean;
}

/** The step results of a review whose escalation was approved and whose handoff succeeded. */
const reviewSteps = ({
  analysisFailed = false,
  rereview = false,
}: ReviewScenario): Record<string, unknown> => ({
  escalation_gate: { output: { decision: 'approved', status: 'succeeded' } },
  open_investigation: rereview
    ? { error: { message: 'conflict' } }
    : { output: { conversation_id: INVESTIGATION_ID } },
  record_decision: { output: { approved: true, declined: false, expired: false } },
  resolve_analysis: { output: { verdict: analysisFailed ? 'failed' : 'true_positive' } },
  resolve_escalation: { output: { auto_approve: false, escalate: true } },
  resolve_investigation_id: { output: { investigation_id: INVESTIGATION_ID } },
  run_fp_tp_analysis: analysisFailed
    ? { error: { message: 'analysis failed' } }
    : { output: { verdict: 'true_positive' } },
});

/** A review whose escalation was approved and whose handoff succeeded. */
export const reviewContext = (scenario: ReviewScenario = {}): Record<string, unknown> => ({
  steps: reviewSteps(scenario),
});

/** The Attack Discovery Worker's workflows with report steps, and runs that exercise each report. */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      runnerContext({ batchesFailed: 1, batchesTotal: 3, generated: 2, persisted: 2 }),
      runnerContext({ batchesFailed: 0, batchesTotal: 0, generated: 0, persisted: 0 }),
    ],
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    workflowId: ALERTZERO_ATTACK_DISCOVERY_WORKER_WORKFLOW_ID,
  },
  {
    contexts: [
      {
        steps: {
          ...reviewSteps({}),
          close_investigation_false_positive: { output: CHANGED_STATUS },
        },
      },
      {
        steps: {
          ...reviewSteps({ rereview: true }),
          close_investigation_declined: { output: CHANGED_STATUS },
          record_decision: { output: { approved: false, declined: true, expired: false } },
        },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ATTACK_DISCOVERY_ID,
    workflowId: ALERTZERO_ATTACK_DISCOVERY_REVIEW_WORKFLOW_ID,
  },
];
