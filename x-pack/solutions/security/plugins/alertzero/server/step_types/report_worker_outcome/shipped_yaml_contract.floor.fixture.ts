/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
  ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID } from '@kbn/alertzero-common';
import type { WorkerWorkflowContract } from './shipped_yaml_contract.test_helpers';
import {
  CHANGED_STATUS,
  INVESTIGATION_ID,
  OPENED_INVESTIGATION,
} from './shipped_yaml_contract.test_helpers';

/**
 * The Alert Triage Worker's workflows with report steps, and runs where every report step's guard
 * passes, the way the engine would have them.
 */
export const SHIPPED_YAML_CONTRACTS: WorkerWorkflowContract[] = [
  {
    contexts: [
      {
        steps: {
          classify_alerts: {
            output: { false_positive_count: 3, inconclusive_count: 1, true_positive_count: 2 },
          },
          create_investigation: OPENED_INVESTIGATION,
        },
        variables: {
          alert_count: 6,
          fp_candidate_count: 3,
          review_dispatch: 'started',
          verdict_count: 6,
        },
      },
      {
        steps: {
          classify_alerts: {
            output: { false_positive_count: 0, inconclusive_count: 0, true_positive_count: 4 },
          },
          close_no_fp: { output: CHANGED_STATUS },
          create_investigation: OPENED_INVESTIGATION,
        },
        variables: { alert_count: 5, fp_candidate_count: 0, verdict_count: 4 },
      },
      {
        steps: { create_investigation: OPENED_INVESTIGATION },
        variables: { alert_count: 3, fp_candidate_count: 0, verdict_count: 0 },
      },
    ],
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    workflowId: ALERTZERO_FLOOR_ALERT_TRIAGE_BATCH_WORKFLOW_ID,
  },
  {
    contexts: ['approved', 'dismissed', 'expired', 'unknown'].map((outcome) => ({
      inputs: { autonomy: 'supervised', conversation_id: INVESTIGATION_ID },
      steps: {
        close_investigation_after_approval: { output: CHANGED_STATUS },
        close_investigation_after_dismissal: { output: CHANGED_STATUS },
        close_investigation_after_expiry: { output: CHANGED_STATUS },
        get_proposal: { output: {} },
      },
      variables: { failed_retag_count: 1, fp_candidate_count: 9, proposal_outcome: outcome },
    })),
    workerId: SYSTEM_SECURITY_WORKER_FLOOR_ALERT_TRIAGE_ID,
    workflowId: ALERTZERO_FLOOR_ALERT_TRIAGE_REVIEW_WORKFLOW_ID,
  },
];
